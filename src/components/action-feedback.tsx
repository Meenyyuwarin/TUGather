import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { campusColors as c } from "@/constants/campus-theme";

export function LoadingTicket({ color = c.red, size = 22 }: { color?: string; size?: number }) {
  const lift = useSharedValue(0);
  const bounce = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * lift.value }, { rotate: `${-12 + 18 * lift.value}deg` }],
  }));

  useEffect(() => {
    lift.value = withRepeat(
      withTiming(1, { duration: 560, easing: Easing.inOut(Easing.sin) }),
      -1, true, undefined, ReduceMotion.System,
    );
    return () => cancelAnimation(lift);
  }, [lift]);

  return (
    <View aria-hidden style={styles.ticket}>
      <Animated.View style={bounce}><Ionicons name="ticket" color={color} size={size} /></Animated.View>
      <Ionicons name="sparkles" size={10} color={color} style={styles.sparkle} />
    </View>
  );
}

export function LoadingFeedback({ label }: { label: string }) {
  return (
    <View style={styles.loading} accessibilityLiveRegion="polite" aria-busy>
      <LoadingTicket />
      <Text style={styles.message}>{label}</Text>
    </View>
  );
}

type Props = {
  title: string;
  message: string;
  tone: "warning" | "success";
  close: () => void;
  dismissLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  insideModal?: boolean;
};

export function ActionFeedback({
  title, message, tone, close, dismissLabel = "OK", actionLabel, onAction, busy = false, insideModal = false,
}: Props) {
  const content = (
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal aria-modal style={styles.card}>
        <View style={[styles.icon, tone === "success" && styles.successIcon]}>
          {busy ? <LoadingTicket /> : (
            <Ionicons name={tone === "success" ? "checkmark-circle" : "information-circle"}
              size={25} color={tone === "success" ? c.green : c.red} />
          )}
        </View>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={close}
            style={[styles.button, onAction ? styles.secondary : styles.primary]}>
            <Text style={onAction ? styles.secondaryText : styles.primaryText}>{dismissLabel}</Text>
          </Pressable>
          {onAction && (
            <Pressable accessibilityRole="button" disabled={busy} onPress={onAction} style={[styles.button, styles.primary]}>
              <Text style={styles.primaryText}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
  if (insideModal) return content;
  return (
    <Modal transparent animationType="fade" onRequestClose={busy ? () => {} : close}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  ticket: { width: 32, height: 30, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", right: 0, top: 0 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: c.paleGold },
  backdrop: { position: "absolute", inset: 0, backgroundColor: "#431C2480", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { backgroundColor: c.paper, padding: 20, gap: 10, borderRadius: 24, width: "100%", maxWidth: 400 },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: c.rose },
  successIcon: { backgroundColor: "#E0F2E6" },
  title: { color: c.ink, fontWeight: "900", fontSize: 22 },
  message: { color: c.muted, fontSize: 14, lineHeight: 22, flexShrink: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginTop: 6 },
  button: { paddingHorizontal: 13, minHeight: 44, borderRadius: 22, justifyContent: "center" },
  primary: { backgroundColor: c.red },
  secondary: { backgroundColor: c.rose },
  primaryText: { color: c.paper, fontWeight: "800" },
  secondaryText: { color: c.red, fontWeight: "800" },
});
