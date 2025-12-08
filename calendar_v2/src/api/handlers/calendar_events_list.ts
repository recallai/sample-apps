import { z } from "zod";
import { env } from "../config/env";
import { CalendarEventSchema, type CalendarEventType } from "../../schemas/CalendarEventSchema";

export async function calendar_events_list(args: { calendar_id: string, next: string | null }): Promise<{ calendar_events: CalendarEventType[], next: string | null }> {
    const { calendar_id, next: page_to_fetch } = z.object({
        calendar_id: z.string(),
        next: z.string().nullable(),
    }).parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar_events`);
    url.searchParams.set("calendar_id", calendar_id);
    if (page_to_fetch) url.searchParams.set("next", page_to_fetch);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });

    const data = await response.json();
    const calendar_events = CalendarEventSchema.array().parse(data)
    const next = z.string().nullable().parse(data.next);

    return { calendar_events, next };
}