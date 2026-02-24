import { z } from "zod";
import { get_zoom_oauth_access_token } from "./zoom_join_token";

/**
 * Generate a Zoom OBF token given a meeting ID.
 */
export async function zoom_obf(args: { meeting_id: string }): Promise<{ obf_token: string }> {
    const { meeting_id } = z.object({ meeting_id: z.string() }).parse(args);
    const { access_token } = await get_zoom_oauth_access_token();
    return generate_zoom_obf({ access_token, meeting_id });
}

/**
 * Generates a Zoom OBF token.
 * This is the token that is used to join a Zoom meeting on behalf of an OAuth user.
 */
async function generate_zoom_obf(args: { access_token: string, meeting_id: string }): Promise<{ obf_token: string }> {
    const { access_token, meeting_id } = z.object({ access_token: z.string(), meeting_id: z.string() }).parse(args);
    const response = await fetch(
        `https://api.zoom.us/v2/users/me/token?type=onbehalf&meeting_id=${meeting_id}`,
        { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (!response.ok) throw new Error(await response.text());

    const data = z.object({ token: z.string() }).parse(await response.json());
    return { obf_token: data.token };
}
