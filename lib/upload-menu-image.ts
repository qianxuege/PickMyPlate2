import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export const MENU_UPLOAD_BUCKET = 'menu-uploads';

const MAX_BYTES = 20 * 1024 * 1024;

export class MenuUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuUploadError';
  }
}

/**
 * Re-encode to JPEG so Storage + Google Vision receive real JPEG bytes.
 * iOS Photos often use HEIC while the picker URI looks like .jpg — Vision rejects that as "Bad image data".
 */
async function uriToJpegForUpload(localUri: string): Promise<string> {
  try {
    const out = await ImageManipulator.manipulateAsync(localUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return out.uri;
  } catch {
    return localUri;
  }
}

/**
 * Upload a local image URI to `menu-uploads/{userId}/{uuid}.jpg`.
 * Enforces 20 MB max (aligned with Vision / bucket limit).
 */
export async function uploadMenuImageFromUri(params: {
  localUri: string;
  fileSizeBytes: number;
  userId: string;
}): Promise<{ bucket: string; path: string }> {
  if (params.fileSizeBytes > MAX_BYTES) {
    throw new MenuUploadError('Image must be 20 MB or smaller.');
  }

  const readUri = await uriToJpegForUpload(params.localUri);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}.jpg`;
  const path = `${params.userId}/${fileName}`;

  const res = await fetch(readUri);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new MenuUploadError('Image must be 20 MB or smaller.');
  }

  const { error } = await supabase.storage.from(MENU_UPLOAD_BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new MenuUploadError(error.message);
  }

  return { bucket: MENU_UPLOAD_BUCKET, path };
}
