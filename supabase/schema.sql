-- Craftology Database Schema
-- PostgreSQL schema for mobile-first P2P marketplace
-- Run this in the Supabase SQL editor (it has rights on the auth/storage schemas).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- Tables
-- =====================================================================

-- Profiles table
-- profiles.id IS the auth.users id (1:1). This is the canonical Supabase
-- pattern: it lets every RLS policy compare auth.uid() directly against
-- seller_id / buyer_id / sender_id without an extra join. (A previous
-- revision used a separate user_id column, which silently broke every
-- insert + RLS check because auth.uid() never equalled the generated id.)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  seller_id UUID REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings (id) ON DELETE CASCADE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations (id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- New-user trigger
-- Auto-create a profiles row for every auth.users signup so that
-- listings.seller_id / conversations / messages foreign keys resolve.
-- Runs as SECURITY DEFINER to bypass RLS on the initial insert.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    -- Guaranteed-unique, NOT NULL username (short id suffix avoids
    -- collisions). The user can rename it later via the profile screen.
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1), 'user')
      || '_' || substr(md5(NEW.id::text), 1, 4),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================

-- Profiles: world-readable (sellers are shown to anonymous browsers);
-- a user may only create/edit their own row.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Column-scope the update: a user may edit their own username/full_name/avatar,
-- but NOT `rating` (a public trust signal) — that stays server/service-role
-- controlled so a seller can't self-inflate their score.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (username, full_name, avatar_url) ON profiles TO authenticated;

-- Listings: world-readable (public browsing, no login required);
-- only the owner may insert / update / delete.
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings are readable by everyone"
  ON listings
  FOR SELECT
  USING (true);

CREATE POLICY "Listings are insertable by owner"
  ON listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Listings are updatable by owner"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Listings are deletable by owner"
  ON listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Conversations: only the two participants can see / create them.
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversations are readable by participants"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- The caller must be the BUYER, can't converse with themselves, and the named
-- seller must actually own the listing. createConversation derives both ids
-- server-side; this is the matching defense-in-depth at the DB layer (a bare
-- "is one of the two participants" check let a user forge a thread naming a
-- victim as the other party).
CREATE POLICY "Conversations are insertable by buyer"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND buyer_id <> seller_id
    AND EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = conversations.listing_id
        AND l.seller_id = conversations.seller_id
    )
  );

-- Messages: readable / writable only by conversation participants.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are readable by participants"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "Messages are insertable by sender"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- Participants may UPDATE messages in their conversations, but the column grant
-- below limits that to the `read` flag — so read receipts work (the table had
-- RLS on with no UPDATE policy, which silently no-op'd markMessagesAsRead in
-- production) without letting anyone tamper with another user's message text.
CREATE POLICY "Messages are updatable by participants"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
REVOKE UPDATE ON messages FROM authenticated;
GRANT UPDATE (read) ON messages TO authenticated;

-- =====================================================================
-- Storage: listings_images bucket + policies
-- Object paths follow `listings/<auth.uid()>/<uuid>.<ext>`
-- (see createListing in src/actions/listings.ts).
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings_images', 'listings_images', true)
ON CONFLICT (id) DO NOTHING;

-- storage.objects is a persistent system table, so guard the policies to keep
-- this section re-runnable.
DROP POLICY IF EXISTS "Listing images are publicly readable" ON storage.objects;
CREATE POLICY "Listing images are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listings_images');

DROP POLICY IF EXISTS "Users can upload their own listing images" ON storage.objects;
CREATE POLICY "Users can upload their own listing images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listings_images'
    AND (storage.foldername(name))[1] = 'listings'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
CREATE POLICY "Users can update their own listing images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listings_images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;
CREATE POLICY "Users can delete their own listing images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listings_images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- =====================================================================
-- Phase 2: verified-seller marketplace — `sellers`
-- A row here IS the seller application; `status` tracks it (pending →
-- approved/rejected/suspended). id = profiles.id = auth.uid(). Sellers must be a
-- persoană juridică (company_name + cui) and must have accepted the Terms.
-- status / stripe_account_id / review fields are server/admin-controlled (set via
-- the service-role key); users can only apply + edit their own contact details.
-- =====================================================================
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  company_name TEXT NOT NULL,
  cui TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_other TEXT,
  workshop_description TEXT,
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sellers_status_idx ON sellers (status);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers approved-public or own" ON sellers;
CREATE POLICY "Sellers approved-public or own" ON sellers
  FOR SELECT USING (status = 'approved' OR auth.uid() = id);

DROP POLICY IF EXISTS "Apply as self pending" ON sellers;
CREATE POLICY "Apply as self pending" ON sellers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND status = 'pending');

DROP POLICY IF EXISTS "Edit own seller row" ON sellers;
CREATE POLICY "Edit own seller row" ON sellers
  FOR UPDATE TO authenticated USING (auth.uid() = id);

REVOKE ALL ON sellers FROM anon, authenticated;
GRANT SELECT (id, status, company_name, contact_email, contact_phone, contact_other, workshop_description, created_at) ON sellers TO anon;
GRANT SELECT (id, status, company_name, cui, contact_email, contact_phone, contact_other, workshop_description, stripe_onboarded, reviewed_at, rejection_reason, created_at) ON sellers TO authenticated;
GRANT INSERT (id, company_name, cui, contact_email, contact_phone, contact_other, workshop_description, terms_accepted_at) ON sellers TO authenticated;
GRANT UPDATE (company_name, cui, contact_email, contact_phone, contact_other, workshop_description) ON sellers TO authenticated;
