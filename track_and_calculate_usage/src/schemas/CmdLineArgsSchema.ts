import { z } from "zod";

const UsageTypes = ["bot"] as const;

export const CmdLineArgsSchema = z.object({
    type: z.enum(UsageTypes, { message: `--type must be one of: ${UsageTypes.join(", ")}` }),
    start_date: z.string({ message: "--start_date is required" }),
    end_date: z.string({ message: "--end_date is required" }),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    help: z.boolean().optional(),
});