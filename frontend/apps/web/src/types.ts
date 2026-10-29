export type Conversation = {
  id: string
  telegram_chat_id: number
  nombre: string | null
  estado: string
  resumen: string
  ai_paused: boolean
  alerta_inyeccion: boolean
  last_message_at: string
  created_at: string
}

export const STATES: Record<string, { label: string; color: string; description: string }> = {
  interesado: { label: "Interesado", color: "blue", description: "Está explorando las opciones de capacitación." },
  dudoso: { label: "Dudoso", color: "amber", description: "Tiene preguntas u objeciones por resolver." },
  frustrado: { label: "Frustrado", color: "red", description: "Necesita la atención de un operador." },
  lead_caliente: { label: "Lead caliente", color: "green", description: "Muestra intención de inscribirse." },
}

export function initials(name: string | null) {
  return (name || "Prospecto").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

export function time(value: string) {
  return new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export type ChatMessage = {
  id: string
  conversation_id: string
  role: "user" | "bot" | "admin"
  content: string
  created_at: string
}
