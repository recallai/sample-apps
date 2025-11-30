import { Buffer } from "buffer";
import crypto from "crypto";

export function verify_request_from_recall(args: {
    // Workspace verification secret                             
    secret: string,
    // Incoming request header
    headers: Record<string, string>,
    // Incoming raw request payload (if present). Use null if not applicable (e.g. GET or UPGRADE requests)
    payload: string | null,
}) {
    const { secret, headers, payload } = args;
    const msg_id = headers["webhook-id"] ?? headers["svix-id"];
    const msg_timestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
    const msg_signature = headers["webhook-signature"] ?? headers["svix-signature"];

    if (!secret || !secret.startsWith("whsec_")) {
        throw new Error(`Verification secret (${secret}is missing or invalid`);
    }
    if (!msg_id || !msg_timestamp || !msg_signature) {
        throw new Error(`Missing webhook ID (${msg_id}), timestamp (${msg_timestamp}), or signature (${msg_signature})`);
    }

    // Create the expected signature
    const prefix = "whsec_";
    const base64_part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
    const key = Buffer.from(base64_part, "base64");

    let payload_str = "";
    if (payload) {
        if (Buffer.isBuffer(payload)) {
            payload_str = payload.toString("utf8");
        } else if (typeof payload === "string") {
            payload_str = payload;
        }
    }

    const to_sign = `${msg_id}.${msg_timestamp}.${payload_str}`;
    const expected_sig = crypto
        .createHmac("sha256", key)
        .update(to_sign)
        .digest("base64");

    // Compare the expected signature to the signatures passed in the header
    const passed_sigs = msg_signature.split(" ");
    for (const versioned_sig of passed_sigs) {
        const [version, signature] = versioned_sig.split(",");
        if (version !== "v1") {
            continue;
        }
        const sig_bytes = Buffer.from(signature, "base64");
        const expected_sig_bytes = Buffer.from(expected_sig, "base64");
        if (expected_sig_bytes.length === sig_bytes.length && crypto.timingSafeEqual(new Uint8Array(expected_sig_bytes), new Uint8Array(sig_bytes))) {
            return;
        }
    }

    // If no matching signature is found, throw an error
    throw new Error("No matching signature found");
}