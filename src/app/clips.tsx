import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old links to /clips (Clips are now Seeds, a tab of their own). */
export default function ClipsRedirect() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  return <Redirect href={start ? { pathname: '/seeds', params: { start, at: start } } : '/seeds'} />;
}
