import { z } from "zod";
import { env } from "../config/env";

/**
 * Generate a Zoom OAuth authorization URL.
 * This URL will redirect the user to the Zoom OAuth authorization page where they can authorize your Zoom OAuth app.
 * Once the user has authorized the app, they will be redirected to your Zoom OAuth app's redirect URI with an authorization code.
 * You can then use this authorization code to generate an access token and refresh token.
 */
export function zoom_oauth(): string {
    const authorization_url = generateAuthorizationUrl({
        zoom_oauth_app_client_id: env.ZOOM_OAUTH_APP_CLIENT_ID,
        zoom_oauth_app_redirect_uri: env.ZOOM_OAUTH_APP_REDIRECT_URI
    });
    return authorization_url;
}

/**
 * Generates a Zoom OAuth authorization URL.
 */
const generateAuthorizationUrl = (args: { zoom_oauth_app_client_id: string, zoom_oauth_app_redirect_uri: string }): string => {
    const { zoom_oauth_app_client_id, zoom_oauth_app_redirect_uri } = z.object({
        zoom_oauth_app_client_id: z.string(),
        zoom_oauth_app_redirect_uri: z.string()
    }).parse(args);

    const url = new URL("https://zoom.us/oauth/authorize");
    url.searchParams.set("response_type", "code"); // Telling Zoom to return a code which you can exchange for the user's Zoom OAuth access/refresh tokens
    url.searchParams.set("client_id", zoom_oauth_app_client_id);
    url.searchParams.set("redirect_uri", zoom_oauth_app_redirect_uri);

    return url.toString();
}
