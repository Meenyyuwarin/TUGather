import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";

import { accountStorage } from "./account-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key, {
  auth: {
    storage: accountStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
}) : null;

export function accountClient() {
  if (!supabase) throw new Error("Supabase connection settings are missing.");
  return supabase;
}

export type StudentFields = {
  display_name: string;
  student_id: string;
  campus_id: number | null;
  faculty_id: number | null;
  major: string;
  year_of_study: number | null;
};

export type StudentProfile = StudentFields & { email: string; campus: { name: string } | null; faculty: { name: string } | null };
export type StudentOption = { id: number; name: string };

export const emptyStudent: StudentFields = {
  display_name: "", student_id: "", campus_id: null,
  faculty_id: null, major: "", year_of_study: null,
};

export function studentFieldsComplete(student: StudentFields) {
  return Boolean(student.display_name.trim() && student.student_id.trim()
    && student.campus_id && student.faculty_id && student.year_of_study);
}

export function cleanStudentFields(student: StudentFields): StudentFields {
  return {
    display_name: student.display_name.trim(),
    student_id: student.student_id.trim(),
    campus_id: student.campus_id,
    faculty_id: student.faculty_id,
    major: student.major.trim(),
    year_of_study: student.year_of_study,
  };
}

export async function studentOptions(signal: AbortSignal) {
  const client = accountClient();
  const [campuses, faculties] = await Promise.all([
    client.from("campuses").select("id,name").eq("is_active", true).eq("campus_type", "physical").order("sort_order").abortSignal(signal),
    client.from("faculties").select("id,name").eq("is_active", true).order("sort_order").abortSignal(signal),
  ]);
  if (campuses.error || faculties.error) throw new Error("Could not load campus and faculty options.");
  return { campuses: campuses.data ?? [], faculties: faculties.data ?? [] };
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
