import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    help: z.boolean().optional(),
});