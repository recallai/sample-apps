import { z } from "zod";

/**
 * Schema for the speaker timeline data.
 */
export const SpeakerTimelinePartSchema = z.object({
    participant: z.object({
        id: z.number().nullable(), // Recall.ai assigned participant id (e.g. 100, 200, 300)
        name: z.string().nullable(), // Display name from meeting
        is_host: z.boolean().nullable(), // True if the participant is the host
        platform: z.string().nullable(), // Meeting platform constant. values: 'desktop', 'dial-in', 'unknown'
        extra_data: z.any().nullable(), // Extra data about the participant from the meeting platform
        email: z.string().nullish(), // Email address of the participant if using Recall's calendar integration
    }),
    start_timestamp: z.object({
        absolute: z.string().nullable(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
        relative: z.number(), // Timestamp in seconds from the start of the recording
    }),
    end_timestamp: z.object({
        absolute: z.string().nullish(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
        relative: z.number().nullable(), // Timestamp in seconds from the start of the recording
    }).nullable(),
});

export type SpeakerTimelinePartType = z.infer<typeof SpeakerTimelinePartSchema>;