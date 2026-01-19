import { z } from "zod";

export const RecordingArtifactSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    started_at: z.string(),
    completed_at: z.string().nullish(),
});