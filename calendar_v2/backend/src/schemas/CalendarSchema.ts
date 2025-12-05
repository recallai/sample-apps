import { z } from "zod";
import { OAuthStateSchema } from "./OAuthStateSchema";

export const CalendarSchema = z.object({
    id: z.string(),
    platform_email: z.string().nullable(),
    calendar_platform: OAuthStateSchema.shape.calendar_platform,
    status: z.enum(["connecting", "connected", "disconnected"])
});
