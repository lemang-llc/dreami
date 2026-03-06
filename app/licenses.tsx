import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StarField } from '../src/components/StarField';
import { COLORS, FONTS } from '../src/theme';

type Entry = {
  name: string;
  copyright?: string;
  note?: string;
};

const SECTIONS: { title: string; license: string; entries: Entry[] }[] = [
  {
    title: 'Meta Llama 3.2',
    license: 'Meta Llama 3.2 Community License',
    entries: [
      {
        name: 'Llama 3.2 1B',
        copyright: '© 2024 Meta Platforms, Inc.',
        note: 'Built with Meta Llama 3.2',
      },
    ],
  },
  {
    title: 'Fonts',
    license: 'SIL Open Font License 1.1',
    entries: [
      { name: 'Cinzel', copyright: '© 2011 The Cinzel Project Authors' },
      { name: 'Outfit', copyright: '© 2021 The Outfit Project Authors' },
    ],
  },
  {
    title: 'Apache License 2.0',
    license: 'Apache License, Version 2.0',
    entries: [
      { name: 'drizzle-orm', copyright: '© 2022 Drizzle Team' },
      { name: 'Nomic Embed Text', copyright: '© 2024 Nomic, Inc.' },
    ],
  },
  {
    title: 'MIT License',
    license: 'MIT License',
    entries: [
      { name: 'React', copyright: '© Meta Platforms, Inc.' },
      { name: 'React Native', copyright: '© Meta Platforms, Inc.' },
      { name: 'Expo', copyright: '© 650 Industries, Inc.' },
      { name: 'expo-router', copyright: '© 650 Industries, Inc.' },
      { name: 'expo-speech', copyright: '© 650 Industries, Inc.' },
      { name: 'expo-sqlite', copyright: '© 650 Industries, Inc.' },
      { name: 'expo-audio', copyright: '© 650 Industries, Inc.' },
      { name: 'expo-notifications', copyright: '© 650 Industries, Inc.' },
      { name: 'llama.rn', copyright: '© 2023 a16z-infra' },
      { name: 'whisper.rn', copyright: '© 2023 Eduard Ort' },
      { name: 'react-native-svg', copyright: '© 2015 Horcrux Engineering' },
      { name: 'react-native-reanimated', copyright: '© 2021 Software Mansion' },
      { name: 'react-native-gesture-handler', copyright: '© 2021 Software Mansion' },
      { name: 'react-native-screens', copyright: '© 2021 Software Mansion' },
      { name: 'react-native-safe-area-context', copyright: '© 2019 Th3rdwave' },
      { name: 'zustand', copyright: '© 2019 Paul Henschel' },
    ],
  },
];

export default function LicensesScreen() {
  return (
    <View style={styles.root}>
      <StarField />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.licenseTag}>{section.license}</Text>
            {section.entries.map((entry) => (
              <View key={entry.name} style={styles.entry}>
                <Text style={styles.entryName}>{entry.name}</Text>
                {entry.copyright && (
                  <Text style={styles.entryCopyright}>{entry.copyright}</Text>
                )}
                {entry.note && (
                  <Text style={styles.entryNote}>{entry.note}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.lavenderMid,
    fontFamily: FONTS.cinzelReg,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    opacity: 0.85,
  },
  licenseTag: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 11,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  entry: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  entryName: {
    color: COLORS.textBright,
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
  },
  entryCopyright: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  entryNote: {
    color: COLORS.teal,
    fontFamily: FONTS.bodyMed,
    fontSize: 11,
    marginTop: 2,
  },
});
