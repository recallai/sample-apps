import fs from "fs";
import path from "path";
import { cwd } from "process";
import { z } from "zod";
import { env } from "../config/env";

/**
 * After the user has authorized the app, they will be redirected to your Zoom OAuth app's redirect URI with an authorization code.
 * You can then use this authorization code to generate an access token and refresh token.
 * You can save the refresh token to a file to be used later to generate a new access token once the access token has expired.
 */
export async function zoom_oauth_callback(args: { authorization_code: string }): Promise<{
    access_token: string,
    refresh_token: string
}> {
    const { authorization_code } = z.object({ authorization_code: z.string() }).parse(args);
    const { access_token, refresh_token } = await generate_oauth_tokens_from_authorization_code({
        authorization_code,
        zoom_oauth_app_client_id: env.ZOOM_OAUTH_APP_CLIENT_ID,
        zoom_oauth_app_client_secret: env.ZOOM_OAUTH_APP_CLIENT_SECRET,
        zoom_oauth_app_redirect_uri: env.ZOOM_OAUTH_APP_REDIRECT_URI,
    });

    // Save this refresh token to be used later
    const file_path = path.join(cwd(), "/output/zoom_oauth_refresh_token.txt");
    fs.mkdirSync(path.dirname(file_path), { recursive: true });
    fs.writeFileSync(file_path, refresh_token);

    return { access_token, refresh_token };
}

/**
 * Generate Zoom OAuth access and refresh tokens from an authorization code.
 */
async function generate_oauth_tokens_from_authorization_code(args: {
    authorization_code: string,
    zoom_oauth_app_client_id: string,
    zoom_oauth_app_client_secret: string,
    zoom_oauth_app_redirect_uri: string,
}): Promise<{ access_token: string, refresh_token: string }> {
    const { authorization_code,
        zoom_oauth_app_client_id,
        zoom_oauth_app_client_secret,
        zoom_oauth_app_redirect_uri,
    } = z.object({
        authorization_code: z.string(),
        zoom_oauth_app_client_id: z.string(),
        zoom_oauth_app_client_secret: z.string(),
        zoom_oauth_app_redirect_uri: z.string(),
    }).parse(args);

    const url = new URL("https://zoom.us/oauth/token");
    url.searchParams.set("grant_type", "authorization_code");
    url.searchParams.set("code", authorization_code);
    url.searchParams.set("redirect_uri", zoom_oauth_app_redirect_uri);

    const auth_token = Buffer
        .from(`${zoom_oauth_app_client_id}:${zoom_oauth_app_client_secret}`)
        .toString("base64");
    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth_token}`,
        },
    });
    if (!response.ok) throw new Error(await response.text());

    const data = z.object({
        access_token: z.string(),
        refresh_token: z.string(),
    }).parse(await response.json());
    return { access_token: data.access_token, refresh_token: data.refresh_token };
}
