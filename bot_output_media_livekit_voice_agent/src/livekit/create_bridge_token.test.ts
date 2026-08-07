import { TokenVerifier } from "livekit-server-sdk";
import { describe, expect, it } from "vitest";
import { create_bridge_token } from "./create_bridge_token";
import { create_session_identity } from "./identity";

const api_key = "test-api-key";
const api_secret = "test-api-secret-that-is-long-enough";
const identity = create_session_identity(
    "b95d453e-17aa-499f-9502-411e6d0f6972",
);
const claims = {
    ...identity,
    agent_name: "recall-livekit-voice-agent",
};

describe("LiveKit bridge token", () => {
    it("uses least-privilege grants and token-based explicit dispatch", async () => {
        const details = await create_bridge_token(claims, {
            livekit_url: "wss://example.livekit.cloud",
            livekit_api_key: api_key,
            livekit_api_secret: api_secret,
            token_ttl_seconds: 600,
        });
        const verified = await new TokenVerifier(api_key, api_secret).verify(
            details.participant_token,
        );

        expect(details.server_url).toBe("wss://example.livekit.cloud");
        expect(details.agent_identity).toBe(identity.agent_identity);
        expect(verified.sub).toBe(identity.bridge_identity);
        expect(verified.video).toMatchObject({
            roomJoin: true,
            room: identity.room_name,
            canPublish: true,
            canPublishSources: ["microphone"],
            canSubscribe: true,
            canPublishData: false,
            canUpdateOwnMetadata: false,
        });
        expect(verified.roomConfig?.agents).toHaveLength(1);
        expect(verified.roomConfig?.agents[0]?.agentName).toBe(claims.agent_name);
        expect(JSON.parse(verified.roomConfig?.agents[0]?.metadata ?? "")).toEqual({
            session_id: identity.session_id,
            bridge_identity: identity.bridge_identity,
            agent_identity: identity.agent_identity,
        });
    });

    it("does not expose server credentials in connection details", async () => {
        const details = await create_bridge_token(claims, {
            livekit_url: "wss://example.livekit.cloud",
            livekit_api_key: api_key,
            livekit_api_secret: api_secret,
            token_ttl_seconds: 600,
        });

        expect(JSON.stringify(details)).not.toContain(api_secret);
        expect(JSON.stringify(details)).not.toContain(api_key);
    });
});
