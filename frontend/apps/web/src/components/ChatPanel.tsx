import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { ChatMessage, Conversation } from "../types"

export function ChatPanel(props: {
  conversation: Conversation | null
  messages: ChatMessage[]
  onTogglePause: (paused: boolean) => void
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = useState("")
  const c = props.conversation

  if (!c) {
    return (
      <main className="flex h-full items-center justify-center bg-slate-900 text-slate-400">
        Elige una conversación a la izquierda.
      </main>
    )
  }

  return (
    <main className="flex h-full min-w-0 flex-col bg-slate-900 text-slate-100">
      <div className="bg-slate-800 px-4 py-3 text-sm text-slate-200">
        {c.resumen || "Todavía no hay resumen de este hilo."}
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
        {props.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-start bg-slate-800"
                : m.role === "admin"
                  ? "self-end bg-lime-900 ring-1 ring-lime-400"
                  : "self-end bg-emerald-900"
            }`}
          >
            <span className="block text-[10px] text-slate-400">
              {m.role === "user" ? "Prospecto" : m.role === "admin" ? "Operador" : "Dani"}
            </span>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-3 border-t border-slate-800 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          props.onSend(text)
          setDraft("")
        }}
      >
        <label className="flex items-center gap-2 text-xs whitespace-nowrap">
          <input
            type="checkbox"
            checked={c.ai_paused}
            onChange={(e) => props.onTogglePause(e.target.checked)}
          />
          Pausar IA
        </label>
        <input
          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe al prospecto…"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </main>
  )
}
