import { Redirect } from 'expo-router';

/** Legacy tab path — Reports → Documents → Jobs. */
export default function ReportsRedirect() {
  return <Redirect href="/(tabs)/jobs" />;
}
