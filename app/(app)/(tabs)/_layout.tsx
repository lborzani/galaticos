import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { Text } from '@/components/ui/Text';
import { Spacing } from '@/constants/spacing';

function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.tabIcon}>
      <Text
        variant="caption"
        weight={focused ? 'semibold' : 'regular'}
        style={{ color: focused ? theme.accent.primary : theme.text.muted }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const pendingCount = useInboxStore((s) => s.getPendingCount());

  const tabBarStyle = {
    backgroundColor: theme.background.secondary,
    borderTopColor: theme.background.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 60,
    paddingBottom: Spacing[2],
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="🏠" />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="passaporte"
        options={{
          title: 'Passaporte',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="🎫" />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="⚙️" />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="👤" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
