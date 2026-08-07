import { randomUUID } from "node:crypto";
import { sign_session_token } from "../auth/session_token";
import { parse_create_bot_env } from "../config/env";
import { create_session_identity } from "../livekit/identity";
import { create_recall_bot } from "../recall/create_bot";

async function main(): Promise<void> {
    const env = parse_create_bot_env();
    const identity = create_session_identity(randomUUID());
    const session_token = await sign_session_token({
        claims: {
            ...identity,
            agent_name: env.LIVEKIT_AGENT_NAME,
        },
        secret: env.OUTPUT_MEDIA_SIGNING_SECRET,
        ttl_seconds: env.OUTPUT_MEDIA_SESSION_TTL_SECONDS,
    });

    const output_media_url = new URL(env.PUBLIC_BASE_URL);
    output_media_url.searchParams.set("session_token", session_token);

    const bot = await create_recall_bot({
        recall_region: env.RECALL_REGION,
        recall_api_key: env.RECALL_API_KEY,
        meeting_url: env.MEETING_URL,
        bot_name: env.BOT_NAME,
        output_media_url: output_media_url.toString(),
    });

    console.info(`Created Recall bot: ${bot.id}`);
    console.info("Open Bot Explorer to inspect the bot and access Remote DevTools.");
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Unable to create Recall bot");
    process.exitCode = 1;
});
