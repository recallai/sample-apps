import { z } from "zod";
import { CalendarSyncEventsEventSchema } from "../schemas/CalendarSyncEventsEventSchema";
import { CalendarUpdateEventSchema } from "../schemas/CalendarUpdateEventSchema";

export async function recall_webhook(payload: any): Promise<void> {
    const { event, data } = z.union([
        CalendarUpdateEventSchema,
        CalendarSyncEventsEventSchema,
    ]).parse(payload);

    switch (event) {
        case "calendar.update": {
            console.log(`Calendar update event received: ${JSON.stringify(data)}`);
            break;
        }
        case "calendar.sync_events": {
            console.log(`Calendar sync events event received: ${JSON.stringify(data)}`);
            break;
        }
    }

    return;
}