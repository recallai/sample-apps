import { z } from "zod";

/**
 * Schema for the OAuth state object.
 * This is passed from the OAuth calendar url to the oauth callback webhook.
 */
export const OAuthStateSchema = z.object({
    calendar_platform: z.enum(["google_calendar", "microsoft_outlook"]),
});