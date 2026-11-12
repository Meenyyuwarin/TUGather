import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { campusColors as c } from "@/constants/campus-theme";
import { router } from "expo-router";

import { LoadingFeedback } from "@/components/action-feedback";
import { StudentFields } from "@/components/student-fields";
import { useCheckInEvents } from "@/hooks/use-check-in-events";
import { useStudentAccount } from "@/hooks/student-account";
import { accountClient, cleanStudentFields, emptyStudent, errorMessage, studentFieldsComplete, type StudentFields as Fields, type StudentProfile } from "@/services/student-account";

function ProfileForm({ userId, initial, onSave, onCancel }: {
  userId: string;
  initial: Fields;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [student, setStudent] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    if (!studentFieldsComplete(student)) {
      setMessage("Complete the required student fields.");
      return;
    }
    setPending(true);
    try {
      const { error } = await accountClient().from("profiles")
        .update(cleanStudentFields(student)).eq("id", userId).select("id").single();
      if (error) throw error;
      onSave();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <StudentFields value={student} onChange={setStudent} />
      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" style={styles.secondary} disabled={pending} onPress={onCancel}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.save]} disabled={pending} onPress={save}>
          <Text style={styles.buttonText}>{pending ? "Saving…" : "Save profile"}</Text>
        </TouchableOpacity>
      </View>
      {message !== "" && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </>
  );
}

function StudentProfileCard({ userId, email, profile, reload }: {
  userId: string;
  email?: string;
  profile: StudentProfile | null;
  reload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const fields = [
    ["Email", email ?? profile?.email],
    ["Student ID", profile?.student_id],
    ["Main campus", profile?.campus?.name],
    ["Faculty", profile?.faculty?.name],
    ["Year of study", profile?.year_of_study],
    ["Major", profile?.major],
  ] as const;

  return (
    <View style={styles.card}>
      {editing ? (
        <>
          <Text accessibilityRole="header" style={styles.name}>Edit profile</Text>
          <ProfileForm userId={userId} initial={profile ?? emptyStudent}
            onCancel={() => setEditing(false)}
            onSave={() => { reload(); setEditing(false); setSaved(true); }}
          />
        </>
      ) : (
        <>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.name}>{profile?.display_name || "Student profile"}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.edit}
              onPress={() => { setSaved(false); setEditing(true); }}>
              <Ionicons name="pencil-outline" size={16} color={c.red} />
              <Text style={styles.secondaryText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
          {fields.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value || "Not set"}</Text>
            </View>
          ))}
          {saved && <Text accessibilityLiveRegion="polite" style={styles.success}>Profile saved.</Text>}
        </>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { session, profile, profileStatus, reloadProfile } = useStudentAccount();
  const { events: checkInEvents } = useCheckInEvents();
  const [message, setMessage] = useState("");

  async function signOut() {
    const { error } = await accountClient().auth.signOut();
    if (error) setMessage(error.message);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.icon}><Ionicons name="person" size={25} color={c.red} /></View>
          <Text accessibilityRole="header" style={styles.title}>Your Profile</Text>
        </View>
        {profileStatus === "loading" && <LoadingFeedback label="Loading account…" />}
        {profileStatus !== "loading" && !session && (
          <TouchableOpacity style={styles.button} onPress={() => router.push("/login")}>
            <Text style={styles.buttonText}>Sign in or create an account</Text>
          </TouchableOpacity>
        )}
        {session && (
          <>
            {profileStatus === "error" && <Text accessibilityRole="button" onPress={reloadProfile}>Could not load profile. Try again.</Text>}
            {profileStatus === "ready" && (
              <StudentProfileCard key={session.user.id} userId={session.user.id} email={session.user.email} profile={profile} reload={reloadProfile} />
            )}
            {checkInEvents.length > 0 && (
              <TouchableOpacity style={styles.button} onPress={() => router.push("/check-in")}>
                <Text style={styles.buttonText}>Event check-in</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={signOut}><Text style={styles.link}>Sign out</Text></TouchableOpacity>
            {message !== "" && <Text>{message}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, gap: 16 },
  title: { fontSize: 30, fontWeight: "900", color: c.ink, flexShrink: 1 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 26, backgroundColor: c.gold },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: c.paper },
  button: { backgroundColor: c.red, padding: 16, borderRadius: 24 },
  buttonText: { color: "#FFF", fontWeight: "800", textAlign: "center" },
  card: { padding: 18, gap: 12, borderRadius: 24, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line },
  cardHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: c.ink, fontSize: 22, fontWeight: "900", flexShrink: 1 },
  edit: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 22, paddingHorizontal: 13, minHeight: 44, backgroundColor: c.rose },
  row: { gap: 4, paddingTop: 10, borderTopWidth: 1, borderColor: c.line },
  label: { color: c.muted, fontSize: 12, fontWeight: "700" },
  value: { color: c.ink, fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  secondary: { flex: 1, borderRadius: 24, backgroundColor: c.rose, justifyContent: "center", alignItems: "center", padding: 16 },
  secondaryText: { color: c.red, fontWeight: "800" },
  save: { flex: 1 },
  success: { color: c.green, fontWeight: "700" },
  link: { color: c.red, fontWeight: "700", paddingVertical: 12 },
});
