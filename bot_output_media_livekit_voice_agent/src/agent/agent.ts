// CORE — Voice agent persona and instructions used in the meeting.
// Swap the prompt (and LLM wiring) for your product; keep answers short and
// speech-friendly so barge-in and Output Media playback stay usable.

import { Agent, type LLM } from "@livekit/agents";

const AGENT_INSTRUCTIONS = `
You are a concise voice assistant participating in a live meeting.
Answer in one or two short sentences using plain spoken language.
Do not use markdown, lists, code formatting, or emojis.
If you did not understand the speaker, ask them to repeat the question.
`;

export function create_agent(model: LLM): Agent {
    return Agent.create({
        instructions: AGENT_INSTRUCTIONS,
        llm: model,
    });
}
