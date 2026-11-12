import { SafeAreaView } from "react-native-safe-area-context";

import { useState } from "react";
import { isAuthError } from "@supabase/supabase-js";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Text,
  TextInput,
  Pressable,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { campusColors as c } from "@/constants/campus-theme";
import { LoadingTicket } from "@/components/action-feedback";
import { StudentFields } from "@/components/student-fields";
import { accountClient, cleanStudentFields, emptyStudent, studentFieldsComplete } from "@/services/student-account";

function authFeedback(error: unknown, creating: boolean) {
  if (isAuthError(error)) {
    const code = error.code ?? (error.message.toLowerCase() === "invalid login credentials" ? "invalid_credentials" : undefined);
    switch (code) {
      case "invalid_credentials":
        return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบทั้งสองช่องแล้วลองอีกครั้ง";
      case "email_address_invalid":
        return "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com";
      case "email_not_confirmed":
        return "กรุณาเปิดอีเมลยืนยันบัญชีก่อนเข้าสู่ระบบ";
      case "weak_password":
        return "รหัสผ่านยังไม่รัดกุมพอ กรุณาใช้รหัสผ่านอย่างน้อย 6 ตัวอักษรและเดายากขึ้น";
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง";
    }
  }
  return creating
    ? "สร้างบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลและการเชื่อมต่อ แล้วลองอีกครั้ง"
    : "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง";
}

export default function LoginScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [creating, setCreating] = useState(false);
  const [student, setStudent] = useState(emptyStudent);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: true; field?: "email" | "password" }>();

  async function submit() {
    if (pending) return;
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setMessage({ field: "email", text: address ? "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com" : "กรุณากรอกอีเมล" });
      return;
    }
    if (!password) {
      setMessage({ field: "password", text: "กรุณากรอกรหัสผ่าน" });
      return;
    }
    if (creating && !studentFieldsComplete(student)) {
      setMessage({ text: "กรุณากรอกข้อมูลนักศึกษาในช่องที่จำเป็นให้ครบ" });
      return;
    }

    setPending(true);
    setMessage(undefined);
    try {
      const auth = accountClient().auth;
      if (creating) {
        const { display_name, ...fields } = cleanStudentFields(student);
        const { data, error } = await auth.signUp({
          email: address, password,
          options: { data: { ...fields, full_name: display_name } },
        });
        if (error) throw error;
        if (!data.session) {
          setCreating(false);
          setPassword("");
          setMessage({ text: "Check your email to confirm the account, then sign in here.", success: true });
          return;
        }
      } else {
        const { error } = await auth.signInWithPassword({ email: address, password });
        if (error) throw error;
      }
      if (eventId) router.replace({ pathname: "/event/[id]", params: { id: eventId } });
      else router.replace("/(tabs)/home");
    } catch (error) {
      setMessage({ text: authFeedback(error, creating) });
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <Pressable accessibilityRole="button" style={styles.back}
              disabled={pending} onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
              <Ionicons name="arrow-back" size={17} color={c.red} />
              <Text style={styles.link}>Back</Text>
            </Pressable>

            <View style={styles.card}>
              <View style={styles.hero}>
                <View style={styles.icon}><Ionicons name="heart" size={19} color={c.red} /></View>
                <Text style={styles.brand}>TUGather</Text>
                <Text accessibilityRole="header" style={styles.title}>{creating ? "Create account" : "Welcome back."}</Text>
              </View>

              <View style={styles.form}>
                {creating && <StudentFields value={student} onChange={setStudent} />}
                <View style={styles.field}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    accessibilityLabel="Email address"
                    autoComplete="email"
                    style={[styles.input, message?.field === "email" && styles.invalidInput]}
                    placeholder="you@example.com"
                    placeholderTextColor={c.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!pending}
                    value={email}
                    onChangeText={(value) => { setEmail(value); if (!message?.success) setMessage(undefined); }}
                  />
                  {message?.field === "email" && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{message.text}</Text>}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    accessibilityLabel="Password"
                    autoComplete={creating ? "new-password" : "current-password"}
                    style={[styles.input, message?.field === "password" && styles.invalidInput]}
                    placeholder="Enter your password"
                    placeholderTextColor={c.muted}
                    secureTextEntry
                    editable={!pending}
                    value={password}
                    onChangeText={(value) => { setPassword(value); if (!message?.success) setMessage(undefined); }}
                    onSubmitEditing={() => { void submit(); }}
                  />
                  {message?.field === "password" && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{message.text}</Text>}
                </View>
                {message && !message.field && (
                  <Text accessibilityLiveRegion="polite" style={[styles.note, message.success && styles.success]}>
                    {message.text}
                  </Text>
                )}
                <Pressable accessibilityRole="button" accessibilityState={{ busy: pending, disabled: pending }}
                  style={({ pressed }) => [styles.button, (pressed || pending) && styles.pressed]}
                  onPress={submit} disabled={pending}>
                  {pending && <LoadingTicket color={c.gold} size={18} />}
                  <Text style={styles.buttonText}>{pending ? (creating ? "Creating account…" : "Signing in…") : creating ? "Create account" : "Sign in"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.switchMode} disabled={pending}
                  onPress={() => { setCreating(!creating); setMessage(undefined); }}>
                  <Text style={styles.link}>{creating ? "Already have an account? Sign in" : "New to TUGather? Create an account"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable accessibilityRole="button" style={styles.guest} disabled={pending}
              onPress={() => router.replace("/(tabs)/home")}>
              <Text style={styles.link}>Explore without signing in</Text>
              <Ionicons name="arrow-forward" size={16} color={c.red} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.cream },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 },
  shell: { width: "100%", maxWidth: 500, alignSelf: "center", gap: 12 },
  back: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.rose },
  card: { backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, borderRadius: 28, overflow: "hidden" },
  hero: { backgroundColor: c.gold, padding: 24, gap: 6 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.paper, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  brand: { color: c.red, fontSize: 13, fontWeight: "800" },
  title: { fontSize: 34, fontWeight: "900", color: c.ink, letterSpacing: -0.8 },
  form: { padding: 24, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "800", color: c.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.line, backgroundColor: c.cream, paddingHorizontal: 14, borderRadius: 14, fontSize: 15, color: c.ink },
  invalidInput: { borderColor: c.red },
  fieldError: { color: c.red, fontSize: 13, lineHeight: 20 },
  button: { backgroundColor: c.red, minHeight: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  pressed: { opacity: 0.75 },
  buttonText: { textAlign: "center", color: c.paper, fontSize: 15, fontWeight: "800" },
  note: { padding: 12, backgroundColor: c.rose, borderRadius: 12, color: c.ink, lineHeight: 20 },
  success: { backgroundColor: c.paleGold, color: c.green },
  link: { color: c.red, fontWeight: "800", textAlign: "center" },
  switchMode: { minHeight: 44, justifyContent: "center" },
  guest: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
