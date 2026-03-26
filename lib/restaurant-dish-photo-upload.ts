import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export const RESTAURANT_DISH_IMAGES_BUCKET = 'dish-images';

const MAX_BYTES = 5 * 1024 * 1024;

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

/** Storage path: `{userId}/restaurant-dishes/{dishId}.jpg` — must match RLS first segment = auth uid. */
export function restaurantDishImageStoragePath(userId: string, dishId: string): string {
  return `${userId}/restaurant-dishes/${dishId}.jpg`;
}

/**
 * Upload a picked/captured image to `dish-images` and persist `image_url` on `restaurant_menu_dishes`.
 */
export async function uploadRestaurantDishPhotoFromUri(params: {
  localUri: string;
  dishId: string;
  userId: string;
}): Promise<{ publicUrl: string }> {
  const readUri = await uriToJpegForUpload(params.localUri);
  const path = restaurantDishImageStoragePath(params.userId, params.dishId);

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
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await supabase
    .from('restaurant_menu_dishes')
    .update({ image_url: publicUrl })
    .eq('id', params.dishId);
  if (dbErr) throw new Error(dbErr.message);

  return { publicUrl };
}

export type PickUploadRestaurantDishPhotoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; cancelled: true }
  | { ok: false; error: string };

/**
 * Opens the photo library, uploads JPEG to `dish-images` under the current user, updates `restaurant_menu_dishes.image_url`.
 */
export async function pickAndUploadRestaurantDishPhoto(dishId: string): Promise<PickUploadRestaurantDishPhotoResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, error: 'Photo library access is needed to upload a dish photo.' };
  }

  const picker = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
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
    const { publicUrl } = await uploadRestaurantDishPhotoFromUri({
      localUri: picker.assets[0].uri,
      dishId,
      userId: user.id,
    });
    return { ok: true, publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
