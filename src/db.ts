import { createClient } from "@supabase/supabase-js";
import { config } from "./config.ts";

export type Conversation = {
  id: string;
  telegram_chat_id: number;
  nombre: string | null;
  estado: string;
  resumen: string;
  ai_paused: boolean;
  alerta_inyeccion: boolean;
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export async function getOrCreateConversation(chatId: number, nombre: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      {
        telegram_chat_id: chatId,
        nombre,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "telegram_chat_id" },
    )
    .select()
    .single();
  if (error || !data) {
    throw new Error("No se pudo abrir la conversación");
  }
  return data as Conversation;
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "bot" | "admin",
  content: string,
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
  if (error) throw new Error("No se pudo guardar el mensaje");
}

export async function getRecentMessages(
  conversationId: string,
  limit: number,
): Promise<{ role: "user" | "bot" | "admin"; content: string }[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return [...data].reverse().map((row) => ({
    role: row.role as "user" | "bot" | "admin",
    content: row.content as string,
  }));
}

export async function updateConversationState(
  conversationId: string,
  patch: { estado?: string; resumen?: string; ai_paused?: boolean; alerta_inyeccion?: boolean },
): Promise<void> {
  const { error } = await supabase.from("conversations").update(patch).eq("id", conversationId);
  if (error) throw new Error("No se pudo actualizar el estado");
}

export function onAdminMessage(handler: (chatId: number, content: string) => void): void {
  supabase
    .channel("admin-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const row = payload.new as { role?: string; content?: string; conversation_id?: string };
        if (row.role !== "admin" || !row.conversation_id || !row.content) return;
        const { data } = await supabase
          .from("conversations")
          .select("telegram_chat_id")
          .eq("id", row.conversation_id)
          .single();
        if (data?.telegram_chat_id) {
          handler(Number(data.telegram_chat_id), row.content);
        }
      },
    )
    .subscribe();
}
