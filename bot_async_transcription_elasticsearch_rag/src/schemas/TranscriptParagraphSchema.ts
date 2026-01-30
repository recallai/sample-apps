import { z } from "zod";

export const TranscriptParagraphSchema = z.object({
  recording_id: z.string(),
  speaker: z.string().nullable(),
  paragraph: z.string(),
  start_timestamp: z.object({
    relative: z.number().nullable(),
    absolute: z.string().nullable(),
  }),
  end_timestamp: z.object({
    relative: z.number().nullable(),
    absolute: z.string().nullable(),
  }),
  duration_seconds: z.number().nullable(),
});

export type TranscriptParagraph = z.infer<typeof TranscriptParagraphSchema>