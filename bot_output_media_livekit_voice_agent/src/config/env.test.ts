import { describe, expect, it } from "vitest";
import {
    AgentEnvSchema,
    CreateBotEnvSchema,
    ServerEnvSchema,
} from "./EnvSchema";

const livekit_credentials = {
    LIVEKIT_URL: "wss://example.livekit.cloud",
    LIVEKIT_API_KEY: "api-key",
    LIVEKIT_API_SECRET: "api-secret",
    LIVEKIT_AGENT_NAME: "recall-livekit-voice-agent",
};

describe("environment schemas", () => {
    it("applies safe server and agent defaults", () => {
        const server_env = ServerEnvSchema.parse({
            ...livekit_credentials,
            OUTPUT_MEDIA_SIGNING_SECRET: "a".repeat(32),
        });
        const agent_env = AgentEnvSchema.parse(livekit_credentials);

        expect(server_env.PORT).toBe(4000);
        expect(server_env.LIVEKIT_TOKEN_TTL_SECONDS).toBe(600);
        expect(agent_env.LIVEKIT_STT_MODEL).toBe("deepgram/nova-3");
        expect(agent_env.LIVEKIT_LLM_MODEL).toBe("google/gemma-4-31b-it");
        expect(agent_env.LIVEKIT_TTS_MODEL).toBe("inworld/inworld-tts-2");
    });

    it("rejects weak signing secrets and non-websocket LiveKit URLs", () => {
        expect(() =>
            ServerEnvSchema.parse({
                ...livekit_credentials,
                LIVEKIT_URL: "https://example.livekit.cloud",
                OUTPUT_MEDIA_SIGNING_SECRET: "too-short",
            }),
        ).toThrow();
    });

    it("requires an HTTPS public Output Media URL", () => {
        expect(() =>
            CreateBotEnvSchema.parse({
                RECALL_REGION: "us-east-1",
                RECALL_API_KEY: "recall-key",
                MEETING_URL: "https://meet.google.com/abc-defg-hij",
                PUBLIC_BASE_URL: "http://localhost:5173",
                LIVEKIT_AGENT_NAME: "recall-livekit-voice-agent",
                OUTPUT_MEDIA_SIGNING_SECRET: "a".repeat(32),
            }),
        ).toThrow();
    });
});
