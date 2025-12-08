import { z } from "zod";
import { env } from "../config/env";

/**
 * Delete a calendar saved in Recall.
 */
export async function calendars_delete(args: { calendar_id: string }): Promise<void> {
    const { calendar_id } = z.object({ calendar_id: z.string() }).parse(args);

    const url = new URL(`https://${env.RECALL_REGION}.recall.ai/api/v2/calendars/${calendar_id}/`);
    const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: { "Authorization": `${env.RECALL_API_KEY}` },
    });
    if (!response.ok) throw new Error(await response.text());
}
