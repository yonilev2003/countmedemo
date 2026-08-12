/**
 * Client-side helpers for the "receipts" Supabase Storage bucket
 * (supabase/migrations/20260812130000_receipts_storage.sql). Private bucket,
 * RLS restricts each user to their own `{uid}/...` folder. The app never
 * deletes an uploaded receipt (7-year retention) — only the RLS-visible
 * insert/read/update policies exist, no delete policy for `authenticated`.
 */

import { createClient } from "@/lib/supabase/client";

const BUCKET = "receipts";

function extensionFor(mediaType: string): string {
  if (mediaType.includes("png")) return "png";
  if (mediaType.includes("webp")) return "webp";
  if (mediaType.includes("heic")) return "heic";
  return "jpg";
}

/**
 * Upload a receipt image for the current user. Returns the Storage object
 * path (to store on the ExpenseLine as `receiptPath`), or null if there's no
 * authenticated session (e.g. an anonymous /setup-only user) or the upload
 * failed — callers must save the expense either way, just without a
 * receiptPath, rather than blocking the whole save on a Storage error.
 */
export async function uploadReceiptImage(
  file: File | Blob,
  mediaType: string,
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(mediaType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mediaType,
    upsert: false,
  });
  if (error) return null;
  return `${BUCKET}/${path}`;
}

/** Signed URL for displaying a private receipt image (short-lived). */
export async function getReceiptSignedUrl(receiptPath: string): Promise<string | null> {
  const supabase = createClient();
  const path = receiptPath.startsWith(`${BUCKET}/`) ? receiptPath.slice(BUCKET.length + 1) : receiptPath;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}
