import { z } from "zod";

export const TranscriptPartSchema = z.object({
    participant: z.object({
        id: z.number().nullable(),
        name: z.string().nullable(),
        is_host: z.boolean().nullable(),
        platform: z.string().nullable(),
        extra_data: z.any().nullable(),
        email: z.string().nullish(),
    }),
    words: z.object({
        text: z.string(),
        start_timestamp: z.object({
            relative: z.number(),
            absolute: z.string().nullish(),
        }).nullish(),
        end_timestamp: z.object({
            relative: z.number(),
            absolute: z.string().nullish(),
        }).nullish(),
    }).array(),
});

export type TranscriptPartType = z.infer<typeof TranscriptPartSchema>;
