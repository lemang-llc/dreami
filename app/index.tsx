import { Redirect } from 'expo-router';
import { useAppStore } from '../src/stores/appStore';
import { screenshotRoute } from '../src/utils/screenshotSeed';

export default function RootIndex() {
  const { onboardingComplete } = useAppStore();

  // Screenshot mode: seed data has already been written and the target route
  // is set as a module-level variable. Redirect there directly so the correct
  // screen is the very first thing rendered — no timing race with useEffect.
  if (__DEV__ && screenshotRoute) {
    return <Redirect href={screenshotRoute as any} />;
  }

  if (onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)" />;
}
