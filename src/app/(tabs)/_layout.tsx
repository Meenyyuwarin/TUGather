import type { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { campusColors as c } from "@/constants/campus-theme";

const tabs = [
  { name: "index", title: "Home", icon: "home" },
  { name: "explore", title: "Explore", icon: "compass" },
  { name: "tickets", title: "Tickets", icon: "ticket" },
  { name: "profile", title: "Profile", icon: "person" },
] as const;

function TabIcon({ name, focused }: { name: ComponentProps<typeof Ionicons>["name"]; focused: boolean }) {
  return (
    <View style={{
      width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center",
      backgroundColor: focused ? c.red : c.rose,
    }}>
      <Ionicons name={name} size={17} color={focused ? c.paper : c.red} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.red,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: {
        backgroundColor: c.paper,
        borderTopColor: c.line,
        height: 62 + Math.max(insets.bottom, 8),
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 8),
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
    }}>
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarIcon: ({ focused }) => <TabIcon name={icon} focused={focused} />,
        }} />
      ))}
    </Tabs>
  );
}
