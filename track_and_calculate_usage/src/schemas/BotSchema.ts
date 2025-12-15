import { z } from "zod";

export const BotSchema = z.object({
    id: z.string(),
    status_changes: z.array(z.object({
        code: z.string(), // status code, e.g. "joining_call", "done", "fatal"
        created_at: z.string(), // ISO 8601, e.g. "2025-12-15 00:00:00"
    })),
});