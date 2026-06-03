'use server';

import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { listingFormSchema } from '@/schemas/listing';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createListing(formData: FormData) {
  const supabase = await createServerClient();

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  const rl = await checkRateLimit('listing', user.id);
  if (!rl.ok) return { error: 'Ai creat prea multe anunțuri într-un timp scurt. Încearcă mai târziu.' };

  // Validate form data
  const validatedData = listingFormSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    price: Number(formData.get('price')),
    category: formData.get('category'),
  });

  if (!validatedData.success) {
    return { 
      error: 'Date invalide',
      details: validatedData.error.flatten().fieldErrors,
    };
  }

  // Get images from formData
  const images = formData.getAll('images') as File[];

  if (images.length === 0) {
    return { error: 'Vă rugăm să încărcați cel puțin o imagine' };
  }
  // The client Dropzone caps at 5, but this action is a POST endpoint that can
  // be called directly — enforce the cap server-side too (storage-abuse guard).
  if (images.length > 5) {
    return { error: 'Poți încărca maximum 5 imagini.' };
  }

  // Whitelist real raster image types. The stored extension is derived from
  // this map (NOT the client filename), and svg+xml/html are rejected, so a
  // crafted upload can't be served as active content from the public bucket.
  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  // Upload images to storage
  const imageUrls: string[] = [];

  for (const image of images) {
    if (image.size > 5 * 1024 * 1024) { // 5MB limit
      return { error: `Fișierul ${image.name} este prea mare (max 5MB)` };
    }

    const ext = ALLOWED_IMAGE_TYPES[image.type];
    if (!ext) {
      return { error: `Format invalid pentru ${image.name}. Acceptăm JPG, PNG, WEBP sau GIF.` };
    }

    const imageId = crypto.randomUUID();
    const imagePath = `listings/${user.id}/${imageId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('listings_images')
      .upload(imagePath, image, {
        cacheControl: '3600',
        upsert: false,
        contentType: image.type,
      });

    if (uploadError) {
      return { error: `Eroare la încărcarea imaginii: ${uploadError.message}` };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('listings_images')
      .getPublicUrl(imagePath);

    imageUrls.push(publicUrl);
  }

  // Create listing in database
  const { error: listingError } = await supabase
    .from('listings')
    .insert({
      title: validatedData.data.title,
      description: validatedData.data.description,
      price: validatedData.data.price,
      category: validatedData.data.category,
      image_urls: imageUrls,
      seller_id: user.id,
      status: 'active',
    });

  if (listingError) {
    return { error: `Eroare la crearea anunțului: ${listingError.message}` };
  }

  revalidatePath('/');
  redirect('/');
}

export async function deleteListing(listingId: string) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  // Get listing to verify ownership (and grab the images in the same query)
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id, image_urls')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    return { error: 'Anunțul nu a fost găsit' };
  }

  if (listing.seller_id !== user.id) {
    return { error: 'Nu aveți permisiunea să ștergeți acest anunț' };
  }

  // Delete images from storage. image_urls stores full public URLs of the form
  // `.../object/public/listings_images/listings/<userId>/<file>`, so the
  // bucket-relative key is everything after the bucket segment.
  const bucketMarker = '/listings_images/';
  const urls: string[] = listing.image_urls ?? [];
  const imagePaths = urls
    .map((url) => {
      const idx = url.indexOf(bucketMarker);
      return idx !== -1 ? url.slice(idx + bucketMarker.length) : null;
    })
    .filter((path): path is string => path !== null);

  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('listings_images')
      .remove(imagePaths);

    if (storageError) {
      console.error('Error deleting images:', storageError);
    }
  }

  // Delete listing
  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (deleteError) {
    return { error: `Eroare la ștergerea anunțului: ${deleteError.message}` };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateListingStatus(listingId: string, status: 'active' | 'sold') {
  const supabase = await createServerClient();

  // TypeScript unions are erased at runtime and this is a POST endpoint —
  // validate the value (the DB CHECK is the last line of defense, not the only).
  if (status !== 'active' && status !== 'sold') {
    return { error: 'Status invalid' };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  // Get listing to verify ownership
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    return { error: 'Anunțul nu a fost găsit' };
  }

  if (listing.seller_id !== user.id) {
    return { error: 'Nu aveți permisiunea să modificați acest anunț' };
  }

  const { error: updateError } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId);

  if (updateError) {
    return { error: `Eroare la actualizarea anunțului: ${updateError.message}` };
  }

  revalidatePath('/');
  return { success: true };
}