import React from 'react';
import { Tabs, router } from 'expo-router';
import { Text, Pressable } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🌙',
    Record: '🎙',
    Chat: '✨',
  };
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '?'}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0f0f1e',
          borderTopColor: '#1a1a2e',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: '#0a0a1a' },
        headerTintColor: '#e2e8f0',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dreams',
          tabBarLabel: 'Dreams',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarLabel: 'Record',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Record" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Chat" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
