import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/icon';
import { Fonts, Palette } from '@/constants/theme';
import { useColors, useStyles } from '@/state/theme';

function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Icon name={name} color={focused ? c.accent : color} dot={name === 'live'} />
    </View>
  );
}

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'sermons', title: 'Sermons', icon: 'sermons' },
  { name: 'live', title: 'Live', icon: 'live' },
  { name: 'podcast', title: 'Podcast', icon: 'podcast' },
  { name: 'devotional', title: 'Devotional', icon: 'devotional' },
];

export default function TabLayout() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brownDark,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: c.ivory,
          borderTopColor: c.line,
          height: 68 + Math.max(insets.bottom, 10),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        sceneStyle: { backgroundColor: c.ivory },
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <TabIcon name={t.icon} focused={focused} color={c.textSubtle} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 11, marginTop: 2 },
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: c.sand },
});
