import { z } from "zod";

export function generate_bot_deduplication_key(args: {
    one_bot_per: "user" | "email_domain" | "meeting",
    email: string,
    meeting_url: string,
    meeting_start_timestamp: string,
}): string {
    const { one_bot_per, email, meeting_url, meeting_start_timestamp } = z.object({
        one_bot_per: z.enum(["user", "email_domain", "meeting"]),
        email: z.string(),
        meeting_url: z.string(),
        meeting_start_timestamp: z.string(),
    }).parse(args);

    switch (one_bot_per) {
        case "user":
            // Deduplicate at user level: every user who has a bot scheduled will get their own bot.
            return `${email}-${meeting_url}-${meeting_start_timestamp}`;
        case "email_domain":
            // Deduplicate at company/domain level: one shared bot for everyone from that domain on this meeting occurrence.
            return `${email.split("@")[1]}-${meeting_url}-${meeting_start_timestamp}`;
        case "meeting":
            // Deduplicate at meeting level: one bot for the entire meeting regardless of who scheduled it.
            return `${meeting_url}-${meeting_start_timestamp}`;
    }
}