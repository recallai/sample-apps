import { z } from "zod";
import { CalendarSchema, type CalendarType } from "../../schemas/CalendarArtifactSchema";
import { OAuthStateSchema } from "../../schemas/OAuthStateSchema";
import { env } from "../config/env";
import { calendars_list } from "./calendars_list";

// eslint-disable-next-line @typescript-eslint/naming-convention
const CalendarConfigSchema = CalendarSchema.pick({
    platform: true,
    oauth_client_id: true,
    oauth_client_secret: true,
    oauth_refresh_token: true,
    platform_email: true,
});
// eslint-disable-next-line @typescript-eslint/naming-convention
type CalendarConfigType = z.infer<typeof CalendarConfigSchema>;

/**
 * Retrieve the OAuth tokens from the authorization code once the user has authorized their calendar.
 * Create a calendar for this user in Recall.
 */
export async function calendar_oauth_callback(args: {
    code: string,
    state: string,
}): Promise<{ calendar: CalendarType }> {
    const {
        code: authorization_code,
        state: raw_state,
    } = z.object({ code: z.string(), state: z.string() }).parse(args);

    const { platform } = OAuthStateSchema.parse(
        JSON.parse(
            Buffer.from(raw_state, "base64").toString("utf8"),
        ),
    );

    console.log(`Received authorization code: ${authorization_code} and state: ${raw_state}`);

    let calendar_config: CalendarConfigType | null = null;
    switch (platform) {
        case "google_calendar": {
            if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) throw new Error("Google Calendar OAuth client ID or secret is not set");

            // Retrieve the OAuth tokens from the authorization code.
            console.log("Retrieving Google Calendar OAuth tokens");
            const oauth_tokens = await retrieve_google_calendar_oauth_tokens({ authorization_code });
            console.log(`Successfully retrieved Google Calendar OAuth tokens: ${JSON.stringify(oauth_tokens)}`);
            calendar_config = {
                platform: "google_calendar",
                oauth_client_id: env.GOOGLE_OAUTH_CLIENT_ID,
                oauth_client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
                oauth_refresh_token: oauth_tokens.refresh_token,
                platform_email: oauth_tokens.platform_email,
            };
            break;
        }
        case "microsoft_outlook": {
            if (!env.OUTLOOK_OAUTH_CLIENT_ID || !env.OUTLOOK_OAUTH_CLIENT_SECRET) throw new Error("Outlook Calendar OAuth client ID or secret is not set");

            // Retrieve the OAuth tokens from the authorization code.
            console.log("Retrieving Outlook Calendar OAuth tokens");
            const oauth_tokens = await retrieve_outlook_calendar_oauth_tokens({ authorization_code });
            console.log(`Successfully retrieved Outlook Calendar OAuth tokens: ${JSON.stringify(oauth_tokens)}`);
            calendar_config = {
                platform: "microsoft_outlook",
                oauth_client_id: env.OUTLOOK_OAUTH_CLIENT_ID,
                oauth_client_secret: env.OUTLOOK_OAUTH_CLIENT_SECRET,
                oauth_refresh_token: oauth_tokens.refresh_token,
                platform_email: oauth_tokens.platform_email,
            };
            break;
        }
    }
    if (!calendar_config?.oauth_refresh_token) throw new Error("No calendar config retrieved");

    // Create or reconnect a calendar for the user.
    const calendars = await calendars_list({
        platform_email: calendar_config.platform_email,
        platform: platform,
    });
    const calendar = calendars.calendars[0];
    const latest_status = calendar?.status_changes.at(-1)?.status;
    switch (latest_status) {
        // If no calendar is found, create a new one.
        case undefined: {
            const result = await create_calendar(calendar_config);
            console.log(`Successfully created ${platform} Calendar: ${JSON.stringify(result)}`);
            return { calendar: result };
        }
        // If the calendar is disconnected, reconnect it.
        case "disconnected": {
            const result = await reconnect_calendar({
                calendar_id: calendars.calendars[0].id,
                calendar_config,
            });
            console.log(`Successfully reconnected ${platform} Calendar: ${JSON.stringify(result)}`);
            return { calendar: result };
        }
        // If the calendar is connecting or connected, return the calendar.
        default: {
            console.log(`${platform} Calendar already exists and is ${latest_status}`);
            return {
                calendar: {
                    ...calendar,
                    platform_email: calendar.platform_email || calendar_config.platform_email,
                },
            };
        }
    }
}

/**
 * Retrieve the OAuth tokens from the authorization code.
 * Once the user has authorized their calendar, we can use the authorization code to retrieve the OAuth tokens.
 */
async function retrieve_google_calendar_oauth_tokens(args: {
    authorization_code: string,
}): Promise<{ access_token: string, refresh_token: string, expires_in: number, platform_email: string }> {
    const { authorization_code } = z.object({ authorization_code: z.string() }).parse(args);

    // Get the OAuth tokens from the authorization code.
    const params = {
        client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
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
    }).parse(await response.json());

    // Get the user's email from the OAuth tokens.
    const user_response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { 
            "Authorization": `Bearer ${oauth_tokens.access_token}`,
            "Content-Type": "application/json",
        },
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
}): Promise<{ access_token: string, refresh_token: string, expires_in: number, platform_email: string }> {
    const { authorization_code } = z.object({ authorization_code: z.string() }).parse(args);

    // Get the OAuth tokens from the authorization code.
    const params = {
        client_id: env.OUTLOOK_OAUTH_CLIENT_ID!,
        client_secret: env.OUTLOOK_OAUTH_CLIENT_SECRET!,
        redirect_uri: env.OUTLOOK_OAUTH_REDIRECT_URI!,
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
    }).parse(await response.json());

    // Get the user's email from the OIDC userinfo endpoint (uses the 'email' scope).
    const userinfo_response = await fetch("https://graph.microsoft.com/oidc/userinfo", {
        headers: {
            "Authorization": `Bearer ${oauth_tokens.access_token}`,
            "Content-Type": "application/json",
        },
    });
    if (!userinfo_response.ok) throw new Error(await userinfo_response.text());

    const { email: platform_email } = z.object({ email: z.string() }).parse(await userinfo_response.json());

    return { ...oauth_tokens, platform_email };
}


/**
 * Create a calendar for the user in Recall.
 */
async function create_calendar(args: CalendarConfigType) {
    const calendar_config = CalendarConfigSchema.parse(args);

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(calendar_config),
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
    calendar_config: CalendarConfigType,
}) {
    const { calendar_id, calendar_config } = z.object({
        calendar_id: z.string(),
        calendar_config: CalendarConfigSchema,
    }).parse(args);

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars/${calendar_id}`, {
        method: "PATCH",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(calendar_config),
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return CalendarSchema.parse(data);
}
