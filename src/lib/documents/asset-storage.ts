/**
 * Client-side helpers for the "business-assets" Supabase Storage bucket
 * (supabase/migrations/20260823090000_business_assets_storage.sql). Private
 * bucket, RLS restricts each user to their own `{uid}/...` folder — same
 * pattern as lib/expenses/receipt-storage.ts, generalized for the two
 * document-branding slots (logo, signature) instead of one.
 *
 * UNLIKE receipts: this bucket DOES grant a delete policy (see the migration)
 * — uploadBusinessAsset removes the previous object for the same slot before
 * uploading the new one, so replacing a logo doesn't accumulate orphans.
 */

import { createClient } from "@/lib/supabase/client";

const BUCKET = "business-assets";

export type BusinessAssetSlot = "logo" | "signature";

function extensionFor(mediaType: string): string {
  if (mediaType.includes("png")) return "png";
  if (mediaType.includes("webp")) return "webp";
  if (mediaType.includes("svg")) return "svg";
  return "jpg";
}

/**
 * Upload a logo/signature image for the current user, replacing any previous
 * object stored for the same slot (best-effort — a failed delete of the old
 * object never blocks the new upload). Returns the Storage object path (to
 * store on persona.business.logoPath/signaturePath), or null if there's no
 * authenticated session or the upload failed.
 */
export async function uploadBusinessAsset(
  slot: BusinessAssetSlot,
  file: File | Blob,
  mediaType: string,
  previousPath?: string | null,
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (previousPath) {
    const oldRelative = previousPath.startsWith(`${BUCKET}/`)
      ? previousPath.slice(BUCKET.length + 1)
      : previousPath;
    await supabase.storage.from(BUCKET).remove([oldRelative]);
  }

  const path = `${user.id}/${slot}-${Date.now()}.${extensionFor(mediaType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mediaType,
    upsert: false,
  });
  if (error) return null;
  return `${BUCKET}/${path}`;
}

/** Signed URL for displaying a private logo/signature image (short-lived). */
export async function getBusinessAssetSignedUrl(assetPath: string): Promise<string | null> {
  const supabase = createClient();
  const path = assetPath.startsWith(`${BUCKET}/`) ? assetPath.slice(BUCKET.length + 1) : assetPath;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Removes a stored logo/signature object outright (the "remove" action in
 *  the settings UI, not a replace — replace goes through uploadBusinessAsset). */
export async function deleteBusinessAsset(assetPath: string): Promise<boolean> {
  const supabase = createClient();
  const path = assetPath.startsWith(`${BUCKET}/`) ? assetPath.slice(BUCKET.length + 1) : assetPath;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}
