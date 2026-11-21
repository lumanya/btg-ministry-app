import { Tabs } from 'expo-router';

import { t } from '@/i18n';
import { TabBar } from '@/components/tab-bar';
import { useColors } from '@/state/theme';

/**
 * Five tabs: Today · Seeds · Watch · Word · Listen.
 * Live has no tab of its own: Watch leads to it, and it stays reachable at /live.
 */
const tabs = [
  { name: 'home', title: 'Today' },
  { name: 'seeds', title: 'Seeds' },
  { name: 'sermons', title: 'Watch' },
  { name: 'devotional', title: 'Word' },
  { name: 'podcast', title: 'Listen' },
  { name: 'live', title: 'Live' },
];

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.ivory } }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: t(tab.title), sceneStyle: tab.name === 'seeds' ? { backgroundColor: '#0E0B09' } : undefined }}
        />
      ))}
    </Tabs>
  );
}
