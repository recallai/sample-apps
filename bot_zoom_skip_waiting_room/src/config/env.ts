import dotenv from "dotenv";
import { EnvSchema } from "../schemas/EnvSchema";

dotenv.config();

export const env = EnvSchema.parse(process.env);

// Verify that the Zoom OAuth App Redirect URI is set.
if (!env.ZOOM_OAUTH_APP_REDIRECT_URI) {
    throw new Error("Zoom OAuth App Redirect URI is not set");
}

// Verify that the redirect URI is set to the expected path for Zoom OAuth.
if (!env.ZOOM_OAUTH_APP_REDIRECT_URI?.split("?")[0].endsWith("/zoom/oauth/callback")) {
    throw new Error(`
Zoom OAuth App Redirect URI path is not correct. 

Expected: "/zoom/oauth/callback" 
Received: "${new URL(env.ZOOM_OAUTH_APP_REDIRECT_URI).pathname}"

Make sure that your Redirect URI in your Zoom OAuth App is also set to: https://${process.env.NGROK_DOMAIN ?? "NGROK_DOMAIN"}/zoom/oauth/callback
`);
}