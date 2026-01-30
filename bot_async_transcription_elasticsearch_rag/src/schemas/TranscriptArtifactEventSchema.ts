import { z } from "zod";

export const TranscriptArtifactEventSchema = z.object({
    event: z.enum([
        "transcript.processing",
        "transcript.done",
        "transcript.failed",
        "transcript.deleted",
    ]),
    data: z.object({
        data: z.object({
            code: z.string(),
            sub_code: z.string().nullable(),
            updated_at: z.string(), // ISO 8601, e.g. "2025-12-15 00:00:00"
        }),
        transcript: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }),
        recording: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        }),
    }),
});

export type TranscriptArtifactEventType = z.infer<typeof TranscriptArtifactEventSchema>;