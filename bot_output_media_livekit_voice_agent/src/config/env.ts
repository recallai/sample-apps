// SUPPORTING — Load and parse .env for the server, agent, and bot-create CLI.
// Sample wiring only; point your own process at the same variables however you like.

import dotenv from "dotenv";
import {
    AgentEnvSchema,
    CreateBotEnvSchema,
    ServerEnvSchema,
    type AgentEnv,
    type CreateBotEnv,
    type ServerEnv,
} from "./EnvSchema";

let dotenv_loaded = false;

function load_dotenv(): void {
    if (dotenv_loaded) return;

    dotenv.config({
        path: process.env.DOTENV_FILE ?? ".env",
        quiet: true,
    });
    dotenv_loaded = true;
}

export function parse_server_env(source: NodeJS.ProcessEnv = process.env): ServerEnv {
    load_dotenv();
    return ServerEnvSchema.parse(source);
}

export function parse_agent_env(source: NodeJS.ProcessEnv = process.env): AgentEnv {
    load_dotenv();
    return AgentEnvSchema.parse(source);
}

export function parse_create_bot_env(
    source: NodeJS.ProcessEnv = process.env,
): CreateBotEnv {
    load_dotenv();
    return CreateBotEnvSchema.parse(source);
}
