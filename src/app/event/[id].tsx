import { useState, type ComponentProps } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { EventRegistration } from "@/components/event-registration";
import { EventCatalogStatus } from "@/components/event-catalog-status";
import { campusColors as c } from "@/constants/campus-theme";
import { useAvailableSeats, useEventCatalog } from "@/hooks/use-event-catalog";

function EventFact({ label, value, icon }: {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}><Ionicons name={icon} size={18} color={c.red} /></View>
      <View style={styles.factText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const [openedAt] = useState(Date.now);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, status, retry } = useEventCatalog(id);
  const event = events.find((item) => item.id === id);
  const seats = useAvailableSeats(event?.capacity == null ? undefined : event.id);
  const isFull = seats?.value === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" style={styles.back}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/explore")}>
          <Ionicons name="arrow-back" size={18} color={c.red} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {status !== "ready" || !event ? (
          <EventCatalogStatus status={status} retry={retry} emptyText="Event not found." />
        ) : (
          <>
            <View style={styles.hero}>
              {event.image && <Image source={{ uri: event.image }} style={styles.cover} />}
              <LinearGradient colors={event.image ? ["#431C241A", "#431C24F0"] : [c.red, c.ink]}
                locations={[0.15, 1]} style={styles.cover} />
              <View style={styles.badges}>
                <Text style={styles.badge}>{event.category}</Text>
                <Text style={styles.badge}>{event.campus}</Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
            </View>

            <View style={styles.facts}>
              <EventFact icon="calendar-outline" label="Date" value={event.date} />
              <EventFact icon="time-outline" label="Time" value={event.time} />
              <EventFact icon="location-outline" label="Location" value={event.location} />
              <EventFact icon="ticket-outline" label="Available seats" value={
                event.capacity === null ? "No seat limit" : seats?.error ? "Unavailable" :
                  seats?.value == null ? "Checking…" : `${seats.value} / ${event.capacity}`
              } />
            </View>

            {!!event.description && (
              <View style={styles.panel}>
                <Text accessibilityRole="header" style={styles.heading}>About this event</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            )}
            {event.club !== "Unspecified organizer" && (
              <View style={styles.panel}>
                <EventFact icon="people-outline" label="Organizer" value={event.club} />
              </View>
            )}
            <View style={styles.registration}>
              <EventRegistration key={event.id} eventId={event.id} isFull={isFull}
                hasStarted={Date.parse(event.startsAt) <= openedAt} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 18, paddingBottom: 28, gap: 13 },
  back: { minHeight: 42, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: c.rose, borderRadius: 22, paddingHorizontal: 14 },
  backText: { color: c.red, fontWeight: "800" },
  hero: { minHeight: 226, padding: 18, gap: 68, justifyContent: "space-between", overflow: "hidden", borderRadius: 26, backgroundColor: c.ink },
  cover: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  badge: { backgroundColor: c.gold, borderRadius: 18, paddingVertical: 6, paddingHorizontal: 10, color: c.ink, fontSize: 12, fontWeight: "800" },
  title: { color: c.paper, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: -0.6 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { flexGrow: 1, flexShrink: 1, flexBasis: "45%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 16, backgroundColor: c.paper, borderColor: c.line, borderWidth: 1 },
  factIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" },
  factText: { flex: 1, gap: 3 },
  label: { color: c.muted, fontSize: 11, fontWeight: "700" },
  value: { color: c.ink, fontSize: 14, fontWeight: "800" },
  panel: { padding: 15, gap: 6, borderRadius: 19, backgroundColor: c.paper, borderColor: c.line, borderWidth: 1 },
  heading: { color: c.ink, fontSize: 17, fontWeight: "900" },
  description: { color: c.muted, fontSize: 14, lineHeight: 22 },
  registration: { paddingHorizontal: 14, paddingVertical: 2, borderRadius: 19, backgroundColor: c.paleGold },
});
