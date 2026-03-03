import React from 'react';
import { Tabs, router } from 'expo-router';
import { Text, Pressable } from 'react-native';
import { DreAmI } from '../../src/components/DreAmI';
import { COLORS, FONTS } from '../../src/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.4 }}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0c0c20',
          borderTopWidth: 0,
          height: 84,
          paddingBottom: 18,
          paddingTop: 8,
          // Soft upward glow from tab bar
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
          <Pressable
            onPress={() => router.push('/settings')}
            style={{ marginRight: 18 }}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Dreams',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌙" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎙" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
