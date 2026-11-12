import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";

import { LoadingFeedback } from "@/components/action-feedback";
import { useEventCatalog } from "@/hooks/use-event-catalog";
import { campusColors as c } from "@/constants/campus-theme";

const photoSource = "https://commons.wikimedia.org/wiki/File:Dome_Building_TU.jpg";
const photoLicense = "https://creativecommons.org/licenses/by/4.0/";

export default function WelcomeScreen() {
  const { events, status, retry } = useEventCatalog();
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}><Ionicons name="heart" size={17} color={c.red} /></View>
            <Text style={styles.logo}><Text style={styles.red}>TU</Text>Gather</Text>
          </View>
          <View style={[styles.panel, wide && styles.wide]}>
            <View style={[styles.photo, wide && styles.photoWide]}>
              <Image source={require("../../assets/images/thammasat-dome.jpg")}
                style={styles.cover} resizeMode="cover" accessibilityLabel="ตึกโดมและอนุสาวรีย์ปรีดี พนมยงค์ มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์" />
              <LinearGradient colors={["#431C2400", "#431C24D9"]} locations={[0.52, 1]} style={styles.cover} />
              <View style={styles.location}>
                <Ionicons name="location" size={15} color={c.ink} />
                <Text style={styles.locationText}>ธรรมศาสตร์ ท่าพระจันทร์</Text>
              </View>
            </View>
            <View style={[styles.copy, wide && styles.copyWide]}>
              <View style={styles.sticker} importantForAccessibility="no">
                <Ionicons name="ticket" size={24} color={c.red} />
                <Ionicons name="sparkles" size={12} color={c.red} style={styles.sparkle} />
              </View>
              <Text accessibilityRole="header" style={[styles.title, wide && styles.titleWide]}>เจอกันที่{"\n"}<Text style={styles.red}>ธรรมศาสตร์</Text></Text>
              <Text style={styles.subtitle}>ค้นหาและสมัครกิจกรรมมหาวิทยาลัยในที่เดียว</Text>
              <View style={styles.availability}>
                {status === "loading" ? <LoadingFeedback label="กำลังโหลดกิจกรรม…" /> :
                  status === "error" ? (
                    <>
                      <Text accessibilityLiveRegion="polite" style={styles.subtitle}>โหลดกิจกรรมไม่สำเร็จ</Text>
                      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                        <Text style={styles.secondaryText}>ลองใหม่</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
                      {events.length ? `มีกิจกรรมที่เปิดรับสมัคร ${events.length} รายการ` : "ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร"}
                    </Text>
                  )}
              </View>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                  onPress={() => router.push("/login")}>
                  <Ionicons name="person-outline" size={19} color={c.paper} />
                  <Text style={styles.primaryText}>เข้าสู่ระบบหรือสร้างบัญชี</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                  onPress={() => router.replace("/(tabs)/home")}>
                  <Text style={styles.secondaryText}>ดูกิจกรรมโดยไม่เข้าสู่ระบบ</Text>
                  <Ionicons name="arrow-forward" size={17} color={c.red} />
                </Pressable>
              </View>
            </View>
          </View>
          <Text style={styles.credit}>
            <Link href={photoSource} style={styles.creditLink}>ภาพตึกโดมโดย Supanut Arunoprayote</Link>
            {" · "}
            <Link href={photoLicense} style={styles.creditLink}>CC BY 4.0</Link>
            {" · ครอบภาพให้พอดีกับหน้าจอ"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  scroll: { flexGrow: 1, justifyContent: "center" },
  content: { width: "100%", maxWidth: 1080, alignSelf: "center", padding: 20, paddingVertical: 24, gap: 13 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 23, letterSpacing: -0.6, fontWeight: "900", color: c.ink },
  red: { color: c.red },
  panel: { borderRadius: 28, overflow: "hidden", backgroundColor: c.paper, borderWidth: 1, borderColor: c.line },
  wide: { flexDirection: "row", minHeight: 430 },
  photo: { minHeight: 205, justifyContent: "flex-end", padding: 14, backgroundColor: c.rose },
  photoWide: { flex: 1.25, padding: 18 },
  cover: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  location: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, backgroundColor: c.gold, paddingHorizontal: 9, paddingVertical: 6 },
  locationText: { color: c.ink, fontWeight: "800", fontSize: 12 },
  copy: { padding: 18, gap: 10 },
  copyWide: { flex: 1, padding: 30, justifyContent: "center", gap: 13 },
  sticker: { width: 44, height: 44, borderRadius: 15, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-9deg" }] },
  sparkle: { position: "absolute", top: 3, right: 3 },
  title: { fontSize: 36, lineHeight: 47, fontWeight: "900", color: c.ink },
  titleWide: { fontSize: 45, lineHeight: 60 },
  subtitle: { fontSize: 14, color: c.muted, lineHeight: 21 },
  availability: { gap: 4 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  actions: { gap: 7, marginTop: 4 },
  primary: { minHeight: 49, borderRadius: 25, backgroundColor: c.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 11 },
  primaryText: { color: c.paper, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  secondary: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 9 },
  secondaryText: { color: c.red, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  pressed: { opacity: 0.77 },
  credit: { color: c.muted, fontSize: 11, lineHeight: 18 },
  creditLink: { color: c.muted, textDecorationLine: "underline" },
});
