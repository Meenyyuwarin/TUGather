const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  dateStyle: "medium",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  timeStyle: "short",
});

export function formatEventDate(date: Date) {
  return dayFormat.format(date);
}

export function fetchCampuses(signal: AbortSignal) {
  return request<{ name: string }[]>(
    "campuses?select=name&campus_type=in.(physical,online)&is_active=eq.true&order=sort_order.asc,id.asc",
    signal,
  );
}

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  location_detail: string | null;
  capacity: number | null;
  campus: { name: string } | null;
  category: { name: string } | null;
  club: { name: string } | null;
};

async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  if (!url || !key) {
    throw new Error("Supabase connection settings are missing.");
  }
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers: { apikey: key },
    signal,
  });
  if (!response.ok) {
    throw new Error("Could not load event data. Please try again.");
  }
  return response.json();
}

export async function fetchEvents(signal: AbortSignal, id?: string) {
  const select = "id,title,description,cover_url,starts_at,ends_at,location_name,location_detail,capacity,campus:campuses(name),category:event_categories!events_category_id_fkey(name),club:clubs(name)";
  const resource = id ? "events" : "rpc/tugather_open_events";
  const filter = id ? `&status=eq.published&id=eq.${encodeURIComponent(id)}` : "";
  const rows = await request<EventRow[]>(`${resource}?select=${encodeURIComponent(select)}&order=starts_at.asc,id.asc${filter}`, signal);
  return rows.map((row) => {
    const start = new Date(row.starts_at);
    const end = new Date(row.ends_at);
    const date = formatEventDate(start);
    const endDate = formatEventDate(end);
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      image: row.cover_url ?? undefined,
      date,
      startsAt: row.starts_at,
      time: `${timeFormat.format(start)} – ${date === endDate ? "" : endDate + " "}${timeFormat.format(end)}`,
      location: [row.location_name, row.location_detail].filter(Boolean).join(" · ") || "To be announced",
      campus: row.campus?.name ?? "Unspecified campus",
      category: row.category?.name ?? "Uncategorized",
      club: row.club?.name ?? "Unspecified organizer",
      capacity: row.capacity,
    };
  });
}

export function fetchAvailableSeats(id: string, signal: AbortSignal) {
  return request<number | null>(
    `rpc/tugather_available_seats?target_event_id=${encodeURIComponent(id)}`,
    signal,
  );
}
