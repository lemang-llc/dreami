import React from 'react';
import { Tabs, router } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DreAmI } from '../../src/components/DreAmI';
import { MoonIcon, MicIcon, SparkleIcon, GearIcon } from '../../src/components/Icons';
import { COLORS, FONTS } from '../../src/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0c0c20',
          borderTopWidth: 0,
          height: 84 + insets.bottom,
          paddingBottom: 18 + insets.bottom,
          paddingTop: 8,
          shadowColor: COLORS.lavender,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
          elevation: 24,
        },
        tabBarActiveTintColor: COLORS.lavender,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: {
          fontFamily: FONTS.bodyMed,
          fontSize: 11,
          marginTop: 2,
        },
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.lavender,
        headerTitleStyle: { fontFamily: FONTS.bodySemi },
        headerTitle: () => <DreAmI size={22} />,
        headerRight: () => (
          <Pressable onPress={() => router.push('/settings')} style={{ marginRight: 18 }} hitSlop={8}>
            <GearIcon color={COLORS.lavender} size={20} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Dreams',
          tabBarIcon: ({ color, focused }) => (
            <MoonIcon color={color} size={focused ? 22 : 19} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ color, focused }) => (
            <MicIcon color={color} size={focused ? 22 : 19} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <SparkleIcon color={color} size={focused ? 22 : 19} />
          ),
        }}
      />
    </Tabs>
  );
}
