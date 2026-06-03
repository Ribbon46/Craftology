# Craftology - Technical Handoff for Claude Code

## Repository State at Checkpoint

### Project Structure
```
i:\craftology
├── .env.local                 # Environment variables (DO NOT COMMIT)
├── CHANGELOG.md              # Timestamped append-only ledger
├── CLAUDE.md                 # Project documentation
├── HANDOFF.md                # This file
├── supabase/
│   └── schema.sql            # PostgreSQL database schema with RLS
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── next.config.mjs           # Next.js configuration
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with QueryClientProvider
│   │   ├── page.tsx          # Home page (Vinted-style feed)
│   │   ├── search/page.tsx   # Search page with filters
│   │   ├── sell/page.tsx     # Product listing form with dropzone
│   │   ├── messages/page.tsx # Chat interface (WhatsApp-style)
│   │   ├── profile/page.tsx  # User profile with tabs
│   │   └── listings/[id]/page.tsx  # Product detail with carousel
│   ├── actions/
│   │   ├── listings.ts       # Server actions for listings
│   │   └── messages.ts       # Server actions for messages
│   ├── config/
│   │   └── app.ts            # Application configuration (Romanian)
│   ├── lib/
│   │   ├── hooks.ts          # Custom hooks (useSession)
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client (mock fallback)
│   │       ├── server.ts     # Server-side Supabase
│   │       └── types.ts      # Database types
│   ├── schemas/
│   │   └── listing.ts        # Zod validation schemas
│   └── components/
│       ├── ui/               # shadcn/ui components
│       │   ├── button.tsx
│       │   ├── dialog.tsx
│       │   ├── input.tsx
│       │   ├── textarea.tsx
│       │   ├── dropdown-menu.tsx
│       │   ├── card.tsx
│       │   ├── tabs.tsx
│       │   ├── badge.tsx
│       │   ├── avatar.tsx
│       │   └── Dropzone.tsx  # Image upload component
│       ├── navigation/
│       │   ├── TopNav.tsx    # Category filter chips
│       │   └── BottomNav.tsx # Bottom navigation bar
│       └── auth/
│           └── AuthModal.tsx # Login/register modal
└── public/                   # Static assets
```

### Key Technical Decisions
1. **Next.js 16 App Router** - Server/Client components with App Router
2. **Mobile-first container** - `max-w-md mx-auto` for phone-sized preview
3. **Romanian language** - All UI text in Romanian (no i18n library)
4. **Mock data fallback** - App works without Supabase configured
5. **React Query** - Infinite scroll with `useInfiniteQuery`
6. **shadcn/ui** - Nova preset (Lucide/Geist icons)

### Running the Project
```bash
npm run dev    # Start development server
npm run build  # Build for production
```

## Environment Variables (.env.local)

```env
# Supabase Configuration (REQUIRED for production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_NAME="Craftology"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

### Tables (supabase/schema.sql)
1. **profiles** - User profiles (linked to auth.users)
2. **listings** - Product listings with image arrays
3. **conversations** - Chat threads between buyer/seller
4. **messages** - Individual messages in conversations

### Row Level Security (RLS)
- `profiles`: Readable by everyone
- `listings`: Owner can insert/update (`auth.uid() = seller_id`)
- `messages`: Only participants can read

## Next Steps

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key to `.env.local`
3. Run the schema migration in the SQL editor
4. Create storage bucket: `listings_images`

### 2. Configuration Updates
1. Update `src/config/app.ts` branding:
   ```ts
   export const APP_BRAND = "Craftology by Deco Kubik";
   ```

### 3. Storage Bucket Setup
In Supabase Storage:
1. Create bucket `listings_images`
2. Make public for image access
3. Set up storage policies for RLS

### 4. Server Action Implementation
Update `src/actions/listings.ts` and `src/actions/messages.ts`:
- Replace mock data with actual Supabase calls
- Implement image upload to storage bucket
- Handle authentication via `@supabase/ssr`

### 5. Deployment
```bash
npm run build
# Deploy to Vercel or your hosting provider
```

##Claude Code Instructions
- All file paths are relative to `i:\craftology`
- No nested project structures - root files in `i:\craftology`
- All UI text must remain in Romanian
- Update `CHANGELOG.md` for any additions (append-only)
- Update `CLAUDE.md` for architecture changes (keep under 150 lines)