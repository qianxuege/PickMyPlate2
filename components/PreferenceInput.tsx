import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';

import { BorderRadius, Colors, Dimensions, Spacing, Typography } from '@/constants/theme';

export type PreferenceInputProps = {
  placeholder?: string;
  onSubmit: (value: string) => void;
};

export function PreferenceInput({
  placeholder = 'e.g. I have a peanut allergy, I love...',
  onSubmit,
}: PreferenceInputProps) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue('');
    }
  };

  const handleSubmitEditing = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    handleAdd();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={Colors.textPlaceholder}
        returnKeyType="done"
        onSubmitEditing={handleSubmitEditing}
        blurOnSubmit={false}
      />
      <Pressable onPress={handleAdd} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingRight: Spacing.xs,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    height: Dimensions.inputHeight,
    paddingHorizontal: Spacing.base,
    ...Typography.body,
    color: Colors.text,
  },
  addButton: {
    marginLeft: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    ...Typography.captionMedium,
    color: Colors.white,
  },
});
