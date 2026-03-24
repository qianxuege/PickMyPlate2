import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from "react-native";

import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";

export type PreferenceInputProps = {
  placeholder?: string;
  onSubmit: (value: string) => void;
  /** Controlled value — when set, `onChangeText` should also be provided */
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
};

const INPUT_MIN_HEIGHT = 88;

export function PreferenceInput({
  placeholder = "e.g. I have a peanut allergy, I love desserts…",
  onSubmit,
  value: controlledValue,
  onChangeText,
  multiline = true,
}: PreferenceInputProps) {
  const [innerValue, setInnerValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : innerValue;

  const setValue = (text: string) => {
    if (isControlled) {
      onChangeText?.(text);
    } else {
      setInnerValue(text);
    }
  };

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      if (!isControlled) setInnerValue("");
    }
  };

  const handleSubmitEditing = (
    _e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) => {
    handleAdd();
  };

  return (
    <View style={styles.outer}>
      <View style={styles.fieldRow}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={Colors.textPlaceholder}
          returnKeyType="done"
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
        />
        <View style={styles.trailing}>
          <Text style={styles.sparkle} accessibilityLabel="AI assist"></Text>
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            hitSlop={6}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    minHeight: INPUT_MIN_HEIGHT,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: INPUT_MIN_HEIGHT,
  },
  trailing: {
    paddingTop: Spacing.sm,
    paddingRight: Spacing.sm,
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  sparkle: {
    fontSize: 16,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  addButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  addButtonText: {
    ...Typography.captionMedium,
    color: Colors.white,
  },
});
