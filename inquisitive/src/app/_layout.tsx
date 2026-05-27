import "@/global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
} from "@expo-google-fonts/fraunces";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Toast } from "@/components/ui/Toast";
import { supabase } from "@/lib/db/client";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate() {
  const setSession = useAuthStore((s) => s.setSession);
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session === null) {
        queryClient.clear();
      }
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup && (segments[1] as string) !== 'welcome') {
      router.replace('/(tabs)/' as any);
    }
  }, [session, segments]);

  return null;
}

export default function RootLayout() {
  const session = useAuthStore((s) => s.session);
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Fraunces-Light": Fraunces_300Light,
    "Fraunces-LightItalic": Fraunces_300Light_Italic,
    Fraunces: Fraunces_400Regular,
    "Fraunces-Italic": Fraunces_400Regular_Italic,
    "Fraunces-SemiBold": Fraunces_600SemiBold,
    "Fraunces-SemiBoldItalic": Fraunces_600SemiBold_Italic,
    "Fraunces-Bold": Fraunces_700Bold,
    "Fraunces-BoldItalic": Fraunces_700Bold_Italic,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && session !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, session]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="conversation/new" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      <Toast />
    </QueryClientProvider>
  );
}
