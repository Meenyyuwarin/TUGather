import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { campusColors as c } from "@/constants/campus-theme";
import { formatEventDate } from "@/services/event-catalog";

const monthFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", month: "long", year: "numeric",
});
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

type Props = {
  selectedDates: Date[];
  onApply: (dates: Date[]) => void;
  onClose: () => void;
};

export function EventDatePicker({ selectedDates, onApply, onClose }: Props) {
  const [month, setMonth] = useState(() => monthStart(selectedDates[0] ?? new Date()));
  const [draft, setDraft] = useState(selectedDates);
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const offset = (month.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days = Array.from({ length: offset + dayCount }, (_, index) => index - offset + 1);

  function moveMonth(direction: number) {
    setMonth(new Date(Date.UTC(year, monthIndex + direction, 1)));
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">Choose event dates</Text>
          <View style={styles.monthRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.arrow}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.month}>{monthFormat.format(month)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.arrow}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {weekdays.map((day) => (
              <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>
            ))}
            {days.map((day) => {
              if (day < 1) return <View key={day} style={styles.cell} />;
              const date = new Date(Date.UTC(year, monthIndex, day));
              const label = formatEventDate(date);
              const selected = draft.some((day) => day.getTime() === date.getTime());
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  aria-pressed={selected}
                  onPress={() => setDraft((current) => selected ? current.filter((day) => day.getTime() !== date.getTime()) : [...current, date])}
                  style={[styles.cell, selected && styles.selected]}
                >
                  <Text style={selected ? styles.selectedText : styles.day}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onApply(draft)} style={styles.apply}>
              <Text style={styles.selectedText}>{draft.length ? `Apply (${draft.length})` : "Apply"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0007", alignItems: "center", justifyContent: "center", padding: 12 },
  panel: { width: "100%", maxWidth: 380, padding: 12, borderRadius: 24, backgroundColor: c.paper },
  title: { fontSize: 18, fontWeight: "800", color: c.ink, padding: 8 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  month: { fontWeight: "700", color: c.ink },
  arrow: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 26, color: c.red },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", minHeight: 42, alignItems: "center", justifyContent: "center" },
  weekday: { fontSize: 10, fontWeight: "700", color: "#525252" },
  day: { color: c.ink },
  selected: { borderRadius: 6, backgroundColor: c.red },
  selectedText: { color: "#FFFFFF", fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  close: { padding: 12 },
  apply: { borderRadius: 22, backgroundColor: c.red, paddingHorizontal: 16, paddingVertical: 12 },
  closeText: { color: c.red, fontWeight: "800" },
});
