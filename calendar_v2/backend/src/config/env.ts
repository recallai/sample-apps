import dotenv from "dotenv";
import { EnvSchema } from "../schemas/EnvSchema";

dotenv.config();

const env = EnvSchema.parse(process.env);

// Verify that at least one calendar is configured.
const is_google_calendar_configured = !!env.GOOGLE_OAUTH_CLIENT_ID && !!env.GOOGLE_OAUTH_CLIENT_SECRET;
const is_outlook_calendar_configured = !!env.OUTLOOK_OAUTH_CLIENT_ID && !!env.OUTLOOK_OAUTH_CLIENT_SECRET;
if (!is_google_calendar_configured && !is_outlook_calendar_configured) {
    throw new Error("No Calendar is configured. Please set one of the GOOGLE or OUTLOOK Calendar OAuth environment variables sets.");
}

if (is_google_calendar_configured) {
    if (!env.GOOGLE_OAUTH_REDIRECT_URI) {
        throw new Error("Google Calendar Redirect URI is not set");
    }
    // Verify that the redirect URI is set correctly for Google Calendar OAuth.
    if (!env.GOOGLE_OAUTH_REDIRECT_URI?.split("?")[0].endsWith("/api/calendar/oauth/callback")) {
        throw new Error(create_error_message(
            env.GOOGLE_OAUTH_REDIRECT_URI,
            "/api/calendar/oauth/callback",
        ));
    }
}

if (is_outlook_calendar_configured) {
    if (!env.OUTLOOK_OAUTH_REDIRECT_URI) {
        throw new Error("Outlook Calendar Redirect URI is not set");
    }
    // Verify that the redirect URI is set correctly for Outlook Calendar OAuth.
    if (!env.OUTLOOK_OAUTH_REDIRECT_URI?.split("?")[0].endsWith("/api/calendar/oauth/callback")) {
        throw new Error(create_error_message(
            env.OUTLOOK_OAUTH_REDIRECT_URI,
            "/api/calendar/oauth/callback",
        ));
    }
}

/**
 * Helper function to create an error message for the redirect URI verification checks.
 */
function create_error_message(redirect_uri?: string, expected_path?: string) {
    return `Calendar OAuth Redirect URI path is not correct.
Expected: "${expected_path}"
Received: "${new URL(redirect_uri ?? "").pathname}"

Make sure that your Redirect URI in your Calendar OAuth is also set to: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}${expected_path}
`;
}

export { env };