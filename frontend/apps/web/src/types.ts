export type Conversation = {
  id: string
  telegram_chat_id: number
  nombre: string | null
  estado: string
  resumen: string
  ai_paused: boolean
  alerta_inyeccion: boolean
  last_message_at: string
}

export type ChatMessage = {
  id: string
  conversation_id: string
  role: "user" | "bot" | "admin"
  content: string
  created_at: string
}
