import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('screen');

interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  minOp: number;
  maxOp: number;
  duration: number;
  animValue: Animated.Value;
}

function makeStar(index: number): Star {
  const r = Math.random();
  let size: number, color: string, minOp: number, maxOp: number, duration: number;

  if (index < 50) {
    // Tiny distant stars — mostly static-looking
    size = 0.7 + r * 0.5;
    color = '#ffffff';
    minOp = 0.05 + r * 0.09;
    maxOp = 0.18 + r * 0.18;
    duration = 3000 + r * 4000;
  } else if (index < 75) {
    // Small mid-field stars
    size = 1.2 + r * 0.8;
    color = r < 0.5 ? '#ffffff' : '#e8e4ff';
    minOp = 0.13 + r * 0.13;
    maxOp = 0.36 + r * 0.29;
    duration = 2000 + r * 3000;
  } else {
    // Bright feature stars — lavender or teal tint
    size = 2 + r * 1.8;
    color = r < 0.55 ? '#c4b5fd' : '#67e8f9';
    minOp = 0.26 + r * 0.20;
    maxOp = 0.72 + r * 0.25;
    duration = 1200 + r * 2000;
  }

  // Start at a random point in the cycle so stars don't all pulse together
  const startOp = minOp + Math.random() * (maxOp - minOp);

  return {
    x: Math.random() * W,
    y: Math.random() * H,
    size,
    color,
    minOp,
    maxOp,
    duration,
    animValue: new Animated.Value(startOp),
  };
}

const STAR_COUNT = 80;

export function StarField() {
  // Create stars once per component instance
  const starsRef = useRef<Star[]>(
    Array.from({ length: STAR_COUNT }, (_, i) => makeStar(i))
  );

  useEffect(() => {
    const anims = starsRef.current.map((star) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(star.animValue, {
            toValue: star.maxOp,
            duration: star.duration,
            useNativeDriver: true,
          }),
          Animated.timing(star.animValue, {
            toValue: star.minOp,
            duration: star.duration,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {starsRef.current.map((star, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: star.color,
            opacity: star.animValue,
            // Soft glow on prominent stars (iOS only — elevation doesn't glow)
            ...(star.size >= 2.5 && Platform.OS === 'ios'
              ? {
                  shadowColor: star.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: star.size * 3.5,
                }
              : {}),
          }}
        />
      ))}
    </View>
  );
}
