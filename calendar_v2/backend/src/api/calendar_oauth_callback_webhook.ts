import { z } from "zod";
import { env } from "../config/env";
import { OAuthStateSchema } from "../schemas/OAuthStateSchema";
import { CalendarSchema } from "../schemas/CalendarSchema";
import { list_calendars } from "./list_calendars";

/**
 * Retrieve the OAuth tokens from the authorization code once the user has authorized their calendar.
 * Create a calendar for this user in Recall.
 */
export async function calendar_oauth_callback_webhook(args: any): Promise<{ calendar: { id: string } }> {
    const { authorization_code, b64_state } = z.object({ authorization_code: z.string(), b64_state: z.string() }).parse(args);

    const state = Buffer.from(b64_state, "base64").toString("utf8");
    const { calendar_platform } = OAuthStateSchema.parse(JSON.parse(state));

    console.log(`Received authorization code: ${authorization_code} and state: ${b64_state}`);

    switch (calendar_platform) {
        case "google_calendar": {
            // Retrieve the OAuth tokens from the authorization code.
            console.log("Retrieving Google Calendar OAuth tokens");
            const oauth_tokens = await retrieve_google_calendar_oauth_tokens({ authorization_code });
            console.log(`Successfully retrieved Google Calendar OAuth tokens: ${JSON.stringify(oauth_tokens)}`);

            // Check if a calendar already exists for the user.
            const calendars = await list_calendars({ platform_email: oauth_tokens.platform_email });
            switch (calendars.results[0]?.status) {
                case undefined: {
                    const calendar = await create_calendar({
                        calendar_platform,
                        refresh_token: oauth_tokens.refresh_token,
                        oauth_client_id: env.GOOGLE_OAUTH_CLIENT_ID,
                        oauth_client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET
                    });
                    console.log(`Successfully created Google Calendar: ${JSON.stringify(calendar)}`);
                    return { calendar }
                }
                case "disconnected": {
                    const calendar = await reconnect_calendar({
                        calendar_id: calendars.results[0].id,
                        refresh_token: oauth_tokens.refresh_token,
                    });
                    console.log(`Successfully reconnected Google Calendar: ${JSON.stringify(calendar)}`);
                    return { calendar }
                }
                case "connecting":
                case "connected": {
                    console.log(`Google Calendar already exists and is ${calendars.results[0].status}`);
                    return { calendar: calendars.results[0] };
                }
            }
        }
        case "microsoft_outlook": {
            // Retrieve the OAuth tokens from the authorization code.
            console.log("Retrieving Outlook Calendar OAuth tokens");
            const oauth_tokens = await retrieve_outlook_calendar_oauth_tokens({ authorization_code });
            console.log(`Successfully retrieved Outlook Calendar OAuth tokens: ${JSON.stringify(oauth_tokens)}`);

            // Check if a calendar already exists for the user.
            const calendars = await list_calendars({ platform_email: oauth_tokens.platform_email });
            switch (calendars.results[0]?.status) {
                case undefined: {
                    const calendar = await create_calendar({
                        calendar_platform,
                        refresh_token: oauth_tokens.refresh_token,
                        oauth_client_id: env.OUTLOOK_OAUTH_CLIENT_ID,
                        oauth_client_secret: env.OUTLOOK_OAUTH_CLIENT_SECRET
                    });
                    console.log(`Successfully created Outlook Calendar: ${JSON.stringify(calendar)}`);
                    return { calendar }
                }
                case "disconnected": {
                    const calendar = await reconnect_calendar({
                        calendar_id: calendars.results[0].id,
                        refresh_token: oauth_tokens.refresh_token,
                    });
                    console.log(`Successfully reconnected Outlook Calendar: ${JSON.stringify(calendar)}`);
                    return { calendar }
                }
                case "connecting":
                case "connected": {
                    console.log(`Outlook Calendar already exists and is ${calendars.results[0].status}`);
                    return { calendar: calendars.results[0] };
                }
            }
        }
    }
}

/*
 * Retrieve the OAuth tokens from the authorization code.
 * Once the user has authorized their calendar, we can use the authorization code to retrieve the OAuth tokens.
 */
async function retrieve_google_calendar_oauth_tokens(args: {
    authorization_code: string,
}): Promise<{ access_token: string, refresh_token: string, expires_in: number, platform_email: string }> {
    const { authorization_code } = z.object({ authorization_code: z.string() }).parse(args);

    // Get thet OAuth tokens from the authorization code.
    const params = {
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
        code: authorization_code,
    };
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(await response.text());

    const oauth_tokens = z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number(),
    }).parse(await response.json())

    // Get the user's email from the OAuth tokens.
    const user_response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${oauth_tokens.access_token}`, },
    });
    if (!user_response.ok) throw new Error(await user_response.text());

    const { email: platform_email } = z.object({ email: z.string() }).parse(await user_response.json());

    return { ...oauth_tokens, platform_email };
}

/**
 * Retrieve the OAuth tokens from the authorization code.
 * Once the user has authorized their calendar, we can use the authorization code to retrieve the OAuth tokens.
 */
async function retrieve_outlook_calendar_oauth_tokens(args: {
    authorization_code: string,
}) {
    const { authorization_code } = z.object({ authorization_code: z.string() }).parse(args);

    // Get the OAuth tokens from the authorization code.
    const params = {
        client_id: env.OUTLOOK_OAUTH_CLIENT_ID,
        client_secret: env.OUTLOOK_OAUTH_CLIENT_SECRET,
        redirect_uri: env.OUTLOOK_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
        code: authorization_code,
    };
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        body: new URLSearchParams(params),
    });
    if (!response.ok) throw new Error(await response.text());

    const oauth_tokens = z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number(),
    }).parse(await response.json())

    // Get the user's email from the OAuth tokens.
    const user_response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { "Authorization": `Bearer ${oauth_tokens.access_token}`, },
    });
    if (!user_response.ok) throw new Error(await user_response.text());

    const { mail: platform_email } = z.object({ mail: z.string() }).parse(await user_response.json());

    return { ...oauth_tokens, platform_email };
}


/**
 * Create a calendar for the user in Recall.
 */
async function create_calendar(args: {
    calendar_platform: z.infer<typeof OAuthStateSchema>["calendar_platform"],
    refresh_token: string,
    oauth_client_id: string,
    oauth_client_secret: string,
}) {
    const { calendar_platform, refresh_token, oauth_client_id, oauth_client_secret } = z.object({
        calendar_platform: OAuthStateSchema.shape.calendar_platform,
        refresh_token: z.string(),
        oauth_client_id: z.string(),
        oauth_client_secret: z.string(),
    }).parse(args);

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            platform: calendar_platform,
            oauth_refresh_token: refresh_token,
            oauth_client_id,
            oauth_client_secret,
        }),
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return CalendarSchema.parse(data);
}

/**
 * Reconnect a calendar for the user in Recall.
 */
async function reconnect_calendar(args: {
    calendar_id: string,
    refresh_token: string,
}) {
    const { calendar_id, refresh_token } = z.object({
        calendar_id: z.string(),
        refresh_token: z.string(),
    }).parse(args);

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars/${calendar_id}`, {
        method: "PATCH",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            oauth_refresh_token: refresh_token,
        }),
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return CalendarSchema.parse(data);
}
