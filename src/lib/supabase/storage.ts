// ============================================================
// RenoVision — Supabase Storage Helpers
// Buckets: 'photos' (images), 'documents' (PDFs, contracts)
// ============================================================

import { createServerClient } from './server';

export type StorageBucket = 'photos' | 'documents';

/**
 * Upload a file to Supabase Storage and return its public URL.
 * The path should include any subfolder structure, e.g. "kitchen/photo1.jpg"
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob
): Promise<string> {
  const supabase = createServerClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return getPublicUrl(bucket, path);
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Get the public URL for a file in Supabase Storage.
 */
export function getPublicUrl(
  bucket: StorageBucket,
  path: string
): string {
  const supabase = createServerClient();

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
