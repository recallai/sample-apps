import fs from "fs";
import http from "http";
import path from "path";
import z from "zod";
import { env } from "./config/env";

const server = http.createServer();

/**
 * Creates a new Mux live stream.
 * Source: https://mux.com/docs/api-reference/video/live-streams/create-live-stream
 */
async function create_mux_live_stream() {
    const credentials = Buffer.from(`${env.MUX_ACCESS_TOKEN_ID}:${env.MUX_ACCESS_TOKEN_SECRET}`).toString("base64");

    const response = await fetch("https://api.mux.com/video/v1/live-streams", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${credentials}`,
        },
        body: JSON.stringify({
            playback_policy: ["public"],
            latency_mode: "low",
            new_asset_settings: {
                playback_policy: ["public"],
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Mux live stream: ${response.status} ${error}`);
    }

    const { data: stream } = z.object({
        data: z.object({
            stream_key: z.string(),
            playback_ids: z.array(z.object({ id: z.string() })),
        }),
    }).parse(await response.json());

    const stream_key = stream.stream_key;
    const playback_id = stream.playback_ids[0].id;

    return {
        stream_key,
        playback_id,
        rtmp_url: `rtmps://global-live.mux.com:443/app/${stream_key}`,
        playback_url: `https://stream.mux.com/${playback_id}.m3u8`,
    };
}

/**
 * Creates a Recall bot with RTMP streaming to Mux.
 */
async function create_recall_bot(args: { meeting_url: string; rtmp_url: string }) {
    const { meeting_url, rtmp_url } = args;

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/bot/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": env.RECALL_API_KEY,
        },
        body: JSON.stringify({
            meeting_url,
            recording_config: {
                video_mixed_flv: {},
                realtime_endpoints: [
                    {
                        type: "rtmp",
                        url: rtmp_url,
                        events: ["video_mixed_flv.data"],
                    },
                ],
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Recall bot: ${response.status} ${error}`);
    }

    const bot = z.object({
        id: z.string(),
    }).parse(await response.json());

    return bot;
}

/**
 * HTTP server for handling HTTP requests.
 */
server.on("request", async (req, res) => {
    try {
        // Serve the static HTML client
        if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
            const html_path = path.join(__dirname, "client", "index.html");
            const html = fs.readFileSync(html_path, "utf-8");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return;
        }

        // Start streaming: create Mux stream + Recall bot
        if (req.method === "POST" && req.url === "/api/start") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());

            const { meeting_url } = z.object({ meeting_url: z.string() }).parse(body);

            console.log("Creating Mux live stream...");
            const stream = await create_mux_live_stream();
            console.log(`Created Mux live stream: ${stream.stream_key}`);

            console.log("Creating Recall bot...");
            const bot = await create_recall_bot({ meeting_url, rtmp_url: stream.rtmp_url });
            console.log(`Created Recall bot: ${bot.id}`);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                bot_id: bot.id,
                playback_id: stream.playback_id,
                playback_url: stream.playback_url,
            }));
            return;
        }

        // 404 for other routes
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    } catch (error) {
        console.error("Error handling request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
    }
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
});
