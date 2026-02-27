import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
} from 'react-native';

interface TranscriptEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function TranscriptEditor({
  value,
  onChange,
  placeholder = 'Your dream transcript will appear here. Edit as needed...',
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
        placeholderTextColor="#475569"
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
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordCount: {
    color: '#475569',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
});
