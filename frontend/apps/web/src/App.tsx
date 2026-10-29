import { useEffect, useMemo, useState } from "react"
import { ChatPanel } from "./components/ChatPanel"
import { ConversationList } from "./components/ConversationList"
import { supabase } from "./lib/supabase"
import type { ChatMessage, Conversation } from "./types"

export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .then(({ data }) => {
        if (data) setConversations(data as Conversation[])
      })
    void supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[])
      })

    const channel = supabase
      .channel("ops")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, (payload) => {
        const row = payload.new as Conversation
        if (!row?.id) return
        setConversations((prev) => {
          const rest = prev.filter((c) => c.id !== row.id)
          return [row, ...rest].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        })
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as ChatMessage
        if (!row?.id) return
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const thread = useMemo(
    () => messages.filter((m) => m.conversation_id === selectedId),
    [messages, selectedId],
  )
  const lastMessages = useMemo(() => {
    const map: Record<string, ChatMessage | undefined> = {}
    for (const m of messages) map[m.conversation_id] = m
    return map
  }, [messages])

  return (
    <div className="grid h-svh grid-cols-[320px_1fr]">
      <ConversationList
        conversations={conversations}
        lastMessages={lastMessages}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <ChatPanel
        conversation={selected}
        messages={thread}
        onTogglePause={(paused) => {
          if (!selected) return
          void supabase.from("conversations").update({ ai_paused: paused }).eq("id", selected.id)
        }}
        onSend={(text) => {
          if (!selected) return
          void supabase.from("messages").insert({
            conversation_id: selected.id,
            role: "admin",
            content: text,
          })
        }}
      />
    </div>
  )
}
