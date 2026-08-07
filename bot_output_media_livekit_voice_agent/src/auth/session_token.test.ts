import { describe, expect, it } from "vitest";
import { create_session_identity } from "../livekit/identity";
import { sign_session_token, verify_session_token } from "./session_token";

const signing_secret = "test-secret-that-is-at-least-32-characters";
const session_id = "b95d453e-17aa-499f-9502-411e6d0f6972";
const identity = create_session_identity(session_id);
const claims = {
    ...identity,
    agent_name: "recall-livekit-voice-agent",
};
const now = new Date("2026-01-01T00:00:00.000Z");

describe("signed Output Media sessions", () => {
    it("signs and verifies typed claims", async () => {
        const token = await sign_session_token({
            claims,
            secret: signing_secret,
            ttl_seconds: 60,
            now,
        });

        await expect(
            verify_session_token(token, signing_secret, now),
        ).resolves.toEqual(claims);
    });

    it("rejects expired and incorrectly signed tokens", async () => {
        const token = await sign_session_token({
            claims,
            secret: signing_secret,
            ttl_seconds: 60,
            now,
        });

        await expect(
            verify_session_token(
                token,
                signing_secret,
                new Date("2026-01-01T00:01:01.000Z"),
            ),
        ).rejects.toThrow();
        await expect(
            verify_session_token(token, "different-secret-that-is-long-enough", now),
        ).rejects.toThrow();
    });

    it("rejects signed claims that violate the identity convention", async () => {
        const token = await sign_session_token({
            claims: {
                ...claims,
                room_name: "wrong-room",
            },
            secret: signing_secret,
            ttl_seconds: 60,
            now,
        });

        await expect(
            verify_session_token(token, signing_secret, now),
        ).rejects.toThrow("identity claims are inconsistent");
    });
});
