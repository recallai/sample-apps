import { z } from "zod";
import { CalendarSchema, type CalendarType } from "../../schemas/CalendarArtifactSchema";
import { CalendarEventSchema, type CalendarEventType } from "../../schemas/CalendarEventArtifactSchema";
import { CalendarSyncEventsEventSchema } from "../../schemas/CalendarSyncEventsEventSchema";
import { CalendarUpdateEventSchema } from "../../schemas/CalendarUpdateEventSchema";
import { env } from "../config/env";
import { fetch_with_retry } from "../fetch_with_retry";

export async function recall_webhook(payload: any): Promise<void> {
    const { event, data } = z.discriminatedUnion("event", [
        CalendarUpdateEventSchema,
        CalendarSyncEventsEventSchema,
    ]).parse(payload);

    const calendar = await calendar_retrieve({ calendar_id: data.calendar_id });
    console.log(`Found calendar: ${JSON.stringify(calendar)}`);

    switch (event) {
        case "calendar.update": {
            console.log(`Calendar update event received: ${JSON.stringify(data)}`);
            break;
        }
        case "calendar.sync_events": {
            let next: string | null = null;
            do {
                const { results, next: new_next } = await calendar_events_list({ calendar_id: data.calendar_id, next });
                console.log(`Received ${results.length} calendar events.`);

                for (const calendar_event of results) {
                    // Recall automatically unschedules bot if the calendar event is deleted.
                    if (calendar_event.is_deleted) continue;
                    // Skip calendar events that don't have a meeting URL or start time.
                    if (!calendar_event.meeting_url || !calendar_event.start_time) continue;
                    // Skip calendar events that have already passed.
                    if (new Date(calendar_event.start_time) <= new Date()) continue;

                    // Schedule a bot for the calendar event if it doesn't already have one.
                    await schedule_bot_for_calendar_event({ calendar_event, calendar });
                    console.log(`Scheduled bot for calendar event: ${calendar_event.id}`);
                }
                next = new_next;
            } while (next);

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
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
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

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar-events/`);
    url.searchParams.set("calendar_id", calendar_id);
    if (next) url.searchParams.set("next", next);

    const response = await fetch_with_retry(url.toString(), {
        method: "GET",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        next: z.string().nullable(),
        results: CalendarEventSchema.array(),
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

    const { deduplication_key } = generate_bot_deduplication_key({
        one_bot_per: "meeting",
        email: calendar.platform_email!,
        meeting_url: calendar_event.meeting_url!,
        meeting_start_timestamp: calendar_event.start_time,
    });

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendar-events/${calendar_event.id}/bot`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            deduplication_key,
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
}) {
    const { one_bot_per, email, meeting_url, meeting_start_timestamp } = z.object({
        one_bot_per: z.enum(["user", "email_domain", "meeting"]),
        email: z.string(),
        meeting_url: z.string(),
        meeting_start_timestamp: z.string(),
    }).parse(args);

    switch (one_bot_per) {
        case "user": {
            // Deduplicate at user level: every user who has a bot scheduled will get their own bot.
            return { deduplication_key: `${email}-${meeting_url}-${meeting_start_timestamp}` };
        }
        case "email_domain": {
            // Deduplicate at company/domain level: one shared bot for everyone from that domain on this meeting occurrence.
            return { deduplication_key: `${email.split("@")[1]}-${meeting_url}-${meeting_start_timestamp}` };
        }
        case "meeting": {
            // Deduplicate at meeting level: one bot for the entire meeting regardless of who scheduled it.
            return { deduplication_key: `${meeting_url}-${meeting_start_timestamp}` };
        }
    }
}
