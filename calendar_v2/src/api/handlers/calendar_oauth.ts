import { z } from "zod";
import { OAuthStateSchema, type OAuthStateType } from "../../schemas/OAuthStateSchema";
import { env } from "../config/env";

/**
 * Generate an OAuth URL for the user to authorize their calendar.
 */
export async function calendar_oauth(args: {
    platform: OAuthStateType["platform"],
}): Promise<{ oauth_url: URL }> {
    const { platform } = z.object({ platform: OAuthStateSchema.shape.platform }).parse(args);

    const state = OAuthStateSchema.parse({
        platform,
    } satisfies OAuthStateType);

    switch (platform) {
        case "google_calendar": {
            console.log("Generating Google Calendar OAuth URL");
            const oauth_url = generate_google_calendar_oauth_url({ state });
            console.log(`Successfully generated Google Calendar OAuth URL: ${oauth_url}`);
            return { oauth_url };
        }
        case "microsoft_outlook": {
            console.log("Generating Outlook Calendar OAuth URL");
            const oauth_url = generate_outlook_calendar_oauth_url({ state });
            console.log(`Successfully generated Outlook Calendar OAuth URL: ${oauth_url}`);
            return { oauth_url };
        }
        default: {
            throw new Error("No calendar platform provided");
        }
    }
}


/**
 * Generate a Google Calendar OAuth URL for the user.
 * You can pass a custom state object to the URL to be returned in the callback.
 */
function generate_google_calendar_oauth_url(args: { state: OAuthStateType }): URL {
    const { state } = z.object({ state: OAuthStateSchema }).parse(args);
    const params = {
        client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
        response_type: "code",
        scope: [
            // Only read the user's calendar events.
            "https://www.googleapis.com/auth/calendar.events.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
        access_type: "offline",
        prompt: "consent",
        state: Buffer.from(JSON.stringify(state)).toString("base64"),
    };

    // Build the URL with the parameters.
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams(params).toString();

    return url;
}

/**
 * Generate a Microsoft Outlook OAuth URL for the user.
 * You can pass a custom state object to the URL to be returned in the callback.
 */
function generate_outlook_calendar_oauth_url(args: { state: OAuthStateType }): URL {
    const { state } = z.object({ state: OAuthStateSchema }).parse(args);
    const params = {
        client_id: env.OUTLOOK_OAUTH_CLIENT_ID!,
        redirect_uri: env.OUTLOOK_OAUTH_REDIRECT_URI!,
        response_type: "code",
        scope: "offline_access openid email https://graph.microsoft.com/Calendars.Read",
        prompt: "consent",
        state: Buffer.from(JSON.stringify(state)).toString("base64"),
    };

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.search = new URLSearchParams(params).toString();

    return url;
}
