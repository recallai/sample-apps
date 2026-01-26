import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.string().transform((val) => parseInt(val)).default(4000),
    MUX_ACCESS_TOKEN_ID: z.string(),
    MUX_ACCESS_TOKEN_SECRET: z.string(),
    RECALL_REGION: z.string(),
    RECALL_API_KEY: z.string(),
});
