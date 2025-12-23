import { z } from "zod";

export const RecordingArtifactSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    started_at: z.string(),
    completed_at: z.string().optional(),
    status: z.object({
        code: z.enum(["processing", "done", "failed", "deleted"]),
        sub_code: z.string().nullable(),
        updated_at: z.string(),
    }),
    media_shortcuts: z.object({
        transcript: z.object({
            id: z.string(),
            created_at: z.string(),
            status: z.object({
                code: z.enum(["processing", "done", "failed", "deleted"]),
                sub_code: z.string().nullable(),
                updated_at: z.string(),
            }),
            data: z.object({
                download_url: z.url().nullable(),
                provider_data_download_url: z.url().nullish(),
            }),
            diarization: z.object({
                use_separate_streams_when_available: z.boolean(),
            }).nullable(),
            provider: z.any(),
        }).nullable(),
    }),
});