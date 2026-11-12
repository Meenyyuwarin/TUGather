import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { supabase, type StudentProfile } from "@/services/student-account";

type Account = {
  session: Session | null;
  loading: boolean;
  profile: StudentProfile | null;
  profileStatus: "loading" | "ready" | "error";
  reloadProfile: () => void;
};
const AccountContext = createContext<Account | null>(null);

export function StudentAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ id: string; profile: StudentProfile | null; error?: true }>();
  const userId = session?.user.id;

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const { data } = client.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      setLoading(false);
    });
    function refresh(state: string | null | undefined) {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    }
    const appState = Platform.OS === "web" ? null : AppState.addEventListener("change", refresh);
    if (appState) refresh(AppState.currentState);
    return () => {
      data.subscription.unsubscribe();
      appState?.remove();
      if (appState) client.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    const controller = new AbortController();
    void supabase.from("profiles")
      .select("display_name,student_id,campus_id,faculty_id,major,year_of_study,email,campus:campuses(name),faculty:faculties(name)")
      .eq("id", userId).abortSignal(controller.signal).maybeSingle().overrideTypes<StudentProfile>()
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        setResult({
          id: userId, profile: data ? { ...data, display_name: data.display_name ?? "", student_id: data.student_id ?? "", major: data.major ?? "" } : null,
          ...(error ? { error: true as const } : {}),
        });
      });
    return () => controller.abort();
  }, [userId, revision]);

  const current = result?.id === userId ? result : undefined;
  return (
    <AccountContext.Provider value={{
      session, loading, profile: current?.profile ?? null,
      profileStatus: loading || (userId && !current) ? "loading" : current?.error ? "error" : "ready",
      reloadProfile: () => setRevision((value) => value + 1),
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useStudentAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("Student account provider is missing.");
  return account;
}
