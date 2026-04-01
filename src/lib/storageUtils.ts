import { supabase } from "@/integrations/supabase/client";

const QUEUE_BUCKET = "queue-images";
const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_DURATION = 3600; // 1 hour

/**
 * Upload an image to the private queue-images bucket.
 * Returns the storage path (NOT a public URL).
 */
export async function uploadQueueImage(blob: Blob, folderPrefix: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.png`;
  const path = `${folderPrefix}/${filename}`;

  const { error } = await supabase.storage.from(QUEUE_BUCKET).upload(path, blob);
  if (error) throw error;

  // Return just the path - no public URL since bucket is private
  return path;
}

/**
 * Get a signed URL for a queue image path.
 * Handles both old public URLs (fonts bucket) and new paths (queue-images bucket).
 * Caches signed URLs to avoid repeated calls.
 */
export async function getQueueImageUrl(imageRef: string): Promise<string> {
  // If it's a text_query placeholder, return as-is
  if (imageRef === "text_query") return imageRef;

  // If it's already a full public URL, return as-is
  if (imageRef.startsWith("http")) return imageRef;

  // Check cache
  const cached = SIGNED_URL_CACHE.get(imageRef);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // All images now live in queue-images bucket
  const { data, error } = await supabase.storage
    .from(QUEUE_BUCKET)
    .createSignedUrl(imageRef, SIGNED_URL_DURATION);

  if (error || !data?.signedUrl) {
    console.warn("Failed to get signed URL for:", imageRef, error);
    return imageRef;
  }

  SIGNED_URL_CACHE.set(imageRef, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_DURATION - 300) * 1000,
  });

  return data.signedUrl;
}

/**
 * Batch resolve signed URLs for multiple queue items.
 */
export async function resolveQueueImageUrls<T extends { user_uploaded_image: string }>(
  items: T[]
): Promise<T[]> {
  const resolved = await Promise.all(
    items.map(async (item) => {
      const url = await getQueueImageUrl(item.user_uploaded_image);
      return { ...item, _resolved_image_url: url };
    })
  );
  return resolved as T[];
}
