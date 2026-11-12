import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStudentAccount } from "@/hooks/student-account";
import { accountClient } from "@/services/student-account";

import { ActionFeedback, LoadingFeedback } from "@/components/action-feedback";
import { TicketCard, TicketDetails, type Ticket } from "@/components/ticket-card";
import { campusColors as c } from "@/constants/campus-theme";

export default function TicketsScreen() {
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const { session, loading } = useStudentAccount();
  const userId = session?.user.id;
  const [selected, setSelected] = useState<{ id: string; owner: string }>();
  const [cancelled, setCancelled] = useState<{ owner?: string; eventId: string }>();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ userId: string; attempt: number; tickets?: Ticket[] }>();

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const ownerId = userId;
    const client = accountClient();
    let request: AbortController | undefined;
    let active = true;

    function refresh() {
      if (!active) return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      void client.from("tickets")
        .select("id,ticket_code,status,registration:registrations(event:events(id,title,cover_url,starts_at,ends_at,location_name,location_detail,description,campus:campuses(name),club:clubs(name)))")
        .neq("status", "cancelled")
        .order("issued_at", { ascending: false }).abortSignal(controller.signal)
        .overrideTypes<Ticket[], { merge: false }>()
        .then(({ data, error }) => {
          if (!controller.signal.aborted) setResult({ userId: ownerId, attempt, tickets: error ? undefined : (data ?? []).filter((ticket) => ticket.status !== "cancelled") });
        });
    }

    const channel = client.channel(`my-tickets:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    refresh();

    return () => {
      active = false;
      request?.abort();
      void client.removeChannel(channel);
    };
  }, [userId, attempt]));

  const current = result?.userId === userId && result?.attempt === attempt ? result : undefined;
  const openTicket = selected?.owner === userId ? current?.tickets?.find((ticket) => ticket.id === selected?.id) : undefined;
  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={session ? <RefreshControl refreshing={!current} onRefresh={() => setAttempt((value) => value + 1)} /> : undefined}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="ticket" size={25} color={c.red} /></View>
          <Text accessibilityRole="header" style={styles.title}>My Tickets</Text>
        </View>
        {registered === "true" && session && <Text accessibilityLiveRegion="polite" style={styles.success}>Registration successful.</Text>}
        {loading || (session && !current) ? <LoadingFeedback label="Loading tickets…" /> :
          !session ? <Text accessibilityRole="button" onPress={() => router.push("/login")}>Sign in to see your tickets.</Text> :
          !current?.tickets ? <View style={styles.empty}>
            <Ionicons name="information-circle" size={27} color={c.red} />
            <Text style={styles.emptyTitle}>Could not load tickets</Text>
            <Text>Check your connection and try again.</Text>
            <Text accessibilityRole="button" style={styles.link} onPress={() => setAttempt((value) => value + 1)}>Try again</Text>
          </View> :
          !current.tickets.length ? (
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={36} color={c.red} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text accessibilityRole="link" style={styles.link} onPress={() => router.push("/(tabs)/explore")}>Explore events</Text>
            </View>
          ) : current.tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} open={() => {
              if (userId) setSelected({ id: ticket.id, owner: userId });
            }} />
          ))}
      </ScrollView>
      {openTicket && (
        <TicketDetails key={openTicket.id} ticket={openTicket} close={() => setSelected(undefined)}
          onCancel={(eventId) => {
            setSelected(undefined);
            setCancelled({ owner: userId, eventId });
            setResult((previous) => {
              if (!previous || previous.userId !== userId) return previous;
              return { ...previous, tickets: previous.tickets?.filter((ticket) => ticket.id !== openTicket.id) };
            });
          }}
        />
      )}
      {cancelled && cancelled.owner === userId && (
        <ActionFeedback insideModal tone="success" title="Registration cancelled"
          message="Your seat is available again. You can register again if the event is still open."
          dismissLabel="Back to tickets" close={() => setCancelled(undefined)}
          actionLabel="View event" onAction={() => {
            setCancelled(undefined);
            router.push({ pathname: "/event/[id]", params: { id: cancelled.eventId } });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", gap: 16, padding: 20 },
  hero: { backgroundColor: c.gold, borderRadius: 28, padding: 16, gap: 12, flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.paper, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] },
  title: { fontSize: 32, fontWeight: "900", color: c.ink, flexShrink: 1 },
  success: { color: c.green, fontWeight: "700" },
  empty: { alignItems: "center", padding: 32, gap: 10, borderRadius: 26, backgroundColor: c.paper },
  emptyTitle: { color: c.ink, fontSize: 19, fontWeight: "800" },
  link: { color: c.red, padding: 8, fontWeight: "700" },
});
