import dotenv from "dotenv";
import { EnvSchema } from "../schemas/EnvSchema";

dotenv.config();

export const env = EnvSchema.parse(process.env);