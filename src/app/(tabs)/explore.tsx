import { SafeAreaView } from "react-native-safe-area-context";

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { campusColors as c } from "@/constants/campus-theme";
import { router } from "expo-router";
import { EventCatalogStatus } from "@/components/event-catalog-status";
import { EventDatePicker } from "@/components/event-date-picker";
import { useCampuses, useEventCatalog } from "@/hooks/use-event-catalog";
import { useStudentAccount } from "@/hooks/student-account";
import { formatEventDate } from "@/services/event-catalog";

const noSelections: string[] = [];

function FilterChoices({ label, options, selected, change }: {
  label: string;
  options: string[];
  selected: string[];
  change: (values: string[]) => void;
}) {
  return (
    <>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterChoices}>
        {[null, ...options].map((option) => {
          const active = option === null ? selected.length === 0 : selected.includes(option);
          return (
            <TouchableOpacity key={option ?? "all"} accessibilityRole="checkbox"
              accessibilityLabel={option ?? `All ${label.toLowerCase()}`} aria-checked={active}
              style={[styles.filterButton, active && styles.filterActive]}
              onPress={() => change(option === null ? [] : active
                ? selected.filter((value) => value !== option) : [...selected, option])}>
              {active && <Ionicons name="checkmark" color={c.paper} size={13} />}
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{option ?? "All"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

export default function ExploreScreen() {
  const { events, status, retry } = useEventCatalog();
  const campusOptions = useCampuses();
  const campuses = [...new Set([...campusOptions, ...events.map((event) => event.campus)])];
  const categories = [...new Set(events.map((event) => event.category))];
  const [search, setSearch] = useState("");
  const [dates, setDates] = useState<Date[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { session, profile } = useStudentAccount();
  const accountId = session?.user.id;
  const defaultCampus = profile?.campus?.name;
  const [campusOverride, setCampusOverride] = useState<{ accountId?: string; values: string[] }>();
  const selectedCampuses = useMemo(() => campusOverride && campusOverride.accountId === accountId
    ? campusOverride.values : defaultCampus ? [defaultCampus] : noSelections, [accountId, campusOverride, defaultCampus]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const selectedDates = new Set(dates.map(formatEventDate));

    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(keyword) ||
        event.club.toLowerCase().includes(keyword) ||
        event.category.toLowerCase().includes(keyword);

      const matchesCampus =
        !selectedCampuses.length || selectedCampuses.includes(event.campus);

      const matchesCategory =
        !selectedCategories.length || selectedCategories.includes(event.category);

      const matchesDate = !selectedDates.size || selectedDates.has(event.date);

      return matchesSearch && matchesCampus && matchesCategory && matchesDate;
    });
  }, [events, search, selectedCampuses, selectedCategories, dates]);

  function openEvent(id: string) {
    router.push({
      pathname: "/event/[id]",
      params: { id },
    });
  }

  function resetFilters() {
    setSearch("");
    setCampusOverride(undefined);
    setSelectedCategories([]);
    setDates([]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={styles.title}>Explore</Text>
            <Text style={styles.subtitle}>ค้นหากิจกรรมตามศูนย์ หมวดหมู่ หรือวันที่</Text>
          </View>
          <View style={styles.heroIcon}><Ionicons name="compass" size={34} color={c.red} /></View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color={c.red} style={styles.searchIcon} />

          <TextInput
            style={styles.searchInput}
            placeholder="Search events or clubs..."
            placeholderTextColor="#999999"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterPanel}>
          <FilterChoices label="Campus" options={campuses} selected={selectedCampuses}
            change={(values) => setCampusOverride({ accountId, values })} />
          <FilterChoices label="Categories" options={categories} selected={selectedCategories}
            change={setSelectedCategories} />
          <Text style={styles.filterLabel}>Event date</Text>
          <View style={styles.filterChoices}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose event dates"
              onPress={() => setCalendarOpen(true)}
              style={[styles.filterButton, dates.length > 0 && styles.filterActive]}>
              <Ionicons name="calendar-outline" size={16} color={dates.length ? c.paper : c.red} />
              <Text style={[styles.filterText, dates.length > 0 && styles.filterTextActive]}>
                {dates.length === 1 ? formatEventDate(dates[0]) : dates.length ? `${dates.length} dates selected` : "Choose dates"}
              </Text>
            </TouchableOpacity>
            {dates.length > 0 && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setDates([])} style={styles.filterButton}>
                <Text style={styles.filterText}>Clear dates</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {calendarOpen && (
          <EventDatePicker selectedDates={dates}
            onApply={(selected) => { setDates(selected); setCalendarOpen(false); }}
            onClose={() => setCalendarOpen(false)}
          />
        )}

        {/* RESULTS HEADER */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            Events
          </Text>

          <Text style={styles.resultsCount}>
            {filteredEvents.length} EVENTS
          </Text>
        </View>

        {/* EVENT LIST */}
        {status !== "ready" || events.length === 0 ? (
          <EventCatalogStatus status={status} retry={retry} emptyText="No upcoming events with open seats." />
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Nothing found.
            </Text>

            <Text style={styles.emptyDescription}>
              Try another search or change your filters.
            </Text>

            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>
                RESET FILTERS →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              activeOpacity={0.85}
              onPress={() => openEvent(event.id)}
            >
              <Image
                source={{ uri: event.image }}
                style={styles.eventImage}
                resizeMode="cover"
              />

              <View style={styles.eventInfo}>
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventCategory}>
                    {event.category.toUpperCase()}
                  </Text>

                </View>

                <Text style={styles.eventTitle}>
                  {event.title}
                </Text>

                <Text style={styles.clubName}>
                  BY {event.club.toUpperCase()}
                </Text>

                <View style={styles.eventFooter}>
                  <View>
                    <Text style={styles.eventDate}>
                      {event.date}
                    </Text>

                    <Text style={styles.eventCampus}>
                      {event.campus.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.eventArrow}>↗</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.cream,
  },

  content: {
    width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, paddingBottom: 36,
  },

  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 28, padding: 18, backgroundColor: c.gold, marginBottom: 16 },
  heroCopy: { flex: 1, gap: 5 },
  heroIcon: { width: 56, height: 56, borderRadius: 22, backgroundColor: c.paper, alignItems: "center", justifyContent: "center", transform: [{ rotate: "10deg" }] },
  title: { fontSize: 36, fontWeight: "900", color: c.ink },
  subtitle: { fontSize: 13, color: c.ink, lineHeight: 21 },

  searchBox: {
    borderRadius: 28,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 55,
    marginBottom: 28,
  },

  searchIcon: {
    fontSize: 27,
    color: c.red,
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.ink,
  },

  filterLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: c.ink,
    marginBottom: 12,
  },

  filterPanel: { padding: 16, borderRadius: 24, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, marginBottom: 24 },
  filterChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },

  filterButton: {
    flexDirection: "row", alignItems: "center", gap: 5, minHeight: 40,
    borderRadius: 24,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
  },

  filterActive: {
    backgroundColor: c.red,
    borderColor: c.red,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.muted,
  },

  filterTextActive: {
    color: c.paper,
  },

  resultsHeader: {
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  resultsTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: c.ink,
  },

  resultsCount: {
    fontSize: 10,
    color: c.red,
    fontWeight: "800",
  },

  eventCard: {
    borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: c.line,
    backgroundColor: c.paper,
    marginBottom: 24,
  },

  eventImage: {
    width: "100%",
    height: 195,
    backgroundColor: "#E5E0D8",
  },

  eventInfo: {
    padding: 19,
  },

  eventTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  eventCategory: {
    fontSize: 10,
    color: c.red,
    fontWeight: "800",
    letterSpacing: 1.1,
  },


  eventTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: c.ink,
    marginTop: 12,
    letterSpacing: -0.7,
  },

  clubName: {
    fontSize: 10,
    color: "#888888",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 10,
  },

  eventFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EEEAE4",
    paddingTop: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  eventDate: {
    fontSize: 11,
    fontWeight: "800",
    color: c.ink,
  },

  eventCampus: {
    fontSize: 10,
    color: "#888888",
    marginTop: 5,
  },

  eventArrow: {
    fontSize: 29,
    color: c.red,
  },

  emptyState: {
    paddingVertical: 55,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 29,
    fontWeight: "800",
    color: c.ink,
  },

  emptyDescription: {
    fontSize: 13,
    color: "#888888",
    marginTop: 12,
    textAlign: "center",
  },

  resetText: {
    color: c.red,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 24,
  },

});
