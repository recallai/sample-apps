import { env } from "../config/env";
import { CalendarSchema, type CalendarType } from "../../schemas/CalendarSchema";

/**
 * List calendars saved in Recall.
 */
export async function calendars_list(args: Partial<CalendarType>): Promise<{ calendars: CalendarType[] }> {
    const { platform_email, platform } = CalendarSchema.partial().parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars`);
    if (platform_email) url.searchParams.set("platform_email", platform_email);
    if (platform) url.searchParams.set("platform", platform);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return {
        calendars: CalendarSchema
            .array()
            .parse(data.results).map(v => ({
                ...v,
                status_changes: v.status_changes
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            })),
    };
}
