// SUPPORTING — Process entry that boots the Express token server.
// Loads env and listens; no Recall / LiveKit integration logic lives here.

import { parse_server_env } from "../config/env";
import { create_app } from "./app";

const env = parse_server_env();

const app = create_app({
    livekit_url: env.LIVEKIT_URL,
    livekit_api_key: env.LIVEKIT_API_KEY,
    livekit_api_secret: env.LIVEKIT_API_SECRET,
    token_ttl_seconds: env.LIVEKIT_TOKEN_TTL_SECONDS,
    output_media_signing_secret: env.OUTPUT_MEDIA_SIGNING_SECRET,
});

app.listen(env.PORT, "0.0.0.0", () => {
    console.info(
        JSON.stringify({
            event: "server_listening",
            port: env.PORT,
        }),
    );
});
