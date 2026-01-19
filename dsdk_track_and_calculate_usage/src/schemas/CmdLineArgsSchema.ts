import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    started_at__gte: z.string().optional(),
    started_at__lte: z.string().optional(),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : undefined),
    help: z.boolean().optional(),
});