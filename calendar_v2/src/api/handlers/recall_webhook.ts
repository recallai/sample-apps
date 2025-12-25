import { z } from "zod";
import { CalendarSchema, type CalendarType } from "../../schemas/CalendarArtifactSchema";
import { CalendarEventSchema, type CalendarEventType } from "../../schemas/CalendarEventArtifactSchema";
import { CalendarSyncEventsEventSchema } from "../../schemas/CalendarSyncEventsEventSchema";
import { CalendarUpdateEventSchema } from "../../schemas/CalendarUpdateEventSchema";
import { env } from "../config/env";

export async function recall_webhook(payload: any): Promise<void> {
    const { event, data } = z.union([
        CalendarUpdateEventSchema,
        CalendarSyncEventsEventSchema,
    ]).parse(payload);

    const calendar = await calendar_retrieve({ calendar_id: data.calendar_id });

    switch (event) {
        case "calendar.update": {
            console.log(`Calendar update event received: ${JSON.stringify(data)}`);
            break;
        }
        case "calendar.sync_events": {
            let next: string | null = null;
            while (next) {
                const { calendar_events, next: new_next } = await calendar_events_list({ calendar_id: data.calendar_id, next });
                for (const calendar_event of calendar_events) {
                    if (!calendar_event.meeting_url && !calendar_event.start_time) continue;
                    // Recall automatically unschedules bot if the calendar event is deleted.
                    if (calendar_event.is_deleted) continue;
                    // Handle the case if the calendar event is cancelled but not deleted by the user.

                    // Schedule a bot for the calendar event if it doesn't already have one.
                    await schedule_bot_for_calendar_event({ calendar_event, calendar });
                }
                next = new_next;
            }
            console.log(`Calendar sync events event received: ${JSON.stringify(data)}`);
            break;
        }
    }

    return;
}

/**
 * Retrieve a calendar from Recall.
 */
async function calendar_retrieve(args: { calendar_id: string, }) {
    const { calendar_id } = z.object({
        calendar_id: z.string(),
    }).parse(args);

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars/${calendar_id}`, {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });
    if (!response.ok) throw new Error(await response.text());

    return CalendarSchema.parse(await response.json());
}

/**
 * List calendar events for a given calendar from Recall.
 */
async function calendar_events_list(args: { calendar_id: string, next: string | null }) {
    const { calendar_id, next } = z.object({
        calendar_id: z.string(),
        next: z.string().nullable(),
    }).parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar_events`);
    url.searchParams.set("calendar_id", calendar_id);
    if (next) url.searchParams.set("next", next);

    const response = await fetch_with_retry(url.toString(), {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        calendar_events: CalendarEventSchema.array(),
        next: z.string().nullable(),
    }).parse(await response.json());
}

/**
 * Schedule a bot for a given calendar event.
 * It will show up in the bot list as `${calendar.platform_email}'s notetaker'`.
 */
async function schedule_bot_for_calendar_event(args: {
    calendar: CalendarType,
    calendar_event: CalendarEventType,
}) {
    const { calendar, calendar_event } = z.object({
        calendar: CalendarSchema,
        calendar_event: CalendarEventSchema,
    }).parse(args);

    const bot_deduplication_key = generate_bot_deduplication_key({
        one_bot_per: "meeting",
        email: calendar.platform_email!,
        meeting_url: calendar_event.meeting_url!,
        meeting_start_timestamp: calendar_event.start_time,
    });

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar_events/${calendar_event.id}/bot`, {
        method: "POST",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
        body: JSON.stringify({
            bot_deduplication_key,
            bot_config: {
                bot_name: `${calendar.platform_email}'s notetaker'`,
                // meeting_url and start_time is autoamtically updated by Recall when we call the schedule bot for calendar event endpoint.
            },
        }),
    });
    if (!response.ok) throw new Error(await response.text());

    return CalendarEventSchema.parse(await response.json());
}

/**
 * Generate a deduplication key for a bot based on the one_bot_per, email, meeting_url, and meeting_start_timestamp.
 */
function generate_bot_deduplication_key(args: {
    one_bot_per: "user" | "email_domain" | "meeting",
    email: string,
    meeting_url: string,
    meeting_start_timestamp: string,
}): string {
    const { one_bot_per, email, meeting_url, meeting_start_timestamp } = z.object({
        one_bot_per: z.enum(["user", "email_domain", "meeting"]),
        email: z.string(),
        meeting_url: z.string(),
        meeting_start_timestamp: z.string(),
    }).parse(args);

    switch (one_bot_per) {
        case "user":
            // Deduplicate at user level: every user who has a bot scheduled will get their own bot.
            return `${email}-${meeting_url}-${meeting_start_timestamp}`;
        case "email_domain":
            // Deduplicate at company/domain level: one shared bot for everyone from that domain on this meeting occurrence.
            return `${email.split("@")[1]}-${meeting_url}-${meeting_start_timestamp}`;
        case "meeting":
            // Deduplicate at meeting level: one bot for the entire meeting regardless of who scheduled it.
            return `${meeting_url}-${meeting_start_timestamp}`;
    }
}

/**
 * Fetch with automatic retry on 429 (rate limit) responses.
 */
async function fetch_with_retry(
    _url: string,
    _options: RequestInit,
    _max_retries: number = 3,
): Promise<Response> {
    const url = z.string().parse(_url);
    const options = z.object({ method: z.string(), headers: z.record(z.string(), z.string()), body: z.string() }).parse(_options);
    const max_retries = z.number().parse(_max_retries);

    let retries = 0;

    while (retries <= max_retries) {
        const response = await fetch(url, options);

        if (response.ok) {
            return response;
        }

        const retry_after = response.headers.get("Retry-After");
        if (response.status === 429 && retry_after && retries < max_retries) {
            const delay_seconds = parseInt(retry_after, 10);
            console.log(`Rate limited. Retrying after ${delay_seconds}s...`);
            await new Promise((resolve) => setTimeout(resolve, delay_seconds * 1000));
            retries++;
            continue;
        }

        throw new Error(await response.text());
    }

    throw new Error("Max retries exceeded");
}