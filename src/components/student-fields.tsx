import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { studentOptions, type StudentFields as Fields } from "@/services/student-account";

type Props = { value: Fields; onChange: (value: Fields) => void };

export function StudentFields({ value, onChange }: Props) {
  const [options, setOptions] = useState<Awaited<ReturnType<typeof studentOptions>>>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<"campus_id" | "faculty_id" | "year_of_study" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    studentOptions(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setOptions(rows);
    }, () => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [attempt]);

  const selects = [
    { field: "campus_id", label: "Main campus", options: options?.campuses ?? [] },
    { field: "faculty_id", label: "Faculty", options: options?.faculties ?? [] },
    { field: "year_of_study", label: "Year of study", options: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, name: String(index + 1) })) },
  ] as const;

  return (
    <View style={styles.fields}>
      {([
        ["display_name", "Full name"],
        ["student_id", "Student ID"],
        ["major", "Major (optional)"],
      ] as const).map(([field, label]) => (
        <View key={field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput accessibilityLabel={label} style={styles.input} value={value[field]} maxLength={field === "student_id" ? 30 : 120}
            onChangeText={(text) => onChange({ ...value, [field]: text })} />
        </View>
      ))}
      {error ? <Text accessibilityRole="button" onPress={() => { setError(false); setAttempt((value) => value + 1); }}>Could not load student options. Try again.</Text> :
        !options ? <Text>Loading student options…</Text> : null}
      {selects.map(({ field, label, options: choices }) => (
        <View key={field}>
          <Text style={styles.label}>{label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open === field }}
            style={styles.input} disabled={!choices.length} onPress={() => setOpen(open === field ? null : field)}>
            <Text>{choices.find((option) => option.id === value[field])?.name ?? "Choose"}</Text>
          </Pressable>
          {open === field && choices.map((option) => (
            <Pressable accessibilityRole="button" key={option.id} style={styles.choice}
              onPress={() => { onChange({ ...value, [field]: option.id }); setOpen(null); }}>
              <Text>{option.name}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 12, marginVertical: 16 },
  label: { fontWeight: "700", color: "#171717", marginBottom: 6 },
  input: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: "#BBB5AB", borderRadius: 5, padding: 10, color: "#171717" },
  choice: { minHeight: 44, justifyContent: "center", borderBottomWidth: 1, borderColor: "#E4DED5", paddingHorizontal: 10 },
});
