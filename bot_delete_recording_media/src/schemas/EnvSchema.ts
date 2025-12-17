import { z } from "zod";

export const EnvSchema = z.object({
    RECALL_API_KEY: z.string(),
    RECALL_REGION: z.string(),
});