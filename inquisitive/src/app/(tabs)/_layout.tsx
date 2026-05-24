import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="review" options={{ title: "Review" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
    </Tabs>
  );
}
