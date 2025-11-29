import crypto from "crypto"
import { Buffer } from "buffer";

export const verifyRequestFromRecall = (args: {
    // Workspace verification secret                             
    secret: string,
    // Incoming request header
    headers: Record<string, string>,
    // Incoming raw request payload (if present). Use null if not applicable (e.g. GET or UPGRADE requests)
    payload: string | null,
}) => {
    const { secret, headers, payload } = args;
    const {
        "webhook-id": msgId,
        "webhook-timestamp": msgTimestamp,
        "webhook-signature": msgSignature,
    } = headers;
    if (!secret || !secret.startsWith("whsec_")) {
        throw new Error("Verification secret is missing or invalid");
    }
    if (!msgId || !msgTimestamp || !msgSignature) {
        throw new Error("Missing webhook ID, timestamp, or signature");
    }

    // Create the expected signature
    const prefix = "whsec_";
    const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
    const key = Buffer.from(base64Part, "base64");

    let payloadStr = '';
    if (payload) {
        if (Buffer.isBuffer(payload)) {
            payloadStr = payload.toString("utf8");
        } else if (typeof payload === 'string') {
            payloadStr = payload;
        }
    }

    const toSign = `${msgId}.${msgTimestamp}.${payloadStr}`;
    const expectedSig = crypto
        .createHmac("sha256", key)
        .update(toSign)
        .digest("base64");

    // Compare the expected signature to the signatures passed in the header
    const passedSigs = msgSignature.split(" ")
    for (const versionedSig of passedSigs) {
        const [version, signature] = versionedSig.split(",")
        if (version != "v1") {
            continue
        }
        const sigBytes = Buffer.from(signature, 'base64')
        const expectedSigBytes = Buffer.from(expectedSig, 'base64')
        if (expectedSigBytes.length === sigBytes.length && crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))) {
            return
        }
    }

    // If no matching signature is found, throw an error
    throw new Error("No matching signature found");
}