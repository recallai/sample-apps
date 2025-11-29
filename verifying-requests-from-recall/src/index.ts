import http from "http";
import { WebSocketServer } from "ws";
import { env } from "./config/env";
import { verifyRequestFromRecall } from "./verify-request-from-recall";

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests from Recall.ai
 */
server.on("request", async (req, res) => {
    try {
        // Get request headers
        const headers = Object.fromEntries(
            Object.entries(req.headers)
                .map(([key, value]) => [
                    key.toLowerCase(),
                    typeof value === "string" ? value : value?.join(",") ?? ''
                ])
        )

        switch (req.method) {
            // Verify GET requests which don't have a body/payload
            case "GET": {
                verifyRequestFromRecall({
                    secret: env.VERIFICATION_SECRET,
                    headers,
                    payload: null,
                });

                break;
            }
            // Verify requests which have a body/payload
            case "POST": {
                const bodyChunks: Buffer[] = [];
                for await (const chunk of req) {
                    bodyChunks.push(chunk);
                }
                // Must be the raw body from the request
                const rawBody = Buffer.concat(bodyChunks).toString("utf-8");

                verifyRequestFromRecall({
                    secret: env.VERIFICATION_SECRET,
                    headers,
                    payload: rawBody,
                });

                break;
            }
            default: {
                throw new Error(`Method not allowed: ${req.method}`);
            }
        }

        console.log(`HTTP request verified: ${req.method} ${req.url}`);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("HTTP request verified");
    } catch (error) {
        console.error(`Error verifying HTTP request from Recall.ai: ${req.method} ${req.url}`, error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Request not verified");
    }
});

/**
 * WebSocket server for handling WebSocket requests from Recall.ai
 */
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (socket) => {
    socket.on("message", rawMsg => {
        console.log("Message received", rawMsg.toString());
    });

    socket.on("close", () => {
        console.log("Socket closed");
    });
});

server.on("upgrade", (req, socket, head) => {
    try {
        const headers = Object.fromEntries(
            Object.entries(req.headers)
                .map(([key, value]) => [key.toLowerCase(), typeof value === "string" ? value : value?.join(",") ?? ''])
        )

        // Verify WebSocket requests on upgrade
        verifyRequestFromRecall({
            secret: env.VERIFICATION_SECRET,
            headers,
            payload: null,
        });

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
    console.log(`Server is running on port ${env.PORT}`);
});
