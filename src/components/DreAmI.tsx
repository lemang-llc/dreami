import React from 'react';
import { Text, TextStyle } from 'react-native';
import { COLORS, FONTS } from '../theme';

interface DreAmIProps {
  size?: number;
  style?: TextStyle;
}

/**
 * The dreAmI wordmark.
 * "dre" — body font, muted  |  "A" — Cinzel, lavender  |  "m" — body font, muted  |  "I" — Cinzel, teal
 */
export function DreAmI({ size = 24, style }: DreAmIProps) {
  return (
    <Text style={[{ fontSize: size }, style]}>
      <Text style={{ fontFamily: FONTS.body, color: COLORS.textMid }}>dre</Text>
      <Text style={{ fontFamily: FONTS.cinzel, color: COLORS.lavender }}>A</Text>
      <Text style={{ fontFamily: FONTS.body, color: COLORS.textMid }}>m</Text>
      <Text style={{ fontFamily: FONTS.cinzel, color: COLORS.teal }}>I</Text>
    </Text>
  );
}
