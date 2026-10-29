import { useState } from "react"
import { Bot, Inbox, Search, ShieldAlert, Users } from "lucide-react"
import { STATES, initials, time } from "../types"
import type { ChatMessage, Conversation } from "../types"

export function ConversationList(props: {
  conversations: Conversation[]
  lastMessages: Record<string, ChatMessage | undefined>
  selectedId: string | null
  loading: boolean
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const query = search.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "")
  const filtered = props.conversations.filter((conversation) => {
    const text = `${conversation.nombre ?? ""} ${conversation.telegram_chat_id} ${props.lastMessages[conversation.id]?.content ?? ""}`.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    return text.includes(query) && (filter === "all" || filter === "human" && conversation.ai_paused || filter === "leads" && conversation.estado === "lead_caliente")
  })
  return <aside className="conversation-list">
    <div className="list-header"><div><h2>Bandeja de entrada</h2><span className="count-pill">{props.conversations.length}</span></div><span className="channel-label"><span className="telegram-small">➤</span> Telegram</span></div>
    <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar una conversación…" aria-label="Buscar por nombre, chat o mensaje" /><kbd>⌕</kbd></label>
    <div className="list-tabs" aria-label="Filtrar conversaciones">{[{ id: "all", label: "Todas", count: props.conversations.length }, { id: "human", label: "Por atender", count: props.conversations.filter((c) => c.ai_paused).length }, { id: "leads", label: "Leads", count: props.conversations.filter((c) => c.estado === "lead_caliente").length }].map((tab) => <button key={tab.id} onClick={() => setFilter(tab.id)} className={filter === tab.id ? "selected" : ""} aria-pressed={filter === tab.id}>{tab.label}<span>{tab.count}</span></button>)}</div>
    <div className="list-scroll">
      {props.loading && !props.conversations.length ? <div className="list-empty"><span className="loading-spinner" /><strong>Cargando conversaciones</strong><p>Conectando con tu centro de atención.</p></div> : filtered.length ? filtered.map((conversation) => {
        const last = props.lastMessages[conversation.id]
        const state = STATES[conversation.estado] ?? STATES.interesado
        return <button key={conversation.id} className={`conversation-card ${props.selectedId === conversation.id ? "selected" : ""}`} onClick={() => props.onSelect(conversation.id)} aria-current={props.selectedId === conversation.id ? "true" : undefined}>
          <span className={`avatar avatar-${state.color}`}>{initials(conversation.nombre)}<span className="avatar-channel">➤</span></span>
          <span className="conversation-copy"><span className="conversation-top"><strong>{conversation.nombre || "Prospecto"}</strong><time dateTime={conversation.last_message_at}>{time(conversation.last_message_at)}</time></span><span className="conversation-preview">{last?.role === "admin" ? "Tú: " : last?.role === "bot" ? "Asesor: " : ""}{last?.content || "Esperando el primer mensaje"}</span><span className="conversation-tags"><span className={`state-badge ${state.color}`}><span />{state.label}</span>{conversation.alerta_inyeccion && <span className="injection-mini" title="Intento de manipulación detectado"><ShieldAlert size={13} /><span className="sr-only">Alerta de manipulación</span></span>}<span className={`handler-badge ${conversation.ai_paused ? "human" : ""}`}>{conversation.ai_paused ? <Users size={11} /> : <Bot size={12} />}{conversation.ai_paused ? "Operador" : "IA activa"}</span></span></span>
        </button>
      }) : <div className="list-empty"><span className="empty-symbol"><Inbox size={25} /></span><strong>{search || filter !== "all" ? "Sin coincidencias" : "Tu próxima conversación empieza aquí"}</strong><p>{search || filter !== "all" ? "Prueba con otro nombre o filtro." : "Cuando alguien escriba al bot de Telegram, aparecerá en esta bandeja."}</p></div>}
    </div>
    <div className="list-footer"><span className="tiny-dot" />{filtered.length} {filtered.length === 1 ? "conversación" : "conversaciones"}<span>Actualización automática</span></div>
  </aside>
}
