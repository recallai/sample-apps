import { z } from "zod";
import { env } from "../config/env";
import { CalendarSchema } from "../schemas/CalendarSchema";

export { list_calendars };

/**
 * List calendars saved in Recall.
 */
async function list_calendars(args: Partial<z.infer<typeof CalendarSchema>>): Promise<{ results: z.infer<typeof CalendarSchema>[] }> {
    const { platform_email, calendar_platform, status } = CalendarSchema.partial().parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars`);
    if (platform_email) url.searchParams.set("platform_email", platform_email);
    if (calendar_platform) url.searchParams.set("calendar_platform", calendar_platform);
    if (status) url.searchParams.set("status", status);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Authorization": `${env.RECALL_API_KEY}`, },
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        results: CalendarSchema.array(),
    }).parse(await response.json());
}
