import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { DinerBottomNav, ScreenContainer } from "@/components";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";

export default function DinerHomeScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <Text style={styles.title}>Scan a menu</Text>
        <Text style={styles.subtitle}>
          Snap or upload to get personalized recommendations
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="camera-outline"
                size={22}
                color={Colors.white}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Scan Menu</Text>
              <Text style={styles.rowSubtitle}>Use your camera</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={Colors.textSecondary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="image-outline"
                size={22}
                color={Colors.white}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Upload from Photos</Text>
              <Text style={styles.rowSubtitle}>Choose an image</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={Colors.textSecondary}
            />
          </View>
        </View>
      </ScreenContainer>
      <DinerBottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  title: {
    ...Typography.heading,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    maxWidth: 300,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.base,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.headingSmall,
    fontSize: 20,
    lineHeight: 34,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
