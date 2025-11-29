import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
    PORT: z.number().default(4000),
    VERIFICATION_SECRET: z.string().startsWith("whsec_"),
});

export const env = EnvSchema.parse(process.env);