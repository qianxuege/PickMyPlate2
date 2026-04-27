import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { InputField, PrimaryButton, RestaurantTabScreenLayout, SecondaryButton } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import { pickAndUploadRestaurantLogo } from '@/lib/restaurant-logo-upload';
import {
  fetchRestaurantProfile,
  updateRestaurantLogoUrl,
  upsertRestaurantProfileFromForm,
  type RestaurantProfileUpdate,
} from '@/lib/restaurant-profile';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const t = restaurantRoleTheme;
const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'] as const;

function emptyForm(): RestaurantProfileUpdate {
  return {
    name: '',
    specialty: '',
    address: '',
    phone: '',
    hours_text: '',
    website: '',
    price_range: '',
    logo_url: null,
  };
}

function snapshotToForm(
  snap: Awaited<ReturnType<typeof fetchRestaurantProfile>>
): RestaurantProfileUpdate {
  if (!snap) return emptyForm();
  const { restaurant, cuisineLabels } = snap;
  return {
    name: restaurant.name,
    specialty: cuisineLabels || restaurant.specialty || '',
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    hours_text: restaurant.hours_text || '',
    website: restaurant.website || '',
    price_range: restaurant.price_range || '',
    logo_url: restaurant.logo_url,
  };
}

export default function RestaurantProfileScreen() {
  const router = useRouter();
  useGuardActiveRole('restaurant');
  const { session, signOut } = useActiveRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cuisineDisplay, setCuisineDisplay] = useState('');
  const [form, setForm] = useState<RestaurantProfileUpdate>(emptyForm());
  const [savedForm, setSavedForm] = useState<RestaurantProfileUpdate>(emptyForm());
  const [uploadLogoLoading, setUploadLogoLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await fetchRestaurantProfile();
      const next = snapshotToForm(snap);
      setForm(next);
      setSavedForm(next);
      setCuisineDisplay(snap?.cuisineLabels || snap?.restaurant.specialty || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const email = session?.user?.email ?? '—';

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const onEdit = () => {
    setForm(savedForm);
    setIsEditing(true);
  };

  const onCancel = () => {
    setForm(savedForm);
    setIsEditing(false);
  };

  const onSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Restaurant name', 'Enter a restaurant name.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await upsertRestaurantProfileFromForm(form);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      await load();
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const runLogoUpload = async (source: 'camera' | 'library') => {
    setUploadLogoLoading(true);
    try {
      const result = await pickAndUploadRestaurantLogo(source);
      if (!result.ok) {
        if ('cancelled' in result && result.cancelled) return;
        Alert.alert('Upload failed', 'error' in result ? result.error : 'Something went wrong.');
        return;
      }
      const { error } = await updateRestaurantLogoUrl(result.publicUrl);
      if (error) {
        Alert.alert('Could not save logo', error.message);
        return;
      }
      await load();
    } finally {
      setUploadLogoLoading(false);
    }
  };

  const onUploadLogo = () => {
    if (uploadLogoLoading) return;
    Alert.alert('Upload logo', 'Choose how to add your restaurant logo.', [
      { text: 'Photo library', onPress: () => void runLogoUpload('library') },
      { text: 'Take photo', onPress: () => void runLogoUpload('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onRemoveLogo = () => {
    if (uploadLogoLoading || !form.logo_url) return;
    Alert.alert('Remove logo?', 'You can upload a new logo anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadLogoLoading(true);
          try {
            const { error } = await updateRestaurantLogoUrl(null);
            if (error) {
              Alert.alert('Could not remove logo', error.message);
              return;
            }
            await load();
          } finally {
            setUploadLogoLoading(false);
          }
        },
      },
    ]);
  };

  const setField = <K extends keyof RestaurantProfileUpdate>(key: K, value: RestaurantProfileUpdate[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <RestaurantTabScreenLayout activeTab="profile">
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </RestaurantTabScreenLayout>
    );
  }

  return (
    <RestaurantTabScreenLayout
      activeTab="profile"
      stickyFooter={
        isEditing ? (
          <PrimaryButton
            text="Save Changes"
            onPress={onSave}
            loading={saving}
            disabled={saving}
            accentColor={t.primary}
            accentShadowRgb={t.shadowRgb}
          />
        ) : undefined
      }
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Profile</Text>
        {!isEditing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={onEdit}
            hitSlop={12}
            style={({ pressed }) => [pressed && styles.editPressed]}
          >
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            onPress={onCancel}
            hitSlop={12}
            style={({ pressed }) => [pressed && styles.editPressed]}
          >
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.lead}>Your venue on PickMyPlate</Text>

      {!isEditing ? (
        <View>
          <View style={[styles.heroCard, { borderColor: t.cardAccentBorder }]}>
            <LogoPreview uri={form.logo_url} accent={t.primary} primaryLight={t.primaryLight} name={form.name} />
            <View style={styles.heroText}>
              <Text style={styles.venueName} numberOfLines={2} ellipsizeMode="tail">
                {form.name.trim() || 'Your restaurant'}
              </Text>
              <Text style={styles.venueMeta}>
                {cuisineDisplay || form.specialty || '—'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Venue details</Text>
          <View style={[styles.formCard, { borderColor: t.cardAccentBorder }]}>
            <ReadBlock label="Restaurant name" value={form.name || '—'} />
            <ReadBlock label="Cuisine" value={cuisineDisplay || form.specialty || '—'} />
            <ReadBlock label="Price range" value={form.price_range || '—'} />
            <ReadBlock label="Address" value={form.address || '—'} />
            <ReadBlock label="Phone" value={form.phone || '—'} />
            <ReadBlock label="Hours" value={form.hours_text || '—'} />
            <ReadBlock label="Website" value={form.website || '—'} last />
          </View>

          <Text style={[styles.sectionTitle, styles.accountTitle]}>Account</Text>
          <View style={[styles.formCard, { borderColor: t.cardAccentBorder }]}>
            <ReadBlock label="Email" value={email} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change password"
              onPress={() => router.push('/forgot-password')}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
            >
              <Text style={styles.linkRowText}>Change password</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={t.primary} />
            </Pressable>
          </View>

          <PrimaryButton
            text="Log Out"
            onPress={onLogout}
            style={styles.logout}
            accentColor={t.primary}
            accentShadowRgb={t.shadowRgb}
          />
        </View>
      ) : (
        <View>
          <Text style={styles.sectionTitle}>Logo & cover</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload restaurant logo"
            onPress={onUploadLogo}
            disabled={uploadLogoLoading}
            style={({ pressed }) => [
              styles.uploadCard,
              { borderColor: t.cardAccentBorder, backgroundColor: t.primaryLight },
              (pressed || uploadLogoLoading) && styles.uploadCardPressed,
            ]}
          >
            {uploadLogoLoading ? (
              <View style={styles.uploadInner}>
                <ActivityIndicator size="large" color={t.primary} />
                <Text style={styles.uploadHint}>Uploading…</Text>
              </View>
            ) : form.logo_url ? (
              <Image
                source={{ uri: form.logo_url }}
                style={styles.uploadImage}
                contentFit="cover"
                accessibilityLabel={form.name ? `${form.name} logo` : 'Restaurant logo'}
              />
            ) : (
              <View style={styles.uploadInner}>
                <MaterialCommunityIcons name="image-plus-outline" size={36} color={t.primary} />
                <Text style={[styles.uploadTitle, { color: t.primaryDark }]}>Upload logo</Text>
                <Text style={styles.uploadHint}>Tap to choose a photo or take one with the camera</Text>
              </View>
            )}
          </Pressable>
          {form.logo_url && !uploadLogoLoading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove restaurant logo"
              onPress={onRemoveLogo}
              style={({ pressed }) => [styles.removeLogoBtn, pressed && styles.removeLogoBtnPressed]}
            >
              <Text style={styles.removeLogoText}>Remove logo</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Restaurant details</Text>
          <InputField
            label="Restaurant name"
            value={form.name}
            onChangeText={(v) => setField('name', clampDisplayName(v))}
            placeholder="Your restaurant name"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            containerStyle={styles.fieldGap}
          />
          <InputField
            label="Cuisine type"
            value={form.specialty}
            onChangeText={(v) => setField('specialty', v)}
            placeholder="e.g. Japanese · Ramen"
            containerStyle={styles.fieldGap}
          />

          <Text style={styles.subLabel}>Price range</Text>
          <View style={styles.priceRow}>
            {PRICE_OPTIONS.map((p) => {
              const active = form.price_range === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={active ? `${p}, selected` : p}
                  onPress={() => setField('price_range', active ? '' : p)}
                  style={[
                    styles.pricePill,
                    { borderColor: t.cardAccentBorder },
                    active && { backgroundColor: t.primary, borderColor: t.primary },
                  ]}
                >
                  <Text style={[styles.pricePillText, active && { color: Colors.white }]}>{p}</Text>
                </Pressable>
              );
            })}
          </View>

          <InputField
            label="Address"
            value={form.address}
            onChangeText={(v) => setField('address', v)}
            placeholder="Street, city"
            containerStyle={styles.fieldGap}
          />
          <InputField
            label="Phone"
            value={form.phone}
            onChangeText={(v) => setField('phone', v)}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            containerStyle={styles.fieldGap}
          />
          <InputField
            label="Hours of operation"
            value={form.hours_text}
            onChangeText={(v) => setField('hours_text', v)}
            placeholder="Mon–Fri 11am – 10pm"
            multiline
            containerStyle={styles.fieldGap}
          />
          <InputField
            label="Website"
            value={form.website}
            onChangeText={(v) => setField('website', v)}
            placeholder="https://"
            autoCapitalize="none"
            keyboardType="url"
            containerStyle={styles.fieldGap}
          />

          <Text style={[styles.sectionTitle, styles.accountTitle]}>Account</Text>
          <View style={[styles.readOnlyEmail, { borderColor: t.cardAccentBorder }]}>
            <Text style={styles.readOnlyLabel}>Email</Text>
            <Text style={styles.readOnlyValue} numberOfLines={2} ellipsizeMode="middle">
              {email}
            </Text>
          </View>
          <SecondaryButton
            text="Change password"
            onPress={() => router.push('/forgot-password')}
            style={styles.fieldGap}
          />
        </View>
      )}
    </RestaurantTabScreenLayout>
  );
}

function ReadBlock({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.readBlock}>
        <Text style={styles.readLabel}>{label}</Text>
        <Text style={styles.readValue} numberOfLines={4} ellipsizeMode="tail">
          {value}
        </Text>
      </View>
      {!last ? <View style={styles.readDivider} /> : null}
    </>
  );
}

function LogoPreview({
  uri,
  accent,
  primaryLight,
  name,
}: {
  uri: string | null;
  accent: string;
  primaryLight: string;
  name: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={styles.heroLogo}
        contentFit="cover"
        accessibilityLabel={name ? `${name} logo` : 'Restaurant logo'}
      />
    );
  }
  return (
    <View style={[styles.heroLogoPlaceholder, { backgroundColor: primaryLight }]}>
      <MaterialCommunityIcons name="storefront-outline" size={32} color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.heading,
    color: Colors.text,
  },
  editLink: {
    ...Typography.bodyMedium,
    color: t.primary,
    fontWeight: '700',
  },
  cancelLink: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  editPressed: {
    opacity: 0.75,
  },
  lead: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  accountTitle: {
    marginTop: Spacing.xxl,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.base,
  },
  heroLogoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  venueName: {
    ...Typography.bodyMedium,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  venueMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    marginBottom: Spacing.base,
  },
  readBlock: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  readLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  readValue: {
    ...Typography.bodyMedium,
    color: Colors.text,
    minWidth: 0,
  },
  readDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  linkRowPressed: {
    opacity: 0.85,
  },
  linkRowText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  logout: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  uploadCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    minHeight: 140,
  },
  uploadInner: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  uploadImage: {
    width: '100%',
    minHeight: 140,
  },
  uploadCardPressed: {
    opacity: 0.92,
  },
  removeLogoBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  removeLogoBtnPressed: {
    opacity: 0.75,
  },
  removeLogoText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  uploadTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  uploadHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fieldGap: {
    marginBottom: Spacing.base,
  },
  subLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pricePill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: Colors.white,
  },
  pricePillText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  readOnlyEmail: {
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.white,
  },
  readOnlyLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  readOnlyValue: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
});
