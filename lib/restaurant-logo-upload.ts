import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { RESTAURANT_DISH_IMAGES_BUCKET } from '@/lib/restaurant-dish-photo-upload';
import { supabase } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024;

/** Same bucket as dish photos; RLS allows `{auth.uid()}/*`. */
export function restaurantLogoStoragePath(userId: string): string {
  return `${userId}/restaurant-logo.jpg`;
}

async function uriToLogoJpeg(localUri: string): Promise<string> {
  try {
    const out = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
    );
    return out.uri;
  } catch {
    return localUri;
  }
}

export async function uploadRestaurantLogoFromUri(params: {
  localUri: string;
  userId: string;
}): Promise<{ publicUrl: string }> {
  const readUri = await uriToLogoJpeg(params.localUri);
  const path = restaurantLogoStoragePath(params.userId);

  const res = await fetch(readUri);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const { error: upErr } = await supabase.storage.from(RESTAURANT_DISH_IMAGES_BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) throw new Error(upErr.message);

  const { data } = supabase.storage.from(RESTAURANT_DISH_IMAGES_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

export type PickUploadRestaurantLogoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; cancelled: true }
  | { ok: false; error: string };

export async function pickAndUploadRestaurantLogo(
  source: 'camera' | 'library',
): Promise<PickUploadRestaurantLogoResult> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, error: 'Camera access is needed to take a photo.' };
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, error: 'Photo library access is needed to upload a logo.' };
    }
  }

  const picker =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });

  if (picker.canceled || !picker.assets?.[0]?.uri) {
    return { ok: false, cancelled: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: 'Not signed in.' };
  }

  try {
    const { publicUrl } = await uploadRestaurantLogoFromUri({
      localUri: picker.assets[0].uri,
      userId: user.id,
    });
    return { ok: true, publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
