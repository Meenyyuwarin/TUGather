import { SafeAreaView } from "react-native-safe-area-context";

import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StudentFields } from "@/components/student-fields";
import { accountClient, cleanStudentFields, emptyStudent, errorMessage, studentFieldsComplete } from "@/services/student-account";

export default function LoginScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [creating, setCreating] = useState(false);
  const [student, setStudent] = useState(emptyStudent);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!email.trim() || !password || (creating && !studentFieldsComplete(student))) {
      setMessage(creating ? "Complete the required student and account fields." : "Enter your email and password.");
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const auth = accountClient().auth;
      if (creating) {
        const { display_name, ...fields } = cleanStudentFields(student);
        const { data, error } = await auth.signUp({
          email: email.trim(), password,
          options: { data: { ...fields, full_name: display_name } },
        });
        if (error) throw error;
        if (!data.session) {
          setCreating(false);
          setPassword("");
          setMessage("Check your email to confirm the account, then sign in here.");
          return;
        }
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      if (eventId) router.replace({ pathname: "/event/[id]", params: { id: eventId } });
      else router.replace("/(tabs)/home");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
    
          <Text style={styles.eyebrow}>YOUR CAMPUS ACCOUNT</Text>
    
          <Text style={styles.title}>{creating ? "Create account" : "Welcome back."}</Text>
          {creating && <StudentFields value={student} onChange={setStudent} />}
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
    
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
    
          <TouchableOpacity
            style={styles.button}
            onPress={submit}
            disabled={pending}
          >
            <Text style={styles.buttonText}>{pending ? "Please wait…" : creating ? "Create account" : "Sign in"}</Text>
          </TouchableOpacity>
    
          {message !== "" && <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text>}
          <TouchableOpacity disabled={pending} onPress={() => { setCreating(!creating); setMessage(""); }}>
            <Text style={styles.guest}>{creating ? "Already have an account? Sign in" : "New to TUGather? Create an account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/(tabs)/home")}>
            <Text style={styles.guest}>Explore without signing in →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F1",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  back: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B5122D",
    marginBottom: 55,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B5122D",
    letterSpacing: 2,
  },
  title: {
    fontSize: 56,
    fontWeight: "800",
    color: "#171717",
    lineHeight: 62,
    marginTop: 16,
  },
  italic: {
    fontStyle: "italic",
    fontWeight: "400",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#171717",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD8D0",
    backgroundColor: "#FFF",
    padding: 17,
    borderRadius: 4,
    fontSize: 14,
    marginBottom: 24,
    color: "#171717",
  },
  button: {
    backgroundColor: "#B5122D",
    padding: 19,
    borderRadius: 4,
    marginTop: 10,
  },
  buttonText: {
    textAlign: "center",
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1,
  },
  note: {
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    marginTop: 18,
  },
  guest: {
    textAlign: "center",
    color: "#B5122D",
    fontWeight: "700",
    marginTop: 30,
  },
});
