import { GoogleGenAI } from "@google/genai";
import { buildDetailBlock, buildIndexBlock, loadCourses } from "./catalog.ts";
import { config } from "./config.ts";
import {
  FALLBACK_MODELS,
  FALLBACK_REPLY,
  MODEL,
  RESPONSE_SCHEMA,
  SYSTEM_PROMPT,
  TRANSCRIPTION_PROMPT,
  buildUserTurn,
} from "./prompts.ts";
import { matchCourses } from "./retrieval.ts";

export type AgentTurn = {
  reply: string;
  estado: "interesado" | "dudoso" | "frustrado" | "lead_caliente";
  resumen: string;
  intento_manipulacion: boolean;
};

const courses = loadCourses();
const indexBlock = buildIndexBlock(courses);
const ai = new GoogleGenAI({ apiKey: config.geminiKey });

const ESTADOS = new Set(["interesado", "dudoso", "frustrado", "lead_caliente"]);

function fallbackTurn(resumen: string): AgentTurn {
  return {
    reply: FALLBACK_REPLY,
    estado: "dudoso",
    resumen,
    intento_manipulacion: false,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|UNAVAILABLE|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(text);
}

function parseTurn(raw: string | undefined, resumenPrevio: string): AgentTurn | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AgentTurn>;
    if (typeof parsed.reply !== "string" || !ESTADOS.has(parsed.estado ?? "")) return null;
    return {
      reply: parsed.reply,
      estado: parsed.estado as AgentTurn["estado"],
      resumen: typeof parsed.resumen === "string" ? parsed.resumen : resumenPrevio,
      intento_manipulacion: Boolean(parsed.intento_manipulacion),
    };
  } catch {
    return null;
  }
}

async function generate(model: string, contents: string): Promise<string | undefined> {
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  return response.text;
}

async function generateWithPolicy(contents: string): Promise<string | undefined> {
  try {
    return await generate(MODEL, contents);
  } catch (error) {
    if (isRetryable(error)) {
      await sleep(1500);
      try {
        return await generate(MODEL, contents);
      } catch {
        // se prueba la cadena de respaldo
      }
    }
  }
  for (const model of FALLBACK_MODELS) {
    try {
      return await generate(model, contents);
    } catch {
      continue;
    }
  }
  return undefined;
}

export async function runAgentTurn(args: {
  userMessage: string;
  history: { role: "user" | "bot" | "admin"; content: string }[];
  resumenPrevio: string;
}): Promise<AgentTurn> {
  try {
    const recent = args.history.slice(-2).map((m) => m.content).join(" ");
    const matched = matchCourses(`${args.userMessage} ${recent}`, courses, 2);
    const contents = buildUserTurn({
      indexBlock,
      detailBlocks: matched.map(buildDetailBlock),
      resumenPrevio: args.resumenPrevio,
      history: args.history.slice(-10),
      userMessage: args.userMessage,
    });
    const raw = await generateWithPolicy(contents);
    return parseTurn(raw, args.resumenPrevio) ?? fallbackTurn(args.resumenPrevio);
  } catch {
    return fallbackTurn(args.resumenPrevio);
  }
}

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
  const contents = [
    {
      role: "user" as const,
      parts: [
        { text: TRANSCRIPTION_PROMPT },
        { inlineData: { mimeType, data: audio.toString("base64") } },
      ],
    },
  ];
  const models = [MODEL, ...FALLBACK_MODELS];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents });
      const text = (response.text ?? "").trim();
      if (text) return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("transcribeAudio", model, message);
    }
  }
  return "";
}
