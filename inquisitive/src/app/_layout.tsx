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
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Toast } from "@/components/ui/Toast";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="conversation/new" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      <Toast />
    </QueryClientProvider>
  );
}
