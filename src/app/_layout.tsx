
import { StudentAccountProvider } from "@/hooks/student-account";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <StudentAccountProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </StudentAccountProvider>
  );
}
