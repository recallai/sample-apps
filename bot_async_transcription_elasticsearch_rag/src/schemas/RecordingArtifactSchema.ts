import { z } from "zod";
import { ParticipantEventsArtifactSchema } from "./ParticipantEventsArtifactSchema";
import { TranscriptArtifactSchema } from "./TranscriptArtifactSchema";

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
        participant_events: ParticipantEventsArtifactSchema.nullable(),
        transcript: TranscriptArtifactSchema.nullable(),
    }),
});