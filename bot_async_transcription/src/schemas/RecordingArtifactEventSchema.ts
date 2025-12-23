import { z } from "zod";

export const RecordingArtifactEventSchema = z.object({
    event: z.enum([
        "recording.processing",
        "recording.done",
        "recording.failed",
        "recording.deleted",
        "recording.paused",
    ]),
    data: z.object({
        data: z.object({
            code: z.string(),
            sub_code: z.string().nullable(),
            updated_at: z.string(), // ISO 8601, e.g. "2025-12-15 00:00:00"
        }),
        recording: z.object({
            id: z.string(),
            metadata: z.record(z.string(), z.string()),
        })
    }),
});

export type RecordingArtifactEventType = z.infer<typeof RecordingArtifactEventSchema>["event"];