import { z } from "zod";

/**
 * Schema for a single participant from the participants list.
 */
export const ParticipantPartSchema = z.object({
    id: z.number().nullable(),
    name: z.string().nullable(),
    is_host: z.boolean().nullable(),
    platform: z.string().nullable(),
    extra_data: z.any().nullable(),
    email: z.string().nullable(),
});

export type ParticipantPartType = z.infer<typeof ParticipantPartSchema>;
