import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { DreAmI } from './DreAmI';
import { StarField } from './StarField';
import { COLORS, FONTS } from '../theme';

const LOGO_SIZE = 56;
const HOLD_MS   = 3200;
const FADE_MS       = 550;

interface Props {
  onFinish: () => void;
}

// Invisible copy of the wordmark that only shows textShadow glow.
// Sits behind the crisp DreAmI layer; its parent's opacity is animated.
function GlowText() {
  const shadow = (color: string) => ({
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  });

  return (
    <Text style={{ fontSize: LOGO_SIZE }}>
      <Text style={[{ fontFamily: FONTS.body,   color: COLORS.amber      }, shadow(COLORS.amber)   ]}>dre</Text>
      <Text style={[{ fontFamily: FONTS.cinzel, color: COLORS.lavender   }, shadow(COLORS.lavender)]}>A</Text>
      <Text style={[{ fontFamily: FONTS.body,   color: COLORS.amber      }, shadow(COLORS.amber)   ]}>m</Text>
      <Text style={[{ fontFamily: FONTS.cinzel, color: COLORS.teal       }, shadow(COLORS.teal)    ]}>I</Text>
    </Text>
  );
}

export function SplashScreen({ onFinish }: Props) {
  const mounted = useRef(true);

  // ── Animated values ──────────────────────────────────────────────
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity      = useRef(new Animated.Value(0)).current;
  const logoScale        = useRef(new Animated.Value(0.82)).current;
  const glowOpacity      = useRef(new Animated.Value(0.08)).current; // text-shadow layer

  // ── Sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true;

    // Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, damping: 13, stiffness: 85, useNativeDriver: true,
      }),
    ]).start();

    // Text glow pulses gently (low → high → low …), native driver via opacity
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.9, duration: 1200, delay: 700,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.08, duration: 1200,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );
    glowAnim.start();

    // Fade-out
    const tFade = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0, duration: FADE_MS, useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, HOLD_MS);

    return () => {
      mounted.current = false;
      clearTimeout(tFade);
      glowAnim.stop();
    };
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: containerOpacity }]}>
      <StarField />

      <View style={styles.center}>
          {/* Logo stack */}
          <Animated.View
            style={[styles.logoCard, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
          >
            {/* Glow layer: same text, textShadow only, opacity pulses */}
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.glowLayer, { opacity: glowOpacity }]}
              pointerEvents="none"
            >
              <GlowText />
            </Animated.View>

            {/* Crisp wordmark on top */}
            <DreAmI size={LOGO_SIZE} />
          </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.bg,
    zIndex: 999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    paddingHorizontal: 32,
    paddingVertical: 22,
    borderRadius: 22,
  },
  glowLayer: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
