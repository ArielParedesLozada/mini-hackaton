import { useCallback, useEffect, useState } from "react"
import { configurationError, supabase } from "../lib/supabase"
import type { ChatMessage, Conversation } from "../types"

function mergeRows<T extends { id: string }>(previous: T[], incoming: T[]) {
  const rows = new Map(previous.map((row) => [row.id, row]))
  for (const row of incoming) rows.set(row.id, row)
  return [...rows.values()]
}

export function useDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(configurationError)
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting")
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    try {
      const result = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(1000)
      if (result.error) throw result.error
      // Page through the real history instead of silently truncating at the API's 1,000-row limit.
      const allMessages: ChatMessage[] = []
      for (let offset = 0; ; offset += 1000) {
        const page = await supabase.from("messages").select("*").order("created_at", { ascending: true }).order("id").range(offset, offset + 999)
        if (page.error) throw page.error
        allMessages.push(...(page.data as ChatMessage[]))
        if (page.data.length < 1000) break
      }
      setConversations((previous) => mergeRows(result.data as Conversation[], previous))
      setMessages((previous) => mergeRows(allMessages, previous).sort((a, b) => a.created_at.localeCompare(b.created_at)))
      setError(null)
    } catch {
      setError("No pudimos cargar las conversaciones. Revisa la conexión y que el esquema de Supabase esté aplicado.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true
    const channel = client.channel("ctt-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, (payload) => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          setConversations((previous) => previous.filter((row) => row.id !== payload.old.id))
          return
        }
        setConversations((previous) => mergeRows(previous, [payload.new as Conversation]))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          setMessages((previous) => previous.filter((row) => row.id !== payload.old.id))
          return
        }
        setMessages((previous) => mergeRows(previous, [payload.new as ChatMessage]).sort((a, b) => a.created_at.localeCompare(b.created_at)))
      })
      .subscribe((status) => {
        if (!active) return
        setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "offline" : "connecting")
        if (status === "SUBSCRIBED") void reload()
      })
    void reload()
    const handleOnline = () => { void reload() }
    window.addEventListener("online", handleOnline)
    return () => {
      active = false
      window.removeEventListener("online", handleOnline)
      void client.removeChannel(channel)
    }
  }, [reload])

  async function togglePause(id: string, paused: boolean) {
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await supabase.from("conversations").update({ ai_paused: paused }).eq("id", id).select().single()
      if (result.error) throw result.error
      setConversations((previous) => mergeRows(previous, [result.data as Conversation]))
    } catch {
      setError("No se pudo cambiar el control de la conversación. Intenta de nuevo.")
      throw new Error("No se pudo cambiar el control")
    } finally { setBusy(false) }
  }

  async function sendMessage(id: string, content: string) {
    if (!supabase || busy) throw new Error("Espera a que termine la operación actual")
    setBusy(true)
    setError(null)
    try {
      // Taking over must pause inference before the administrator's message is inserted.
      const paused = await supabase.from("conversations").update({ ai_paused: true, last_message_at: new Date().toISOString() }).eq("id", id).select().single()
      if (paused.error) throw paused.error
      setConversations((previous) => mergeRows(previous, [paused.data as Conversation]))
      const result = await supabase.from("messages").insert({ conversation_id: id, role: "admin", content }).select().single()
      if (result.error) throw result.error
      setMessages((previous) => mergeRows(previous, [result.data as ChatMessage]).sort((a, b) => a.created_at.localeCompare(b.created_at)))
    } catch {
      setError("No se pudo enviar el mensaje. Conservamos el borrador para que lo intentes de nuevo.")
      throw new Error("Mensaje no enviado")
    } finally { setBusy(false) }
  }

  return { conversations, messages, loading, error, connection, busy, reload, togglePause, sendMessage, dismissError: () => setError(null) }
}
