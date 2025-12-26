import { z } from "zod";
import { OAuthStateSchema } from "./OAuthStateSchema";

export const CalendarSchema = z.object({
    id: z.string(),
    platform_email: z.string().nullable(),
    oauth_client_id: z.string().nullable(),
    oauth_client_secret: z.string().nullable(),
    oauth_refresh_token: z.string().nullable(),
    platform: OAuthStateSchema.shape.platform,
    status_changes: z.object({
        created_at: z.string(),
        status: z.enum(["connecting", "connected", "disconnected"]),
    }).array(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type CalendarType = z.infer<typeof CalendarSchema>;