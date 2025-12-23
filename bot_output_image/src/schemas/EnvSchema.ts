import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.number().default(4000),
    RECALL_REGION: z.string(),
    RECALL_API_KEY: z.string(),
    MEETING_URL: z.string(),
});