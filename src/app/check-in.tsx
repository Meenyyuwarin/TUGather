import { useCallback, useRef, useState } from "react";
import { LoadingFeedback } from "@/components/action-feedback";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCheckInEvents } from "@/hooks/use-check-in-events";
import { accountClient, errorMessage } from "@/services/student-account";

const ticketCodePattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function Scanner({ eventId, close }: { eventId: string; close: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string }>();
  const [pending, setPending] = useState(false);
  const locked = useRef(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  async function scan(raw: string) {
    if (locked.current) return;
    locked.current = true;
    const code = raw.trim();
    if (!ticketCodePattern.test(code)) {
      setResult({ success: false, message: "This QR code is not a TUGather ticket." });
      return;
    }

    setPending(true);
    try {
      const { error } = await accountClient().rpc("tugather_check_in", {
        target_event_id: eventId,
        scanned_code: code,
      });
      if (error) throw error;
      setResult({ success: true, message: "Checked in successfully." });
    } catch (error) {
      setResult({ success: false, message: errorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.group}>
      {!permission ? <LoadingFeedback label="Checking camera permission…" /> :
        !permission.granted ? (
          <>
            <Text>Camera access is required to scan a ticket.</Text>
            {permission.canAskAgain ?
              <Text accessibilityRole="button" onPress={() => { void requestPermission(); }} style={styles.link}>Allow camera</Text> :
              <Text>Enable camera access in your device or browser settings.</Text>}
          </>
        ) : focused && !result && (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={pending ? undefined : ({ data }) => { void scan(data); }}
            onMountError={() => setResult({ success: false, message: "Could not open the camera." })}
          />
        )}
      {pending && <LoadingFeedback label="Checking ticket…" />}
      {result && (
        <>
          <Text accessibilityLiveRegion="polite" style={result.success ? styles.success : styles.error}>{result.message}</Text>
          <Text accessibilityRole="button" style={styles.link} onPress={() => {
            locked.current = false;
            setResult(undefined);
          }}>Scan another ticket</Text>
        </>
      )}
      <Text accessibilityRole="button" style={styles.link} onPress={close}>Change event</Text>
    </View>
  );
}

export default function CheckInScreen() {
  const { session, loading, events, error, retry } = useCheckInEvents();
  const [selection, setSelection] = useState<string>();
  const event = events.find((item) => item.id === selection);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="button" style={styles.link} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}>← Back</Text>
        <Text style={styles.title}>Event check-in</Text>
        {loading ? <LoadingFeedback label="Loading events…" /> :
          !session ? <Text accessibilityRole="button" style={styles.link} onPress={() => router.push("/login")}>Sign in to check in tickets</Text> :
          error ? <Text accessibilityRole="button" style={styles.link} onPress={retry}>Could not load check-in events. Try again.</Text> :
          event ? (
            <>
              <Text style={styles.heading}>{event.title}</Text>
              <Scanner key={event.id} eventId={event.id} close={() => setSelection(undefined)} />
            </>
          ) : !events.length ? <Text>You do not have any events available for check-in.</Text> :
            events.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" style={styles.card} onPress={() => setSelection(item.id)}>
                <Text style={styles.heading}>{item.title}</Text>
              </Pressable>
            ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F1" },
  content: { padding: 24, gap: 16, width: "100%", maxWidth: 600, alignSelf: "center" },
  group: { gap: 16 },
  title: { fontSize: 38, fontWeight: "800", color: "#171717" },
  heading: { fontSize: 18, fontWeight: "700", color: "#171717" },
  link: { color: "#B5122D", fontWeight: "700", paddingVertical: 10 },
  card: { backgroundColor: "#FFF", borderRadius: 6, padding: 16 },
  camera: { width: "100%", aspectRatio: 1, backgroundColor: "#171717" },
  success: { color: "#12613F", fontWeight: "700" },
  error: { color: "#B5122D", fontWeight: "700" },
});
