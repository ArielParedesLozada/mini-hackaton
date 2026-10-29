import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: "secrets/.env" });
loadEnv();

function readSecretFile(name: string): string | undefined {
  const path = resolve("secrets", name);
  if (!existsSync(path)) return undefined;
  const value = readFileSync(path, "utf8").trim();
  return value.length > 0 ? value : undefined;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta ${name}. Revisa secrets/.env y los archivos de secrets/.`);
  }
  return value;
}

const telegramToken = required("TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN ?? readSecretFile("botfather"));
const geminiKey = required("GEMINI_API_KEY", process.env.GEMINI_API_KEY ?? readSecretFile("gemini"));
const supabaseUrl = required("SUPABASE_URL", process.env.SUPABASE_URL);
const supabaseKey = required(
  "SUPABASE_PUBLISHABLE_KEY",
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
);

export const config = {
  telegramToken,
  geminiKey,
  supabaseUrl,
  supabaseKey,
};
