import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.string().transform((val) => parseInt(val)).default(4000),
    RECALL_REGION: z.string(),
    RECALL_API_KEY: z.string(),
    EMBEDDING_MODEL: z.string().optional(),
});
