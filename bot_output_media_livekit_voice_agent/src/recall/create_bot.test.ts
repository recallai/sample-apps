import { describe, expect, it, vi } from "vitest";
import { build_create_bot_payload, create_recall_bot } from "./create_bot";

describe("Recall v1.11 bot creation", () => {
    it("builds the documented Output Media and recording payload", () => {
        const payload = build_create_bot_payload({
            meeting_url: "https://meet.google.com/abc-defg-hij",
            bot_name: "LiveKit Voice Agent",
            output_media_url: "https://sample.example/?session_token=signed",
        });

        expect(payload).toMatchObject({
            meeting_url: "https://meet.google.com/abc-defg-hij",
            output_media: {
                camera: {
                    kind: "webpage",
                    config: {
                        url: "https://sample.example/?session_token=signed",
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
        });
    });

    it("sends credentials only in the Authorization header", async () => {
        const fetch_fn = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify({ id: "bot-id" }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }),
        );

        const result = await create_recall_bot({
            recall_region: "us-east-1",
            recall_api_key: "secret-recall-key",
            meeting_url: "https://meet.google.com/abc-defg-hij",
            bot_name: "LiveKit Voice Agent",
            output_media_url: "https://sample.example/?session_token=signed",
            fetch_fn,
        });

        expect(result).toEqual({ id: "bot-id" });
        expect(fetch_fn).toHaveBeenCalledOnce();
        const [url, options] = fetch_fn.mock.calls[0] ?? [];
        expect(url).toBe("https://us-east-1.recall.ai/api/v1/bot/");
        expect(options?.headers).toMatchObject({
            Authorization: "secret-recall-key",
        });
        expect(options?.body).not.toContain("secret-recall-key");
    });

    it("honors Retry-After for transient bot creation failures", async () => {
        const fetch_fn = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 429,
                    headers: { "Retry-After": "2" },
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: "bot-id" }), {
                    status: 201,
                    headers: { "Content-Type": "application/json" },
                }),
            );
        const sleep_fn = vi.fn(async () => undefined);

        await create_recall_bot({
            recall_region: "us-east-1",
            recall_api_key: "secret-recall-key",
            meeting_url: "https://meet.google.com/abc-defg-hij",
            bot_name: "LiveKit Voice Agent",
            output_media_url: "https://sample.example/?session_token=signed",
            fetch_fn,
            sleep_fn,
        });

        expect(fetch_fn).toHaveBeenCalledTimes(2);
        expect(sleep_fn).toHaveBeenCalledWith(2000);
    });
});
