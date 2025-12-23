import { z } from "zod";
import { TranscriptPartSchema } from "./TranscriptPartSchema";

/**
 * Schema for the transcription.data event
 */
export const TranscriptDataEventSchema = z.object({
    event: z.literal("transcript.data"),
    data: z.object({
        data: TranscriptPartSchema,
        realtime_endpoint: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }),
        transcript: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }),
        recording: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }),
        bot: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }).nullish(),
    }),
});
