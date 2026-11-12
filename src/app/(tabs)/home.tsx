import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { EventCatalogStatus } from "@/components/event-catalog-status";
import { campusColors as c } from "@/constants/campus-theme";
import { useStudentAccount } from "@/hooks/student-account";
import { useEventCatalog } from "@/hooks/use-event-catalog";

export default function HomeScreen() {
  const { events, status, retry } = useEventCatalog();
  const { session, profile } = useStudentAccount();
  const [allCampusesFor, setAllCampusesFor] = useState<string>();
  const userId = session?.user.id;
  const mainCampus = profile?.campus?.name;
  const campus = userId && allCampusesFor !== userId ? mainCampus : undefined;
  const visibleEvents = campus ? events.filter((event) => event.campus === campus) : events;
  const [featured, ...more] = visibleEvents.slice(0, 3);

  function openEvent(id: string) {
    router.push({ pathname: "/event/[id]", params: { id } });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Ionicons name="heart" size={17} color={c.red} /></View>
          <Text style={styles.brandName}>TUGather</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={styles.title}>What’s happening?</Text>
            <Text style={styles.subtitle}>ค้นหากิจกรรมในรั้วธรรมศาสตร์</Text>
          </View>
          <View style={styles.sticker}>
            <Ionicons name="ticket" size={42} color={c.red} />
            <Ionicons name="sparkles" size={16} color={c.red} style={styles.sparkle} />
          </View>
          <View style={styles.scallops} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            {Array.from({ length: 8 }, (_, index) => <View key={index} style={styles.scallop} />)}
          </View>
        </View>
        <View style={styles.shortcuts}>
          <Pressable accessibilityRole="button" style={styles.shortcut} onPress={() => router.push("/(tabs)/explore")}>
            <Ionicons name="compass" size={23} color={c.red} />
            <Text style={styles.shortcutText}>Explore</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.shortcut} onPress={() => router.push("/(tabs)/tickets")}>
            <Ionicons name="ticket" size={23} color={c.red} />
            <Text style={styles.shortcutText}>My Tickets</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.section}>Featured event</Text>
        {userId && mainCampus && (
          <View style={styles.campusRow}>
            <Text style={styles.subtitle}>{campus ?? "All campuses"}</Text>
            <Pressable accessibilityRole="button" style={styles.campusToggle}
              onPress={() => setAllCampusesFor(campus ? userId : undefined)}>
              <Text style={styles.link}>{campus ? "Show all campuses" : "Use main campus"}</Text>
            </Pressable>
          </View>
        )}
        {status === "ready" && featured ? (
          <Pressable accessibilityRole="button" style={styles.featured} onPress={() => openEvent(featured.id)}>
            {featured.image && <Image source={{ uri: featured.image }} style={styles.featuredImage} />}
            <View style={styles.featuredCopy}>
              <Text style={styles.category}>{featured.category}</Text>
              <Text style={styles.eventTitle}>{featured.title}</Text>
              <Text style={styles.meta}>{featured.date} · {featured.campus}</Text>
            </View>
          </Pressable>
        ) : <EventCatalogStatus status={status} retry={retry} emptyText={campus ? `No upcoming events with open seats in ${campus}.` : "No upcoming events with open seats."} />}

        {status === "ready" && more.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text accessibilityRole="header" style={styles.section}>More events</Text>
              <Text accessibilityRole="link" style={styles.link} onPress={() => router.push("/(tabs)/explore")}>View all</Text>
            </View>
            <View style={styles.grid}>
              {more.map((event) => (
                <Pressable accessibilityRole="button" key={event.id} style={styles.tile} onPress={() => openEvent(event.id)}>
                  <View style={styles.tileImage}>
                    {event.image && <Image source={{ uri: event.image }} style={styles.fill} />}
                  </View>
                  <View style={styles.tileCopy}>
                    <Text style={styles.category}>{event.category}</Text>
                    <Text style={styles.tileTitle}>{event.title}</Text>
                    <Text style={styles.meta}>{event.date} · {event.campus}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  content: { padding: 20, gap: 16, paddingBottom: 32, width: "100%", maxWidth: 760, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: { width: 33, height: 33, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.rose },
  brandName: { fontSize: 23, fontWeight: "900", color: c.ink, letterSpacing: -0.6 },
  hero: { padding: 20, paddingBottom: 28, minHeight: 155, borderRadius: 28, backgroundColor: c.gold, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" },
  heroCopy: { flex: 1, gap: 8 },
  title: { color: c.ink, fontSize: 36, lineHeight: 38, letterSpacing: -1.4, fontWeight: "900" },
  subtitle: { color: c.ink, fontSize: 13 },
  sticker: { width: 74, height: 74, borderRadius: 26, backgroundColor: c.paper, alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] },
  sparkle: { position: "absolute", top: 7, right: 7 },
  scallops: { position: "absolute", left: 0, right: 0, bottom: -13, flexDirection: "row" },
  scallop: { flex: 1, height: 26, borderRadius: 30, backgroundColor: c.cream },
  shortcuts: { flexDirection: "row", gap: 12 },
  shortcut: { flex: 1, minHeight: 50, borderRadius: 26, backgroundColor: c.rose, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shortcutText: { color: c.red, fontWeight: "800" },
  campusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12 },
  campusToggle: { minHeight: 44, justifyContent: "center" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { fontSize: 22, fontWeight: "900", color: c.ink },
  link: { color: c.red, paddingVertical: 8, fontWeight: "800" },
  featured: { borderRadius: 25, backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, overflow: "hidden" },
  featuredImage: { width: "100%", height: 190, backgroundColor: c.rose },
  featuredCopy: { padding: 16, gap: 5 },
  category: { color: c.red, fontSize: 12, fontWeight: "800" },
  eventTitle: { fontSize: 23, fontWeight: "900", color: c.ink },
  meta: { fontSize: 12, color: c.muted, lineHeight: 18 },
  grid: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, borderRadius: 18, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, overflow: "hidden" },
  tileImage: { width: "100%", aspectRatio: 1.5, backgroundColor: c.rose },
  fill: { width: "100%", height: "100%" },
  tileCopy: { padding: 10, gap: 4 },
  tileTitle: { color: c.ink, fontWeight: "800", fontSize: 15 },
});
