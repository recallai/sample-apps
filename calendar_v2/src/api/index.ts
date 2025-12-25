import http from "http";
import dotenv from "dotenv";
import { env } from "./config/env";
import { calendar_events_list } from "./handlers/calendar_events_list";
import { calendar_oauth } from "./handlers/calendar_oauth";
import { calendar_oauth_callback } from "./handlers/calendar_oauth_callback";
import { calendars_delete } from "./handlers/calendars_delete";
import { calendars_list } from "./handlers/calendars_list";
import { recall_webhook } from "./handlers/recall_webhook";

dotenv.config();

const server = http.createServer();
const client_domain = "http://localhost:5173";

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
            /** OAuth endpoints */
            case "/api/calendar/oauth": {
                if (req.method?.toUpperCase() !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const calendar_oauth_url = await calendar_oauth(search_params);
                console.log(`Created Calendar OAuth URL: ${calendar_oauth_url.oauth_url.toString()}`);

                // redirect to the Calendar OAuth URL
                res.writeHead(302, { Location: calendar_oauth_url.oauth_url.toString() });
                res.end();
                return;
            }
            case "/api/calendar/oauth/callback": {
                if (req.method?.toUpperCase() !== "GET") throw new Error(`Method not allowed: ${req.method}`);

                const { calendar } = await calendar_oauth_callback(search_params);
                console.log(`Created Calendar: ${JSON.stringify(calendar)}`);

                res.writeHead(302, { Location: `${client_domain}/dashboard/calendar?platform_email=${calendar.platform_email}` });
                res.end();
                return;
            }

            /** Webhoook endpoints */
            case "/api/recall/webhook": {
                if (req.method?.toUpperCase() !== "POST") throw new Error(`Method not allowed: ${req.method}`);

                await recall_webhook(body);
                console.log(`Recall webhook received: ${JSON.stringify(body)}`);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Recall webhook received" }));
                return;
            }

            /** Dashboard endpoints */
            case "/api/calendar": {
                switch (req.method?.toUpperCase()) {
                    /** List calendars */
                    case "GET": {
                        if (!search_params.platform_email) throw new Error("platform_email is required");

                        const results = await calendars_list(search_params);
                        console.log(`Listed Calendars: ${JSON.stringify(results)}`);

                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(results));
                        return;
                    }
                    /** Delete calendar */
                    case "DELETE": {
                        if (!search_params.calendar_id) throw new Error("calendar_id is required");

                        await calendars_delete(search_params);
                        console.log(`Deleted Calendar: ${url.pathname.split("/").pop()!}`);

                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ message: "Calendar deleted" }));
                        return;
                    }
                    default: {
                        throw new Error(`Method not allowed: ${req.method}`);
                    }
                }
            }
            case "/api/calendar/events": {
                switch (req.method?.toUpperCase()) {
                    case "GET": {
                        if (!search_params.calendar_id) throw new Error("calendar_id is required");

                        const results = await calendar_events_list(search_params);
                        console.log(`Listed Calendar Events: ${results.calendar_events.length}`);

                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(results));
                        return;
                    }
                    default: {
                        throw new Error(`Method not allowed: ${req.method}`);
                    }
                }
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
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : error }));
    }
});

/**
 * Start the server
 */
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`

To get started:
- Open an ngrok tunnel to the server on port ${env.PORT}
- Open the following URL in your browser: ${client_domain}

To access the OAuth URLs directly:
- Google: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/api/calendar/oauth?platform=google_calendar
- Outlook: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/api/calendar/oauth?platform=microsoft_outlook

Ensure that:
- The redirect URI in your Google/Outlook Calendar OAuth is set to: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/api/calendar/oauth/callback
    `);
});
