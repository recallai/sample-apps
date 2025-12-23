import { z } from "zod";

/**
 * Schema for the transcription.data event
 */
export const TranscriptDataEventSchema = z.object({
    "event": z.literal("transcript.data"),
    "data": z.object({
        "data": z.object({
            "words": z.object({
                "text": z.string(),
                "start_timestamp": z.object({
                    "relative": z.number(), // Timestamp in seconds from the start of the recording
                    "absolute": z.string().nullish(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
                }),
                "end_timestamp": z.object({
                    "relative": z.number(), // Timestamp in seconds from the start of the recording
                    "absolute": z.string().nullish(), // ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)
                }).nullish(),
            }).array(),
            "participant": z.object({
                "id": z.number(), // Recall.ai assigned participant id (e.g. 100, 200, 300)
                "name": z.string().nullable(), // Display name from meeting
                "is_host": z.boolean(), // True if the participant is the host
                "platform": z.string().nullable(), // Meeting platform constant. values: 'desktop', 'dial-in', 'unknown'
                "extra_data": z.any(), // Extra data about the participant from the meeting platform
                "email": z.string().nullish(), // Email address of the participant if using Recall's calendar integration
            }),
        }),
        "realtime_endpoint": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "transcript": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "recording": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "bot": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }).nullish(),
    }),
});
