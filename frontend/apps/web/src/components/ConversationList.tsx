import { Shield } from "lucide-react"
import type { ChatMessage, Conversation } from "../types"

const COLORS: Record<string, string> = {
  interesado: "bg-slate-400",
  dudoso: "bg-amber-400",
  frustrado: "bg-red-500",
  lead_caliente: "bg-emerald-500",
}

export function ConversationList(props: {
  conversations: Conversation[]
  lastMessages: Record<string, ChatMessage | undefined>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside className="flex h-full flex-col overflow-auto border-r bg-slate-950 text-slate-100">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-sm font-semibold tracking-wide">CTT-FISEI</h1>
        <p className="text-muted-foreground text-xs">Panel de mando</p>
      </header>
      {props.conversations.map((c) => {
        const last = props.lastMessages[c.id]
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => props.onSelect(c.id)}
            className={`mx-2 mb-2 rounded-lg p-3 text-left ${
              c.id === props.selectedId ? "bg-slate-800 ring-1 ring-emerald-500" : "bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${COLORS[c.estado] ?? "bg-slate-400"}`} />
              <strong className="text-sm">{c.nombre ?? "Prospecto"}</strong>
              {c.alerta_inyeccion ? <Shield className="size-3.5 text-amber-300" /> : null}
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">{last?.content ?? "Sin mensajes"}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span>{c.estado.replace("_", " ")}</span>
              {c.ai_paused ? (
                <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-slate-950">Operador al mando</span>
              ) : null}
            </div>
          </button>
        )
      })}
    </aside>
  )
}
