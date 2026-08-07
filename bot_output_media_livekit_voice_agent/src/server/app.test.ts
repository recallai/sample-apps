import request from "supertest";
import { describe, expect, it } from "vitest";
import { sign_session_token } from "../auth/session_token";
import { create_session_identity } from "../livekit/identity";
import { create_app, type ServerAppConfig } from "./app";

const signing_secret = "test-signing-secret-that-is-at-least-32-characters";
const config: ServerAppConfig = {
    livekit_url: "wss://example.livekit.cloud",
    livekit_api_key: "livekit-api-key",
    livekit_api_secret: "livekit-api-secret-that-is-long-enough",
    token_ttl_seconds: 600,
    output_media_signing_secret: signing_secret,
};

async function create_session_token(): Promise<string> {
    const identity = create_session_identity(
        "b95d453e-17aa-499f-9502-411e6d0f6972",
    );
    return sign_session_token({
        claims: {
            ...identity,
            agent_name: "recall-livekit-voice-agent",
        },
        secret: signing_secret,
        ttl_seconds: 60,
    });
}

describe("Express token adapter", () => {
    it("returns health without exposing configuration", async () => {
        const response = await request(create_app(config)).get("/api/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
        expect(response.text).not.toContain(config.livekit_api_secret);
    });

    it("rejects missing and invalid session tokens with safe errors", async () => {
        const app = create_app(config);
        const missing = await request(app).post("/api/livekit-token").send({});
        const invalid = await request(app)
            .post("/api/livekit-token")
            .send({ session_token: "invalid" });

        expect(missing.status).toBe(400);
        expect(invalid.status).toBe(401);
        expect(`${missing.text}${invalid.text}`).not.toContain(
            config.livekit_api_secret,
        );
        expect(`${missing.text}${invalid.text}`).not.toContain(signing_secret);
    });

    it("returns scoped connection details for a valid session", async () => {
        const response = await request(create_app(config))
            .post("/api/livekit-token")
            .send({ session_token: await create_session_token() });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            server_url: config.livekit_url,
            agent_identity:
                "voice-agent-b95d453e-17aa-499f-9502-411e6d0f6972",
        });
        expect(response.body.participant_token).toEqual(expect.any(String));
        expect(response.text).not.toContain(config.livekit_api_secret);
    });
});
