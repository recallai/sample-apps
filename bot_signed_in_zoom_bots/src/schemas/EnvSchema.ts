import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.number().default(4000),
    ZOOM_OAUTH_APP_CLIENT_ID: z.string(),
    ZOOM_OAUTH_APP_CLIENT_SECRET: z.string(),
    ZOOM_OAUTH_APP_REDIRECT_URI: z.string(),
});