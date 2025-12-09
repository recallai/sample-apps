import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarEventSchema } from "../../schemas/CalendarEventSchema";

export function useCalendarEvents(props: {
    calendarId: string | null,
    startTimeGte: string | null,
    startTimeLte: string | null
}) {
    const {
        calendarId,
        startTimeGte,
        startTimeLte
    } = z.object({
        calendarId: z.string(),
        startTimeGte: z.string().nullish(),
        startTimeLte: z.string().nullish(),
    }).parse(props);

    const formatDateTime = (rawDate: string) => {
        const date = new Date(rawDate);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const hour = date.getUTCHours();
        const minute = date.getUTCMinutes();
        const second = date.getUTCSeconds();
        return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
    }

    const { data } = useQuery({
        queryKey: ["calendar_events", calendarId, startTimeGte, startTimeLte],
        queryFn: async () => {
            try {
                if (!calendarId) {
                    console.log("calendar_id is required");
                    return { calendar_events: [], next: null };
                }

                const url = new URL("/api/calendar/events", window.location.origin);
                url.searchParams.set("calendar_id", calendarId);
                if (startTimeGte) url.searchParams.set("start_time__gte", formatDateTime(startTimeGte));
                if (startTimeLte) url.searchParams.set("start_time__lte", formatDateTime(startTimeLte));

                const res = await fetch(url.toString());
                if (!res.ok) {
                    throw new Error(`Failed to fetch calendar: ${res.statusText}`);
                }
                const data = z
                    .object({
                        calendar_events: CalendarEventSchema.array(),
                        next: z.string().nullable(),
                    })
                    .parse(await res.json());
                return { calendar_events: data.calendar_events, next: data.next };
            } catch (error) {
                console.error("Error fetching calendar events:", error);
                return { calendar_events: [], next: null };
            }
        },
        enabled: !!calendarId,
    });

    return { calendar_events: data?.calendar_events ?? [], next: data?.next ?? null, };
}