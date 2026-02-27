import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const BAR_COUNT = 30;
const BAR_WIDTH = 4;
const BAR_GAP = 3;
const MAX_HEIGHT = 48;
const MIN_HEIGHT = 4;

interface WaveformProps {
  bars: number[]; // amplitude values 0-1
  color?: string;
}

export function Waveform({ bars, color = '#a78bfa' }: WaveformProps) {
  // Pad or truncate to exactly BAR_COUNT
  const displayBars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const barIndex = bars.length - BAR_COUNT + i;
    return barIndex >= 0 ? bars[barIndex] : 0;
  });

  return (
    <View style={styles.container}>
      {displayBars.map((amplitude, i) => (
        <WaveformBar key={i} amplitude={amplitude} color={color} />
      ))}
    </View>
  );
}

function WaveformBar({
  amplitude,
  color,
}: {
  amplitude: number;
  color: string;
}) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    const targetHeight =
      MIN_HEIGHT + amplitude * (MAX_HEIGHT - MIN_HEIGHT);
    height.value = withSpring(targetHeight, {
      damping: 15,
      stiffness: 200,
    });
  }, [amplitude, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color, width: BAR_WIDTH },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MAX_HEIGHT + 8,
    gap: BAR_GAP,
  },
  bar: {
    borderRadius: 2,
  },
});
