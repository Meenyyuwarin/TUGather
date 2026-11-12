import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useStudentAccount } from "@/hooks/student-account";
import { accountClient } from "@/services/student-account";

type CheckInEvent = { id: string; title: string };

export function useCheckInEvents() {
  const { session, loading } = useStudentAccount();
  const userId = session?.user.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ userId: string; attempt: number; events?: CheckInEvent[] }>();

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const controller = new AbortController();
    void accountClient().rpc("tugather_check_in_events")
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (!controller.signal.aborted) setResult({ userId, attempt, events: !error && Array.isArray(data) ? data as CheckInEvent[] : undefined });
      });
    return () => controller.abort();
  }, [userId, attempt]));

  const current = result?.userId === userId && result?.attempt === attempt ? result : undefined;
  return {
    session,
    loading: loading || Boolean(userId && !current),
    events: current?.events ?? [],
    error: Boolean(current && !current.events),
    retry: () => setAttempt((value) => value + 1),
  };
}
