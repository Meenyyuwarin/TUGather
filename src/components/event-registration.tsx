import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { ActionFeedback, LoadingFeedback } from "@/components/action-feedback";
import { useStudentAccount } from "@/hooks/student-account";
import { accountClient, errorMessage, studentFieldsComplete } from "@/services/student-account";

type Question = { id: string; question_text: string; question_type: string; is_required: boolean };
type Rule = { rule_type: string; operator: string; rule_value: unknown; description: string | null };
const registrationLabels = {
  approved: "Registered",
  pending: "Registration pending",
  waitlisted: "On the waitlist",
  rejected: "Registration declined",
  cancelled: "Registration cancelled",
} as const;

type RegistrationStatus = keyof typeof registrationLabels;

type Requirements = { questions: Question[]; rules: Rule[]; campusNames: Record<number, string> };

function describe(rule: Rule, campusNames: Record<number, string>) {
  if (rule.description) return rule.description;
  const values = Array.isArray(rule.rule_value) ? rule.rule_value : [rule.rule_value];
  const label = rule.rule_type === "campus" ? "Campus" : rule.rule_type === "year_of_study" ? "Year of study" : rule.rule_type.replaceAll("_", " ");
  const valuesText = values.map((value) => rule.rule_type === "campus" && typeof value === "number" ? campusNames[value] ?? String(value) : String(value)).join(", ");
  const operator = rule.operator === "gte" ? "at least " : rule.operator === "lte" ? "up to " : "";
  return `${label}: ${operator}${valuesText}`;
}

function failsStudentRule(rule: Rule, campusId: number | null, year: number | null) {
  if (rule.rule_type !== "campus" && rule.rule_type !== "year_of_study") return false;
  const actual = rule.rule_type === "campus" ? campusId : year;
  if (actual === null) return true;
  if (rule.operator === "equals") return actual !== rule.rule_value;
  if (rule.operator === "in") return !Array.isArray(rule.rule_value) || !rule.rule_value.includes(actual);
  if (typeof rule.rule_value !== "number") return true;
  return rule.operator === "gte" ? actual < rule.rule_value : actual > rule.rule_value;
}

async function loadRequirements(eventId: string, signal: AbortSignal): Promise<Requirements> {
  const client = accountClient();
  const [questions, rules, campuses] = await Promise.all([
    client.from("registration_questions").select("id,question_text,question_type,is_required").eq("event_id", eventId).order("sort_order").order("id").abortSignal(signal),
    client.from("event_eligibility_rules").select("rule_type,operator,rule_value,description").eq("event_id", eventId).eq("is_active", true).order("id").abortSignal(signal),
    client.from("campuses").select("id,name").abortSignal(signal),
  ]);
  const error = questions.error ?? rules.error ?? campuses.error;
  if (error) throw error;
  return {
    questions: questions.data ?? [],
    rules: rules.data ?? [],
    campusNames: Object.fromEntries((campuses.data ?? []).map((campus) => [campus.id, campus.name])),
  };
}

export function EventRegistration({ eventId, isFull, hasStarted }: { eventId: string; isFull: boolean; hasStarted: boolean }) {
  const { session, profile, profileStatus, reloadProfile } = useStudentAccount();
  const [requirements, setRequirements] = useState<Requirements>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string }>();
  const complete = profile && studentFieldsComplete(profile);
  const userId = session?.user.id;
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [statusResult, setStatusResult] = useState<{
    userId: string;
    eventId: string;
    attempt: number;
    status: RegistrationStatus | null;
    error?: true;
  }>();
  const currentStatus = statusResult?.userId === userId
    && statusResult?.eventId === eventId && statusResult.attempt === statusAttempt ? statusResult : undefined;

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const controller = new AbortController();
    void accountClient().from("registrations").select("status")
      .eq("event_id", eventId).eq("user_id", userId)
      .abortSignal(controller.signal).maybeSingle().overrideTypes<{ status: RegistrationStatus }>()
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        setStatusResult({
          userId, eventId, attempt: statusAttempt, status: data?.status ?? null,
          ...(error ? { error: true as const } : {}),
        });
      });
    return () => controller.abort();
  }, [eventId, statusAttempt, userId]));

  useEffect(() => {
    const controller = new AbortController();
    loadRequirements(eventId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRequirements(data);
    }, () => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [eventId, attempt]);

  async function register() {
    if (hasStarted || isFull || !requirements || !complete || !currentStatus || currentStatus.error
      || (currentStatus.status && currentStatus.status !== "cancelled")) return;
    const missing = requirements.questions.find((question) => question.is_required && !answers[question.id]?.trim());
    if (missing) {
      setFeedback({ title: "Answer required", message: missing.question_text });
      return;
    }

    setPending(true);
    setFeedback(undefined);
    try {
      const { error } = await accountClient().rpc("tugather_register", { target_event_id: eventId, answers });
      if (error) throw error;
      router.replace({ pathname: "/(tabs)/tickets", params: { registered: "true" } });
    } catch (error) {
      const message = errorMessage(error);
      if (message === "Your profile does not meet the event requirements" && profile) {
        const unmet = requirements.rules.filter((rule) => failsStudentRule(rule, profile.campus_id, profile.year_of_study));
        setFeedback({
          title: "คุณสมบัติไม่ตรงตามเงื่อนไข",
          message: unmet.length ? unmet.map((rule) => describe(rule, requirements.campusNames)).join("\n") : message,
        });
      } else {
        setFeedback({ title: "Could not register", message });
      }
    } finally {
      setPending(false);
    }
  }

  function button(label: string, onPress: () => void, disabled = false) {
    return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>;
  }

  if (userId && !currentStatus) return <LoadingFeedback label="Checking registration…" />;
  if (currentStatus?.error) return button("Could not check registration. Try again", () => setStatusAttempt((value) => value + 1));
  if (currentStatus?.status && currentStatus.status !== "cancelled") {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>{registrationLabels[currentStatus.status]}</Text>
        {currentStatus.status === "approved" && button("View my tickets", () => router.push("/(tabs)/tickets"))}
      </View>
    );
  }
  if (loadError) return button("Could not load registration. Try again", () => { setLoadError(false); setAttempt((value) => value + 1); });
  if (!requirements) return <LoadingFeedback label="Loading registration…" />;
  const textQuestions = requirements.questions.filter((question) => ["short_text", "long_text"].includes(question.question_type));
  const unsupportedRequired = requirements.questions.some((question) => question.is_required && !textQuestions.includes(question));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Registration</Text>
      {currentStatus?.status === "cancelled" && <Text>{registrationLabels.cancelled}</Text>}
      {requirements.rules.map((rule, index) => <Text key={index}>{describe(rule, requirements.campusNames)}</Text>)}
      {profileStatus === "loading" && <LoadingFeedback label="Loading account…" />}
      {profileStatus === "error" && session && button("Could not load profile. Try again", reloadProfile)}
      {!session && profileStatus === "ready" && button("Sign in to register", () => router.push({ pathname: "/login", params: { eventId } }))}
      {session && profileStatus === "ready" && !complete && button("Complete student profile", () => router.push("/(tabs)/profile"))}
      {complete && profile && (
        <>
          <Text>{profile.display_name} · {profile.student_id}</Text>
          <Text>{profile.email} · {profile.campus?.name} · Year {profile.year_of_study}</Text>
          {textQuestions.map((question) => (
            <View key={question.id}>
              <Text style={styles.label}>{question.question_text}{question.is_required ? " *" : ""}</Text>
              <TextInput
                accessibilityLabel={question.question_text}
                multiline={question.question_type === "long_text"}
                maxLength={2000}
                style={styles.input}
                value={answers[question.id] ?? ""}
                onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              />
            </View>
          ))}
          {unsupportedRequired && <Text>This event has a required question that the app cannot accept.</Text>}
          {button(pending ? "Registering…" : hasStarted ? "Event already started" : isFull ? "Event full" : "Confirm registration", register, pending || hasStarted || isFull || unsupportedRequired)}

        </>
      )}
      {pending && <LoadingFeedback label="Saving your registration…" />}
      {feedback && <ActionFeedback tone="warning" {...feedback} close={() => setFeedback(undefined)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 20 },
  heading: { fontSize: 22, fontWeight: "800", color: "#171717" },
  label: { fontWeight: "700", marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#BBB5AB", borderRadius: 5, padding: 10, color: "#171717" },
  button: { padding: 14, backgroundColor: "#B5122D", borderRadius: 4 },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#FFF", fontWeight: "800", textAlign: "center" },
});
