import { z } from "zod";
import { ParticipantPartSchema } from "./ParticipantPartSchema";

/**
 * Schema for a single transcript part.
 */
export const TranscriptPartSchema = z.object({
    participant: ParticipantPartSchema,
    words: z.object({
        text: z.string(),
        start_timestamp: z.object({
            relative: z.number(), // Timestamp in seconds from the start of the recording
            absolute: z.string().nullish(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
        }).nullish(),
        end_timestamp: z.object({
            relative: z.number(), // Timestamp in seconds from the start of the recording
            absolute: z.string().nullish(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
        }).nullish(),
    }).array(),
});

export type TranscriptPartType = z.infer<typeof TranscriptPartSchema>;
