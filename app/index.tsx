import { Redirect } from 'expo-router';
import { useAppStore } from '../src/stores/appStore';

export default function RootIndex() {
  const { onboardingComplete } = useAppStore();

  if (onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)" />;
}
