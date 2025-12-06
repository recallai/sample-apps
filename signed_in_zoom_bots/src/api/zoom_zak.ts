import fs from "fs";
import path from "path";
import { cwd } from "process";
import { z } from "zod";
import { env } from "../config/env";

/**
 * Generate a Zoom ZAK token.
 * This is the token that is used to start a Zoom meeting and/or authenticate a participant in a Zoom meeting, 
 * allowing them to join meetings as authenticated participants (e.g. signed-in users).
 * You can generate a new ZAK token as long as you have a valid access token.
 */
export async function zoom_zak(): Promise<{ zak_token: string }> {
    const { access_token } = await get_zoom_oauth_access_token();
    return await generate_zoom_zak({ access_token });
}

/**
 * Get the Zoom OAuth access token.
 * This is the token that is used to authenticate requests to the Zoom API.
 * You can generate a new access token as long as you have a valid refresh token.
 */
export async function get_zoom_oauth_access_token(): Promise<any> {
    // Get the refresh token from storage
    const file_path = path.join(cwd(), "output/zoom_oauth_refresh_token.txt");
    const refresh_token = fs.readFileSync(file_path, "utf8").trim();
    if (!refresh_token) throw new Error("No refresh token found. Generate a new one by calling the /zoom/oauth endpoint.");

    // Refresh the access token
    const basicAuth = Buffer
        .from(`${env.ZOOM_OAUTH_APP_CLIENT_ID}:${env.ZOOM_OAUTH_APP_CLIENT_SECRET}`)
        .toString("base64");
    const response = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token, }).toString(),
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        access_token: z.string(),
        refresh_token: z.string(),
    }).parse(await response.json());
}

/**
 * Generates a Zoom ZAK token.
 * This is the token that is used to start a Zoom meeting and/or authenticate a participant in a Zoom meeting, 
 * allowing them to join meetings as authenticated participants (e.g. signed-in users).
 */
const generate_zoom_zak = async (args: { access_token: string }): Promise<{ zak_token: string }> => {
    const { access_token } = z.object({ access_token: z.string() }).parse(args);
    const response = await fetch(`https://api.zoom.us/v2/users/me/token?type=zak`, {
        headers: { "Authorization": `Bearer ${access_token}`, },
    });
    if (!response.ok) throw new Error(await response.text());

    const data = z.object({ token: z.string() }).parse(await response.json());
    return { zak_token: data.token };
}
