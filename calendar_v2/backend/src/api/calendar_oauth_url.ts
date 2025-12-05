import { z } from "zod";
import { env } from "../config/env";
import { OAuthStateSchema } from "../schemas/OAuthStateSchema";

/**
 * Generate an OAuth URL for the user to authorize their calendar.
 */
export async function generate_calendar_oauth_url(args: any): Promise<{ oauth_url: URL }> {
    const { calendar_platform } = z.object({
        calendar_platform: OAuthStateSchema.shape.calendar_platform,
    }).parse(args);

    switch (calendar_platform) {
        case "google_calendar": {
            console.log("Generating Google Calendar OAuth URL");
            const oauth_url = generate_google_calendar_oauth_url();
            console.log(`Successfully generated Google Calendar OAuth URL: ${oauth_url}`);
            return { oauth_url };
        }
        case "microsoft_outlook": {
            console.log("Generating Outlook Calendar OAuth URL");
            const oauth_url = generate_outlook_calendar_oauth_url();
            console.log(`Successfully generated Outlook Calendar OAuth URL: ${oauth_url}`);
            return { oauth_url };
        }
    }
}


/**
 * Generate a Google Calendar OAuth URL for the user.
 * You can pass a custom state object to the URL to be returned in the callback.
 */
function generate_google_calendar_oauth_url(): URL {
    const state = OAuthStateSchema.parse({
        calendar_platform: "google_calendar",
    } satisfies z.infer<typeof OAuthStateSchema>);
    const params = {
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        response_type: "code",
        scope: [
            // Only read the user's calendar events.
            "https://www.googleapis.com/auth/calendar.events.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
        access_type: "offline",
        prompt: "consent",
        state: Buffer.from(JSON.stringify(state)).toString("base64"),
    }

    // Build the URL with the parameters.
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams(params).toString();

    return url
}

/**
 * Generate a Microsoft Outlook OAuth URL for the user.
 * You can pass a custom state object to the URL to be returned in the callback.
 */
function generate_outlook_calendar_oauth_url(): URL {
    const state = OAuthStateSchema.parse({
        calendar_platform: "microsoft_outlook",
    } satisfies z.infer<typeof OAuthStateSchema>);
    const params = {
        client_id: env.OUTLOOK_OAUTH_CLIENT_ID,
        redirect_uri: env.OUTLOOK_OAUTH_REDIRECT_URI,
        response_type: "code",
        scope: "offline_access openid email https://graph.microsoft.com/Calendars.Read",
        access_type: "offline",
        prompt: "consent",
        state: Buffer.from(JSON.stringify(state)).toString("base64"),
    }

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.search = new URLSearchParams(params).toString();

    return url;
}
