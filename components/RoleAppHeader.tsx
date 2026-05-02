import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  dinerRoleTheme,
  getRoleTheme,
  restaurantRoleTheme,
  type RoleTheme,
} from "@/constants/role-theme";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useRoleSwitchToast } from "@/contexts/RoleSwitchToastContext";
import type { AppRole } from "@/lib/app-role";

type RoleAppHeaderProps = {
  /** Which shell this screen belongs to */
  mode: AppRole;
};

export function RoleAppHeader({ mode }: RoleAppHeaderProps) {
  const router = useRouter();
  const { roles, setActiveRole } = useActiveRole();
  const { showRoleSwitchToast } = useRoleSwitchToast();

  const dual = roles.includes("diner") && roles.includes("restaurant");
  const theme = getRoleTheme(mode);

  const onSwitch = async (target: AppRole) => {
    if (target === mode) return;
    await setActiveRole(target);
    if (target === "diner") {
      router.replace("/diner-home");
      showRoleSwitchToast("Switched to Diner mode");
    } else {
      router.replace("/restaurant-home");
      showRoleSwitchToast("Switched to Restaurant mode");
    }
  };

  return (
    <View style={styles.topRow}>
      <ModeBadge mode={mode} theme={theme} />
      {dual && (
        <SegmentedRoleSwitch
          active={mode}
          onSelect={onSwitch}
          dinerTheme={dinerRoleTheme}
          restaurantTheme={restaurantRoleTheme}
        />
      )}
    </View>
  );
}

function ModeBadge({ mode, theme }: { mode: AppRole; theme: RoleTheme }) {
  const isDiner = mode === "diner";
  return (
    <View
      style={[
        styles.badge,
        isDiner
          ? {
              backgroundColor: theme.badgeOutlineBg,
              borderWidth: 1.5,
              borderColor: theme.badgeOutlineBorder,
            }
          : {
              backgroundColor: theme.badgeFilledBg,
              borderWidth: 0,
            },
      ]}
    >
      <Text style={[styles.badgeEmoji]}>{isDiner ? "🍴" : "🍽️"}</Text>
      <Text
        style={[
          styles.badgeLabel,
          isDiner
            ? { color: theme.badgeOutlineText }
            : { color: theme.badgeFilledText },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {isDiner ? "Diner mode" : "Restaurant mode"}
      </Text>
    </View>
  );
}

function SegmentedRoleSwitch({
  active,
  onSelect,
  dinerTheme,
  restaurantTheme,
}: {
  active: AppRole;
  onSelect: (role: AppRole) => void;
  dinerTheme: RoleTheme;
  restaurantTheme: RoleTheme;
}) {
  return (
    <View style={styles.segmentTrack}>
      <Pressable
        onPress={() => onSelect("diner")}
        style={({ pressed }) => [
          styles.segmentCell,
          active === "diner" && { backgroundColor: dinerTheme.primary },
          pressed && styles.segmentPressed,
        ]}
      >
        <Text
          style={[
            styles.segmentLabel,
            {
              color:
                active === "diner" ? "#FFFFFF" : dinerTheme.segmentInactiveText,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          Diner
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSelect("restaurant")}
        style={({ pressed }) => [
          styles.segmentCell,
          active === "restaurant" && {
            backgroundColor: restaurantTheme.primary,
          },
          pressed && styles.segmentPressed,
        ]}
      >
        <Text
          style={[
            styles.segmentLabel,
            {
              color:
                active === "restaurant"
                  ? "#FFFFFF"
                  : restaurantTheme.segmentInactiveText,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          Restaurant
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "46%",
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLabel: {
    ...Typography.captionMedium,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "capitalize",
  },
  segmentTrack: {
    flex: 1,
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    backgroundColor: "#F2F4F7",
    padding: 3,
    gap: 2,
    minWidth: 0,
    minHeight: 38,
  },
  segmentCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentPressed: {
    opacity: 0.88,
  },
  segmentLabel: {
    ...Typography.small,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
});
