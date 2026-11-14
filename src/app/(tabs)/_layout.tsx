import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { useColors } from '@/state/theme';

const tabs = [
  { name: 'home', title: 'Home' },
  { name: 'sermons', title: 'Sermons' },
  { name: 'live', title: 'Live' },
  { name: 'podcast', title: 'Podcast' },
  { name: 'devotional', title: 'Devotional' },
];

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.ivory } }}>
      {tabs.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
