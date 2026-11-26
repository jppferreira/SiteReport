import { Redirect } from 'expo-router';

/** My Account lives on the root stack at `/settings` so the Jobs avatar can push it. */
export default function SettingsTabRedirect() {
  return <Redirect href="/settings" />;
}
