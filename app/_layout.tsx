import React, { useEffect, useRef, useState } from 'react';
import { Stack, router, Redirect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
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

configureNotificationHandler();

export default function RootLayout() {
  const { setOnboardingComplete, onboardingComplete } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

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

      // Re-schedule notification on every app open if enabled
      if (complete) {
        const notifSettings = await loadNotificationSettings();
        await scheduleNotification(notifSettings);
      }

      setIsReady(true);
    }

    init();

    // Notification tap listener: deep-link to record screen
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          router.push(screen as any);
        }
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [setOnboardingComplete]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' }}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a1a' },
          headerTintColor: '#e2e8f0',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0a0a1a' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="dream/[id]"
          options={{ title: 'Dream Detail', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
