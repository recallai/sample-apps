import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import {
    create_session_identity,
    type SessionIdentity,
} from "../livekit/identity";

const SESSION_TOKEN_ISSUER = "recall-livekit-voice-agent-sample";
const SESSION_TOKEN_AUDIENCE = "recall-output-media-bridge";
const SESSION_TOKEN_ALGORITHM = "HS256";

const session_claims_schema = z.object({
    session_id: z.string().uuid(),
    room_name: z.string().min(1),
    bridge_identity: z.string().min(1),
    agent_identity: z.string().min(1),
    agent_name: z.string().min(1),
});

export interface SessionClaims extends SessionIdentity {
    agent_name: string;
}

interface SignSessionTokenArgs {
    claims: SessionClaims;
    secret: string;
    ttl_seconds: number;
    now?: Date;
}

export async function sign_session_token({
    claims,
    secret,
    ttl_seconds,
    now = new Date(),
}: SignSessionTokenArgs): Promise<string> {
    const issued_at = Math.floor(now.getTime() / 1000);

    return new SignJWT({ ...claims })
        .setProtectedHeader({ alg: SESSION_TOKEN_ALGORITHM, typ: "JWT" })
        .setIssuer(SESSION_TOKEN_ISSUER)
        .setAudience(SESSION_TOKEN_AUDIENCE)
        .setIssuedAt(issued_at)
        .setExpirationTime(issued_at + ttl_seconds)
        .setJti(claims.session_id)
        .sign(new TextEncoder().encode(secret));
}

export async function verify_session_token(
    token: string,
    secret: string,
    now: Date = new Date(),
): Promise<SessionClaims> {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: [SESSION_TOKEN_ALGORITHM],
        issuer: SESSION_TOKEN_ISSUER,
        audience: SESSION_TOKEN_AUDIENCE,
        currentDate: now,
    });

    const claims = session_claims_schema.parse(payload);
    const expected_identity = create_session_identity(claims.session_id);

    if (
        claims.room_name !== expected_identity.room_name ||
        claims.bridge_identity !== expected_identity.bridge_identity ||
        claims.agent_identity !== expected_identity.agent_identity
    ) {
        throw new Error("Session token identity claims are inconsistent");
    }

    return claims;
}
