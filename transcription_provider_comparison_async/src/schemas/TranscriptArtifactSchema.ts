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
        download_url: z.string().url().nullable(),
        provider_data_download_url: z.string().url().nullish(),
    }),
    diarization: z.object({
        use_separate_streams_when_available: z.boolean(),
    }).nullable(),
    provider: z.record(z.string(), z.any()),
});

export type TranscriptArtifactType = z.infer<typeof TranscriptArtifactSchema>;

export function get_provider_name(transcript: TranscriptArtifactType): string {
    return Object.keys(transcript.provider)[0] ?? "unknown";
}
