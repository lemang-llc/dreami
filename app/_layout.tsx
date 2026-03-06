import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SplashScreen } from '../src/components/SplashScreen';
import { useFonts, Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { initDatabase } from '../src/db/client';
import { appSettings } from '../src/db/schema';
import { SETTINGS_KEYS } from '../src/models/config';
import { ensureDirectoriesExist } from '../src/utils/fileSystem';
import {
  configureNotificationHandler,
  scheduleNotification,
  loadNotificationSettings,
} from '../src/notifications/scheduler';
import { useAppStore } from '../src/stores/appStore';
import { getDatabase } from '../src/db/client';
import { eq } from 'drizzle-orm';
import { COLORS, FONTS } from '../src/theme';

configureNotificationHandler();

export default function RootLayout() {
  const { setOnboardingComplete, onboardingComplete } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pendingNavRef = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    async function init() {
      await ensureDirectoriesExist();
      await initDatabase();

      const db = getDatabase();
      const rows = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, SETTINGS_KEYS.ONBOARDING_COMPLETE));

      const complete = rows[0]?.value === 'true';
      setOnboardingComplete(complete);

      if (complete) {
        const notifSettings = await loadNotificationSettings();
        await scheduleNotification(notifSettings);
      }

      if (complete) {
        const last = await Notifications.getLastNotificationResponseAsync();
        const screen = last?.notification.request.content.data?.screen as string | undefined;
        if (screen) pendingNavRef.current = screen;
      }

      setIsReady(true);
    }

    init();

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) router.navigate(screen as any);
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [setOnboardingComplete]);

  useEffect(() => {
    if (isReady && onboardingComplete && pendingNavRef.current) {
      router.navigate(pendingNavRef.current as any);
      pendingNavRef.current = null;
    }
  }, [isReady, onboardingComplete]);

  // Show custom splash once the app is fully initialised
  useEffect(() => {
    if (isReady && fontsLoaded) setShowSplash(true);
  }, [isReady, fontsLoaded]);

  if (!fontsLoaded || !isReady) {
    // Dark background while fonts + DB load — native splash covers this gap
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.lavender,
          headerTitleStyle: {
            fontFamily: FONTS.bodySemi,
            color: COLORS.textBright,
          },
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="dream/[id]"
          options={{ title: 'Dream', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings', presentation: 'modal' }}
        />
        <Stack.Screen
          name="licenses"
          options={{ title: 'Open Source Licenses', headerBackTitle: 'Settings' }}
        />
      </Stack>
    </>
  );
}
