import { z } from "zod";

export const ParticipantEventsArtifactSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    status: z.object({
        code: z.enum(["processing", "done", "failed", "deleted"]),
        sub_code: z.string().nullable(),
        updated_at: z.string(),
    }),
    data: z.object({
        participants_download_url: z.url().nullable(),
        participant_events_download_url: z.url().nullable(),
        speaker_timeline_download_url: z.url().nullable(),
    }),
});