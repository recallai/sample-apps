import dotenv from "dotenv";
import http from "http";
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
        const url = new URL(`https://${req.headers.host?.replace("https://", "")}${req?.url}`);
        console.log(`Incoming HTTP request: ${req.method} ${url.toString()}`);

        switch (url.pathname) {
            case "/zoom/oauth": {
                if (req.method !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const zoom_oauth_url = zoom_oauth();
                console.log(`Created Zoom OAuth URL`);

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
                console.log(`Zoom OAuth callback called`);

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
                console.log(`Generated Zoom ZAK token`);

                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end(zak_token);
                return;
            }
            default: {
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
    // Quick check to verify
    if (new URL(env.ZOOM_OAUTH_APP_REDIRECT_URI).pathname !== "/zoom/oauth/callback") {
        throw new Error(`Zoom OAuth App Redirect URI path is not correct. 
Expected: "/zoom/oauth/callback"
Received: "${new URL(env.ZOOM_OAUTH_APP_REDIRECT_URI).pathname}"

Make sure that your Redirect URI in your Zoom OAuth is also set to: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/oauth/callback
`);
    }

    console.log(`Server is running on port ${env.PORT}

        To get started, open the following URL in your browser: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/oauth
        
        After you complete the OAuth flow, you can then create a bot. Ensure that \`zoom.zak_url="https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/zak"\` is set in the bot's configuration.
    `);
});
