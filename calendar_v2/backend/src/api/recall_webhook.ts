import { z } from "zod";
import { CalendarSyncEventsPayloadSchema } from "../schemas/CalendarSyncEventsPayloadSchema";
import { CalendarUpdatePayloadSchema } from "../schemas/CalendarUpdatePayloadSchema";

export async function recall_webhook(payload: any): Promise<void> {
    const { event, data } = z.union([
        CalendarUpdatePayloadSchema,
        CalendarSyncEventsPayloadSchema,
    ]).parse(payload);
}