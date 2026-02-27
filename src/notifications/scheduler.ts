import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getDatabase } from '../db/client';
import { appSettings } from '../db/schema';
import { SETTINGS_KEYS } from '../models/config';
import { eq } from 'drizzle-orm';

const NOTIFICATION_ID = 'morning-dream-reminder';

export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotification(
  settings: NotificationSettings
): Promise<void> {
  // Cancel any existing notification first
  await cancelNotification();

  if (!settings.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Good morning ✨',
      body: 'What did you dream about last night?',
      data: { screen: '/(tabs)/record' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
    },
  });
}

export async function cancelNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(appSettings)
    .where(
      eq(appSettings.key, SETTINGS_KEYS.NOTIFICATION_ENABLED)
    );

  // Default: enabled at 8:00 AM
  let enabled = true;
  let hour = 8;
  let minute = 0;

  const allRows = await db.select().from(appSettings);
  for (const row of allRows) {
    if (row.key === SETTINGS_KEYS.NOTIFICATION_ENABLED) {
      enabled = row.value === 'true';
    }
    if (row.key === SETTINGS_KEYS.NOTIFICATION_HOUR) {
      hour = parseInt(row.value, 10);
    }
    if (row.key === SETTINGS_KEYS.NOTIFICATION_MINUTE) {
      minute = parseInt(row.value, 10);
    }
  }

  return { enabled, hour, minute };
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  const db = getDatabase();

  const upsert = async (key: string, value: string) => {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  };

  await Promise.all([
    upsert(SETTINGS_KEYS.NOTIFICATION_ENABLED, String(settings.enabled)),
    upsert(SETTINGS_KEYS.NOTIFICATION_HOUR, String(settings.hour)),
    upsert(SETTINGS_KEYS.NOTIFICATION_MINUTE, String(settings.minute)),
  ]);

  await scheduleNotification(settings);
}

// Configure notification handler (call once at app startup)
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
