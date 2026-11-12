import { LoadingFeedback } from "@/components/action-feedback";
import { StyleSheet, Text, View } from "react-native";

export function EventCatalogStatus({ status, retry, emptyText }: {
  status: "loading" | "ready" | "error";
  retry: () => void;
  emptyText: string;
}) {
  if (status === "loading") return <LoadingFeedback label="Loading events…" />;

  return (
    <View style={styles.container}>
      <Text accessibilityLiveRegion="polite">
        {status === "error" ? "Could not load events. Check your connection and try again." : emptyText}
      </Text>
      {status === "error" && (
        <Text accessibilityRole="button" onPress={retry} style={styles.retry}>
          Try again
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  retry: { color: "#B5122D", fontWeight: "700" },
});
