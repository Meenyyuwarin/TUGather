import { useState } from "react";
import type { ComponentProps } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";

import { ActionFeedback } from "@/components/action-feedback";
import { campusColors as c } from "@/constants/campus-theme";
import { formatEventDate } from "@/services/event-catalog";
import { accountClient, errorMessage } from "@/services/student-account";

type TicketEvent = {
  id: string;
  title: string;
  cover_url: string | null;
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  location_detail: string | null;
  description: string | null;
  campus: { name: string } | null;
  club: { name: string } | null;
};

export type Ticket = {
  id: string;
  ticket_code: string;
  status: "valid" | "used" | "cancelled";
  registration: { event: TicketEvent | null } | null;
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", timeStyle: "short" });
const labels = { valid: "Registered", used: "Attended", cancelled: "Cancelled" } as const;

function TicketStatus({ status }: { status: Ticket["status"] }) {
  return (
    <View style={[styles.status, status === "used" && styles.attended]}>
      <Ionicons name={status === "used" ? "checkmark-circle" : status === "cancelled" ? "close-circle-outline" : "checkmark"} size={14} color={status === "used" ? c.green : c.red} />
      <Text accessibilityLiveRegion="polite" style={[styles.statusText, status === "used" && styles.attendedText]}>{labels[status]}</Text>
    </View>
  );
}

function Perforation() {
  return (
    <View style={styles.perforation} importantForAccessibility="no-hide-descendants">
      <View style={[styles.notch, styles.leftNotch]} />
      <View style={styles.dashes} />
      <View style={[styles.notch, styles.rightNotch]} />
    </View>
  );
}

export function TicketCard({ ticket, open }: { ticket: Ticket; open: () => void }) {
  const event = ticket.registration?.event;
  const title = event?.title ?? "Event ticket";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ticket for ${title}`} onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardBody}>
        <View style={styles.thumb}>
          {event?.cover_url ?
            <Image source={{ uri: event.cover_url }} style={styles.thumbImage} /> :
            <Ionicons name="ticket" size={30} color={c.red} />}
        </View>
        <View style={styles.summary}>
          <Text style={styles.eventTitle} numberOfLines={2}>{title}</Text>
          {event && <Text style={styles.meta}>{formatEventDate(new Date(event.starts_at))}{event.campus ? `  ·  ${event.campus.name}` : ""}</Text>}
        </View>
      </View>
      <Perforation />
      <View style={styles.stub}>
        <TicketStatus status={ticket.status} />
        <View style={styles.open}>
          <Text style={styles.openText}>View ticket</Text>
          <Ionicons name="arrow-forward-circle" size={22} color={c.red} />
        </View>
      </View>
    </Pressable>
  );
}

function DetailRow({ icon, label, value }: {
  icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={18} color={c.red} /></View>
      <View style={styles.summary}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function TicketDetails({ ticket, close, onCancel }: {
  ticket: Ticket;
  close: () => void;
  onCancel: (eventId: string) => void;
}) {
  const [openedAt] = useState(Date.now);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const event = ticket.registration?.event;
  const location = event && [...new Set([event.location_name, event.location_detail, event.campus?.name].filter(Boolean))].join(" · ");
  const start = event ? new Date(event.starts_at) : null;
  const end = event ? new Date(event.ends_at) : null;
  const startDate = start && formatEventDate(start);
  const endDate = end && formatEventDate(end);

  const canCancel = ticket.status === "valid" && !!start && start.getTime() > openedAt;

  async function cancelRegistration() {
    if (!event || !canCancel || pending) return;
    setPending(true);
    setError("");
    try {
      const { error: cancelError } = await accountClient().rpc("tugather_cancel_registration", { target_event_id: event.id });
      if (cancelError) throw cancelError;
      onCancel(event.id);
      setConfirming(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={() => {
      if (pending) return;
      if (confirming) { setConfirming(false); setError(""); }
      else close();
    }}>
      <SafeAreaView style={styles.modal}>
        <ScrollView contentContainerStyle={styles.modalContent} aria-hidden={confirming} importantForAccessibility={confirming ? "no-hide-descendants" : "auto"}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to tickets" onPress={close} style={styles.back}>
            <Ionicons name="arrow-back" size={19} color={c.red} />
            <Text style={styles.openText}>My Tickets</Text>
          </Pressable>
          <View style={styles.card}>
            <View style={styles.detailHero}>
              {event?.cover_url && <Image source={{ uri: event.cover_url }} style={styles.cover} />}
              <LinearGradient
                colors={event?.cover_url ? ["#431C2433", "#431C24EE"] : [c.red, c.ink]}
                locations={[0.15, 1]}
                style={styles.cover}
              />
              <TicketStatus status={ticket.status} />
              <View style={styles.heroTitleRow}>
                <Text accessibilityRole="header" style={styles.detailTitle}>{event?.title ?? "Event ticket"}</Text>
                <View style={styles.ticketStamp} importantForAccessibility="no">
                  <Ionicons name="ticket" size={21} color={c.red} />
                </View>
              </View>
            </View>
            {event && (
              <View style={styles.detailBody}>
                <View style={styles.detailPanel}>
                  {start && end && (
                    <DetailRow icon="calendar-outline" label="Date and time"
                      value={`${startDate} · ${timeFormat.format(start)} – ${startDate === endDate ? "" : `${endDate} · `}${timeFormat.format(end)}`} />
                  )}
                  {location && <DetailRow icon="location-outline" label="Location" value={location} />}
                  {event.club && <DetailRow icon="people-outline" label="Organizer" value={event.club.name} />}
                </View>
                {event.description && (
                  <View style={styles.about}>
                    <Text accessibilityRole="header" style={styles.aboutTitle}>About this event</Text>
                    <Text style={styles.description}>{event.description}</Text>
                  </View>
                )}
              </View>
            )}
            <Perforation />
            {ticket.status === "valid" ? (
              <View style={styles.qr} accessible accessibilityLabel="Event check-in QR code">
                <View style={styles.qrHeading}>
                  <Ionicons name="qr-code-outline" size={19} color={c.red} />
                  <Text style={styles.aboutTitle}>Check-in QR</Text>
                </View>
                <View style={styles.qrPaper}><QRCode value={ticket.ticket_code} size={176} quietZone={14} ecl="M" /></View>
                <Text style={styles.meta}>Show this QR code at check-in</Text>
              </View>
            ) : (
              <Text style={styles.ticketMessage}>{ticket.status === "used" ? "This ticket has been checked in." : "This ticket was cancelled."}</Text>
            )}
          </View>
          {canCancel && (
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.keepButton}>
              <Text style={styles.openText}>Cancel registration</Text>
            </Pressable>
          )}
        </ScrollView>
        {confirming && (
          <ActionFeedback insideModal tone="warning"
            title={error ? "Could not cancel registration" : "Cancel your registration?"}
            message={error || (pending ? "Releasing your seat…" : "Your seat will be released and this QR code will stop working.")}
            busy={pending} dismissLabel={error ? "Close" : "Keep ticket"}
            close={() => { setConfirming(false); setError(""); }}
            actionLabel={error ? "Try again" : "Confirm cancellation"} onAction={cancelRegistration}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: c.paper, borderRadius: 26, borderWidth: 1, borderColor: c.line, overflow: "hidden" },
  pressed: { opacity: 0.82 },
  cardBody: { padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  thumb: { width: 64, height: 64, borderRadius: 19, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: c.gold },
  thumbImage: { width: "100%", height: "100%" },
  summary: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 20, fontWeight: "800", color: c.ink },
  meta: { fontSize: 13, color: c.muted, lineHeight: 19 },
  perforation: { height: 20, justifyContent: "center" },
  dashes: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.line, marginHorizontal: 17 },
  notch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.cream, position: "absolute" },
  leftNotch: { left: -11 },
  rightNotch: { right: -11 },
  stub: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  status: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 5, borderRadius: 20, backgroundColor: c.paleGold, paddingVertical: 5, paddingHorizontal: 9 },
  statusText: { color: c.red, fontSize: 12, fontWeight: "700" },
  attended: { backgroundColor: "#E0F2E6" },
  attendedText: { color: c.green },
  open: { flexDirection: "row", alignItems: "center", gap: 6 },
  openText: { fontSize: 13, color: c.red, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: c.cream },
  modalContent: { width: "100%", maxWidth: 600, alignSelf: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 28 },
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  detailHero: { minHeight: 196, padding: 18, gap: 54, justifyContent: "space-between", backgroundColor: c.ink },
  cover: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  heroTitleRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  ticketStamp: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] },
  detailBody: { padding: 16, gap: 12 },
  detailPanel: { backgroundColor: c.cream, borderRadius: 18, padding: 12, gap: 10, borderWidth: 1, borderColor: c.line },
  detailTitle: { flex: 1, fontSize: 30, lineHeight: 34, fontWeight: "900", color: c.paper },
  about: { gap: 4, paddingHorizontal: 3 },
  aboutTitle: { color: c.ink, fontSize: 15, fontWeight: "800" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" },
  detailValue: { color: c.ink, fontSize: 14, fontWeight: "700" },
  description: { color: c.muted, fontSize: 14, lineHeight: 21 },
  qr: { alignItems: "center", gap: 9, padding: 14, marginHorizontal: 14, marginBottom: 14, borderRadius: 18, backgroundColor: c.paleGold },
  qrHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  qrPaper: { padding: 4, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: c.line },
  keepButton: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper },
  ticketMessage: { textAlign: "center", color: c.muted, padding: 18 },
});
