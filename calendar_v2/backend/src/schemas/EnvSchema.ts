import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.number().default(4000),
    RECALL_REGION: z.string(),
    RECALL_API_KEY: z.string(),

    GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
    GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),

    OUTLOOK_OAUTH_CLIENT_ID: z.string().optional(),
    OUTLOOK_OAUTH_CLIENT_SECRET: z.string().optional(),
    OUTLOOK_OAUTH_REDIRECT_URI: z.string().optional(),
});
