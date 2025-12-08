import { z } from "zod";

/**
 * Schema for the calendar.sync_events webhook event. 
 * This is sent when a calendar event is updated for a specific calendar 
 */
export const CalendarSyncEventsPayloadSchema = z.object({
    event: z.literal("calendar.sync_events"),
    data: z.object({
        calendar_id: z.string(),
        last_updated_ts: z.string(), // iso 8601 formatted datetime

    }),
});

export type CalendarSyncEventsPayloadType = z.infer<typeof CalendarSyncEventsPayloadSchema>;