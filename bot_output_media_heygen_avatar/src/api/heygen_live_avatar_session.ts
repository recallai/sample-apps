import { z } from "zod";
import { env } from "./config/env";

/**
 * Create a HeyGen avatar session.
 * This is the session token that is used to start a HeyGen avatar session.
 */
export async function heygen_live_avatar_create_session(args: {
    avatar_id: string;
    voice_id: string;
    context_id: string;
}) {
    const { avatar_id, voice_id, context_id } = z.object({
        avatar_id: z.string(),
        voice_id: z.string(),
        context_id: z.string(),
    }).parse(args);

    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
        method: "POST",
        headers: {
            "X-API-KEY": env.HEYGEN_AVATAR_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            mode: "FULL",
            avatar_id,
            avatar_persona: {
                voice_id,
                context_id,
                language: "en",
            },
        }),
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        session_id: z.string(),
        session_token: z.string(),
    }).parse(await response.json());
}

/**
 * Stop a HeyGen avatar session.
 */
export async function heygen_live_avatar_stop_session(args: {
    session_token: string;
}) {
    const { session_token } = z.object({
        session_token: z.string(),
    }).parse(args);

    const response = await fetch("https://api.liveavatar.com/v1/sessions", {
        method: "DELETE",
        headers: {
            "X-API-KEY": `Bearer ${session_token}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        session_id: z.string(),
        session_token: z.string(),
    }).parse(await response.json());
}
