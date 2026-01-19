import { z } from "zod";

export const DSDKUploadArtifactSchema = z.object({
    id: z.string(),
    status: z.object({
        code: z.enum([
            "pending",
            "recording_started",
            "recording_ended",
            "uploading",
            "complete",
            "failed",
        ]),
    }),
    recording_id: z.string().nullable(),
    created_at: z.string(), // ISO 8601, e.g. "2025-12-15 00:00:00"
    metadata: z.record(z.string(), z.string()).default({}),
});