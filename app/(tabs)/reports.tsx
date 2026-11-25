import { Redirect } from 'expo-router';

/** Legacy tab path — Documents tab replaced Reports in the nav. */
export default function ReportsRedirect() {
  return <Redirect href="/(tabs)/documents" />;
}