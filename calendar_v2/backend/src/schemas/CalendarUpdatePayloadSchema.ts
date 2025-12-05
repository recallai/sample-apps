import { z } from "zod";

/**
 * Schema for the calendar.update webhook event. 
 * This is sent when a calendar is connected or disconnected in Recall.
 */
export const CalendarUpdatePayloadSchema = z.object({
    event: z.literal("calendar.update"),
    data: z.object({
        calendar_id: z.string(),
    }),
});