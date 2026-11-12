import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { fetchAvailableSeats, fetchCampuses, fetchEvents } from "@/services/event-catalog";

type Events = Awaited<ReturnType<typeof fetchEvents>>;
const emptyEvents: Events = [];

export function useEventCatalog(id?: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    id?: string;
    attempt: number;
    events?: Events;
  }>();

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    fetchEvents(controller.signal, id).then((events) => {
      if (!controller.signal.aborted) setResult({ id, attempt, events });
    }, () => {
      if (!controller.signal.aborted) setResult({ id, attempt });
    });
    return () => controller.abort();
  }, [attempt, id]));

  const current = result?.attempt === attempt && result.id === id ? result : undefined;
  const status = !current ? "loading" : current.events ? "ready" : "error";
  return {
    events: current?.events ?? emptyEvents,
    status,
    retry: () => setAttempt((value) => value + 1),
  } as const;
}

export function useAvailableSeats(id: string | undefined) {
  const [result, setResult] = useState<{ id: string; value: number | null; error?: true }>();
  useFocusEffect(useCallback(() => {
    if (!id) return;
    const controller = new AbortController();
    setResult(undefined);
    fetchAvailableSeats(id, controller.signal).then((value) => {
      if (!controller.signal.aborted) setResult({ id, value });
    }, () => {
      if (!controller.signal.aborted) setResult({ id, value: null, error: true });
    });
    return () => controller.abort();
  }, [id]));
  return result?.id === id ? result : undefined;
}

export function useCampuses() {
  const [campuses, setCampuses] = useState<string[]>([]);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    fetchCampuses(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setCampuses(rows.map((row) => row.name));
    }, () => {
      // Explore can still derive available campuses from the loaded events.
    });
    return () => controller.abort();
  }, []));
  return campuses;
}
