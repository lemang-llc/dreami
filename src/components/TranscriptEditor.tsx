import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

interface TranscriptEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function TranscriptEditor({
  value,
  onChange,
  placeholder = 'Your dream transcript will appear here. Edit as needed…',
}: TranscriptEditorProps) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Transcript</Text>
        <Text style={styles.wordCount}>{wordCount} words</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textFaint}
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: COLORS.textMid,
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  wordCount: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: FONTS.body,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    color: COLORS.textBright,
    fontSize: 15,
    fontFamily: FONTS.body,
    lineHeight: 22,
    minHeight: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
