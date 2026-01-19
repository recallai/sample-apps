import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    join_at__gte: z.string().optional(), // ISO 8601, e.g. "2025-12-15 00:00:00"
    join_at__lte: z.string().optional(), // ISO 8601, e.g. "2025-12-15 00:00:00"
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    help: z.boolean().optional(),
});
