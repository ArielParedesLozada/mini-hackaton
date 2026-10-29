import { Bot, type Context } from "grammy";
import { config } from "./config.ts";
import {
  appendMessage,
  getOrCreateConversation,
  getRecentMessages,
  onAdminMessage,
  updateConversationState,
} from "./db.ts";
import { runAgentTurn, transcribeAudio } from "./gemini.ts";

export const bot = new Bot(config.telegramToken);

async function handleText(ctx: Context, text: string, persistAs: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const nombre = ctx.from?.first_name ?? "Prospecto";
  const conversation = await getOrCreateConversation(chatId, nombre);
  await appendMessage(conversation.id, "user", persistAs);
  if (conversation.ai_paused) return;

  await ctx.replyWithChatAction("typing");
  const history = await getRecentMessages(conversation.id, 10);
  const turn = await runAgentTurn({
    userMessage: text,
    history,
    resumenPrevio: conversation.resumen,
  });
  await ctx.reply(turn.reply);
  await appendMessage(conversation.id, "bot", turn.reply);
  await updateConversationState(conversation.id, {
    estado: turn.estado,
    resumen: turn.resumen,
    alerta_inyeccion: turn.intento_manipulacion,
    ai_paused: turn.estado === "frustrado" ? true : undefined,
  });
}

bot.on("message:text", async (ctx) => {
  await handleText(ctx, ctx.message.text, ctx.message.text);
});

bot.on("message:voice", async (ctx) => {
  const file = await ctx.getFile();
  const url = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
  const res = await fetch(url);
  const audio = Buffer.from(await res.arrayBuffer());
  const mime = ctx.message.voice.mime_type ?? "audio/ogg";
  const transcribed = (await transcribeAudio(audio, mime)).trim() || "(nota de voz sin transcripción)";
  await handleText(ctx, transcribed, `🎤 ${transcribed}`);
});

bot.on("message", async (ctx) => {
  if (ctx.message.text || ctx.message.voice) return;
  await ctx.reply("Escríbeme un texto o una nota de voz y te ayudo con los cursos.");
});

bot.catch((error) => {
  console.error("bot error", error.message);
});

export function startBot(): void {
  onAdminMessage((chatId, content) => {
    void bot.api.sendMessage(chatId, content).catch((error) => {
      console.error("relay error", error);
    });
  });
  void bot.start({
    onStart: () => {
      console.log("bot en long polling");
    },
  });
}
