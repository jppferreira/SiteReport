import { Redirect } from 'expo-router';

/** Documents tab merged into Jobs — keep route for deep links. */
export default function DocumentsRedirect() {
  return <Redirect href="/(tabs)/jobs" />;
}
