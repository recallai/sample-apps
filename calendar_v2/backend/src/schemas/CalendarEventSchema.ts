import { z } from "zod";

export const CalendarEventSchema = z.object({
    id: z.string(),
    calendar_id: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    raw: z.any(),
});

export type CalendarEventType = z.infer<typeof CalendarEventSchema>;
