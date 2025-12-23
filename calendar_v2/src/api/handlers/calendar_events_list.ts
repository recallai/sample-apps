import { z } from "zod";
import { env } from "../config/env";
import { CalendarEventSchema, type CalendarEventType } from "../../schemas/CalendarEventArtifactSchema";

export async function calendar_events_list(args: {
    calendar_id: string,
    next: string | null,
    start_time__gte: string | null
    start_time__lte: string | null
}): Promise<{ calendar_events: CalendarEventType[], next: string | null }> {
    const { calendar_id, next: page_to_fetch, start_time__gte, start_time__lte } = z.object({
        calendar_id: z.string(),
        next: z.string().nullish(),
        start_time__gte: z.string().nullish(),
        start_time__lte: z.string().nullish(),
    }).parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar-events`);
    url.searchParams.set("calendar_id", calendar_id);
    if (page_to_fetch) url.searchParams.set("next", page_to_fetch);
    if (start_time__gte) url.searchParams.set("start_time__gte", start_time__gte);
    if (start_time__lte) url.searchParams.set("start_time__lte", start_time__lte);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const calendar_events = CalendarEventSchema
        .array()
        .parse(data.results)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const next = z.string().nullable().parse(data.next);

    return { calendar_events, next };
}