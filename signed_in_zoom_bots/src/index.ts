import http from "http";
import dotenv from "dotenv";
import z from "zod";
import { zoom_oauth } from "./api/zoom_oauth";
import { zoom_oauth_callback } from "./api/zoom_oauth_callback";
import { zoom_zak } from "./api/zoom_zak";
import { env } from "./config/env";

dotenv.config();

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests from Recall.ai
 */
server.on("request", async (req, res) => {
    try {
        // Parse the request
        const url = new URL(`https://${req.headers.host?.replace("https://", "")}${req?.url}`);
        const pathname = url.pathname.at(-1) === '/' ? url.pathname.slice(0, -1) : url.pathname;
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
            case "/zoom/oauth": {
                if (req.method !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const zoom_oauth_url = zoom_oauth();
                console.log(`Created Zoom OAuth URL: ${zoom_oauth_url}`);

                // redirect to the Zoom OAuth URL
                res.writeHead(302, { Location: zoom_oauth_url });
                res.end();
                return;
            }
            case "/zoom/oauth/callback": {
                if (req.method !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const { code: authorization_code } = z.object({ code: z.string() })
                    .parse(Object.fromEntries(url.searchParams.entries()));
                const { access_token, refresh_token } = await zoom_oauth_callback({ authorization_code });
                console.log(`Zoom OAuth callback called with authorization code access_token: ${access_token} and refresh_token: ${refresh_token}`);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    message: "Zoom OAuth callback received",
                    access_token,
                    refresh_token,
                }));
                return;
            }
            case "/zoom/zak": {
                if (req.method !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const { zak_token } = await zoom_zak();
                console.log(`Generated Zoom ZAK token: ${zak_token}`);

                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end(zak_token);
                return;
            }
            default: {
                if (url.pathname === "/favicon.ico") {
                    res.writeHead(200, { "Content-Type": "image/x-icon" });
                    res.end(Buffer.from(""));
                    return;
                }
                throw new Error(`Endpoint not found: ${req.method} ${url.pathname}`);
            }
        }
    } catch (error) {
        console.error(`${req.method} ${req.url}`, error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
});

/**
 * Start the server
 */
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`
Server is running on port ${env.PORT}

To get started, open the following URL in your browser: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/oauth
        
After you complete the OAuth flow, you can then create a bot.
  - Ensure that \`zoom.zak_url="https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/zak"\` is set in the bot's configuration.
  - You can create a bot using the \`run.sh\` script. See the README for more details.
    `);
});
