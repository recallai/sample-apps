import { z } from "zod";
import { CalendarSchema } from "./CalendarSchema";

export const CalendarEventSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    calendar_id: z.string(),
    meeting_url: z.string().nullable(),
    start_time: z.string(),
    end_time: z.string(),
    raw: z.any(),
    is_deleted: z.boolean(),
    bots: z.object({
        bot_id: z.string(),
        start_time: z.string(),
        deduplication_key: z.string(),
        meeting_url: z.string(),
    }).array(),
});

export type CalendarEventType = z.infer<typeof CalendarEventSchema>;
