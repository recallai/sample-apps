import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
    PORT: z.number().default(4000),
});

export const env = EnvSchema.parse(process.env);