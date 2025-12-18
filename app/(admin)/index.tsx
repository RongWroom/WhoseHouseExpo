import { Redirect } from 'expo-router';

export default function AdminIndex() {
  // Redirect to dashboard by default
  return <Redirect href="/(admin)/dashboard" />;
}
