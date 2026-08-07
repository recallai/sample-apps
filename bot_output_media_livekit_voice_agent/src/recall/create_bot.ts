import { z } from "zod";

const create_bot_response_schema = z.object({
    id: z.string().min(1),
});

export interface BuildCreateBotPayloadArgs {
    meeting_url: string;
    bot_name: string;
    output_media_url: string;
}

export function build_create_bot_payload({
    meeting_url,
    bot_name,
    output_media_url,
}: BuildCreateBotPayloadArgs) {
    return {
        meeting_url,
        bot_name,
        join_at: null,
        output_media: {
            camera: {
                kind: "webpage",
                config: {
                    url: output_media_url,
                },
            },
        },
        recording_config: {
            include_bot_in_recording: {
                audio: true,
            },
        },
        variant: {
            zoom: "web_4_core",
            google_meet: "web_4_core",
            microsoft_teams: "web_4_core",
            webex: "web_4_core",
        },
    } as const;
}

interface CreateRecallBotArgs extends BuildCreateBotPayloadArgs {
    recall_region: string;
    recall_api_key: string;
    fetch_fn?: typeof fetch;
    sleep_fn?: (milliseconds: number) => Promise<void>;
    random_fn?: () => number;
}

const RETRYABLE_STATUSES = new Set([429, 503, 507]);
const MAX_ATTEMPTS = 3;

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function retry_delay_ms(
    response: Response,
    attempt: number,
    random_fn: () => number,
): number {
    const retry_after = response.headers.get("Retry-After");
    if (retry_after) {
        const seconds = Number(retry_after);
        if (Number.isFinite(seconds) && seconds >= 0) {
            return seconds * 1000;
        }

        const retry_at = Date.parse(retry_after);
        if (Number.isFinite(retry_at)) {
            return Math.max(0, retry_at - Date.now());
        }
    }

    const exponential_delay = Math.min(8_000, 500 * 2 ** attempt);
    return exponential_delay * (0.5 + random_fn() / 2);
}

export async function create_recall_bot({
    recall_region,
    recall_api_key,
    fetch_fn = fetch,
    sleep_fn = sleep,
    random_fn = Math.random,
    ...payload_args
}: CreateRecallBotArgs): Promise<{ id: string }> {
    const url = `https://${recall_region}.recall.ai/api/v1/bot/`;
    const request_init: RequestInit = {
        method: "POST",
        headers: {
            Authorization: recall_api_key,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(build_create_bot_payload(payload_args)),
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const response = await fetch_fn(url, request_init);

        if (response.ok) {
            return create_bot_response_schema.parse(await response.json());
        }

        const can_retry =
            RETRYABLE_STATUSES.has(response.status) &&
            attempt < MAX_ATTEMPTS - 1;
        if (!can_retry) {
            throw new Error(`Recall bot creation failed with HTTP ${response.status}`);
        }

        await sleep_fn(retry_delay_ms(response, attempt, random_fn));
    }

    throw new Error("Recall bot creation failed after retries");
}
