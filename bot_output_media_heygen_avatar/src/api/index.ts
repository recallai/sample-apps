import http from "http";
import { WebSocketServer } from "ws";
import { env } from "./config/env";
import { heygen_live_avatar_create_session, heygen_live_avatar_stop_session } from "./heygen_live_avatar_session";

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests from Recall.ai
 */
server.on("request", async (req, res) => {
    try {
        // Parse the request
        const url = new URL(`https://${req.headers.host?.replace("https://", "")}${req.url}`);
        const pathname = url.pathname.at(-1) === "/" ? url.pathname.slice(0, -1) : url.pathname;
        const search_params = Object.fromEntries(url.searchParams.entries()) as any;
        let body: any | null = null;
        try {
            if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method!)) {
                const body_chunks: Buffer[] = [];
                for await (const chunk of req) {
                    body_chunks.push(chunk);
                }
                const raw_body = Buffer.concat(body_chunks).toString("utf-8");
                if (raw_body.trim()) body = JSON.parse(raw_body);
            }
        } catch (error) {
            console.log("Error parsing body", error);
        }

        console.log(`
Incoming HTTP request: ${req.method} ${pathname} 
search_params=${JSON.stringify(search_params)} 
body=${JSON.stringify(body)}
        `);

        switch (pathname) {
            case "/api/session": {
                switch (req.method) {
                    case "POST": {
                        const { session_id, session_token } = await heygen_live_avatar_create_session({
                            avatar_id: env.HEYGEN_AVATAR_ID,
                            voice_id: env.HEYGEN_AVATAR_VOICE_ID,
                            context_id: env.HEYGEN_AVATAR_CONTEXT_ID,
                        });
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ session_id, session_token }));
                        return;
                    }
                    case "DELETE": {
                        const { session_id, session_token } = await heygen_live_avatar_stop_session(
                            search_params,
                        );
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ session_id, session_token }));
                        return;
                    }
                }
                break;
            }

            /** Default endpoints */
            default: {
                if (url.pathname.startsWith("/api/")) {
                    throw new Error(`Endpoint not found: ${req.method} ${url.pathname}`);
                } else {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end(Buffer.from(""));
                    return;
                }
            }
        }
    } catch (error) {
        console.error(`${req.method} ${req.url}`, error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : error }));
    }
});

/**
 * WebSocket server for handling WebSocket requests from Recall.ai
 */
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (socket) => {
    socket.on("message", (raw_msg) => {
        console.log("Message received", raw_msg.toString());
    });

    socket.on("close", () => {
        console.log("WebSocket connection closed");
    });
});

server.on("upgrade", (req, socket, head) => {
    try {
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });

        console.log(`WebSocket request verified: ${req.method} ${req.url}`);
        socket.write("WebSocket connection upgraded");
    } catch (error) {
        console.error(`Error verifying WebSocket request from Recall.ai: ${req.method} ${req.url}`, error);
        socket.destroy();
    }
});

/**
 * Start the server
 */
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`

To get started:
- Open an ngrok tunnel to the client on port 5173
- Open the following URL in your browser: https://YOUR_NGROK_DOMAIN/
    `);
});
