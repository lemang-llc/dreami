import React from 'react';
import { View, Text, TextStyle, ViewStyle } from 'react-native';
import { AtomIcon } from './Icons';
import { COLORS, FONTS } from '../theme';

interface LeMaNgLabsProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * The LeMaNg LLC brand mark.
 *
 * Styled to match dreAmI's typographic convention:
 *   capitals → Cinzel (serif), alternating lavender / teal
 *   lowercase → body font, amber
 *
 *   L  e  M  a  N  g     L  a  b  s
 *   ↑        ↑     ↑        ↑
 *  teal  lavender teal  lavender
 */
export function LeMaNgLabs({ size = 14, style }: LeMaNgLabsProps) {
  const lower: TextStyle = { fontFamily: FONTS.body, color: COLORS.amber };
  const cap1: TextStyle  = { fontFamily: FONTS.cinzel, color: COLORS.teal };
  const cap2: TextStyle  = { fontFamily: FONTS.cinzel, color: COLORS.lavender };

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      <Text style={{ fontSize: size }}>
        <Text style={cap1}>L</Text>
        <Text style={lower}>e</Text>
        <Text style={cap2}>M</Text>
        <Text style={lower}>a</Text>
        <Text style={cap1}>N</Text>
        <Text style={lower}>g </Text>
        <Text style={cap2}>L</Text>
        <Text style={lower}>abs</Text>
      </Text>
      <AtomIcon color={COLORS.teal} size={size + 2} />
    </View>
  );
}
