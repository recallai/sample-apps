import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.coerce.number().default(4000),
    RECALL_REGION: z.string(),
    RECALL_API_KEY: z.string(),

    HEYGEN_AVATAR_ID: z.string(),
    HEYGEN_AVATAR_VOICE_ID: z.string(),
    HEYGEN_AVATAR_CONTEXT_ID: z.string(),
    HEYGEN_AVATAR_API_KEY: z.string(),
});
