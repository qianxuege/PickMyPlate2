import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { BorderRadius, Colors, Typography } from "@/constants/theme";

import type { SmartTagCategory } from "@/lib/parseSmartPreferences";

const CATEGORY_EMOJI: Record<SmartTagCategory, string> = {
  allergy: "🚫",
  dislike: "❌",
  like: "❤️",
  preference: "⭐",
};

export type SmartPreferenceTagProps = {
  label: string;
  category: SmartTagCategory;
  onRemove: () => void;
  /** Newly committed tag — show check + brief highlight */
  showNewHighlight?: boolean;
};

function categoryStyles(category: SmartTagCategory) {
  switch (category) {
    case "allergy":
      return {
        bg: Colors.tagAllergenBg,
        text: Colors.tagAllergenText,
        border: "#FDBA74",
      };
    case "dislike":
      return {
        bg: Colors.tagDislikeBg,
        text: Colors.tagDislikeText,
        border: Colors.chipBorder,
      };
    case "like":
      return {
        bg: Colors.tagLikeBg,
        text: Colors.tagLikeText,
        border: "#FDBA74",
      };
    default:
      return {
        bg: Colors.tagPreferenceBg,
        text: Colors.tagPreferenceText,
        border: "#C7D2FE",
      };
  }
}

export function SmartPreferenceTag({
  label,
  category,
  onRemove,
  showNewHighlight = false,
}: SmartPreferenceTagProps) {
  const cs = categoryStyles(category);

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(16).stiffness(220)}
      exiting={FadeOut.duration(160)}
      style={[
        styles.wrap,
        {
          backgroundColor: cs.bg,
          borderColor: showNewHighlight ? Colors.primary : cs.border,
        },
        showNewHighlight && styles.wrapHighlight,
      ]}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>{CATEGORY_EMOJI[category]}</Text>
        <Text style={[styles.label, { color: cs.text }]} numberOfLines={2}>
          {label}
        </Text>
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={styles.removeBtn}
          accessibilityLabel="Remove tag"
        >
          <Text style={styles.removeX}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    maxWidth: "100%",
    alignSelf: "flex-start",
  },
  wrapHighlight: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 6,
  },
  emoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    ...Typography.caption,
    fontWeight: "500",
    flexShrink: 1,
    flexGrow: 1,
  },
  check: {
    marginRight: 2,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 2,
  },
  removeX: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
