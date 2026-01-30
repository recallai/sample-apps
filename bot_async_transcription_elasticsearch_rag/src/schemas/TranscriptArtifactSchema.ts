import { z } from "zod";

export const TranscriptArtifactSchema = z.object({
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
});
