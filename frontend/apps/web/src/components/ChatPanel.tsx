import { Fragment, useEffect, useRef, useState } from "react"
import { ArrowLeft, Bot, CheckCheck, ChevronDown, ChevronRight, GraduationCap, Info, MessageSquare, Play, Send, ShieldAlert, Sparkles, Users, X } from "lucide-react"
import { STATES, initials, time } from "../types"
import type { ChatMessage, Conversation } from "../types"

export function ChatPanel(props: {
  conversation: Conversation | null
  messages: ChatMessage[]
  busy: boolean
  loading: boolean
  onBack: () => void
  onTogglePause: (paused: boolean) => Promise<void>
  onSend: (text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [localError, setLocalError] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const c = props.conversation
  const textarea = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [props.messages.length])
  if (!c) return <div className="empty-chat"><div className="empty-orbit"><span /><div><GraduationCap size={38} /></div><span /></div><div className="eyebrow">PERSONAS DETRÁS DE CADA MENSAJE</div><h2>El siguiente paso empieza<br />con una conversación.</h2><p>{props.loading ? "Estamos preparando tu bandeja de entrada…" : "Selecciona un chat para acompañar al prospecto, conocer sus intereses y ayudarle a encontrar su próximo curso."}</p><span className="empty-chat-note"><ShieldAlert size={14} /> Solo conversaciones reales. Siempre en tiempo real.</span></div>
  const state = STATES[c.estado] ?? STATES.interesado
  const send = async () => {
    const text = draft.trim()
    if (!text || props.busy) return
    setLocalError("")
    try { await props.onSend(text); setDraft(""); textarea.current?.focus() }
    catch { setLocalError("No se envió el mensaje. Puedes volver a intentarlo.") }
  }
  const toggle = async () => {
    setLocalError("")
    try { await props.onTogglePause(!c.ai_paused) }
    catch { setLocalError("No pudimos cambiar el control. Intenta nuevamente.") }
  }
  return <div className={`chat-and-details ${showDetails ? "details-open" : ""}`}>
    <section className="chat-panel" aria-label={`Conversación con ${c.nombre || "Prospecto"}`}>
      <header className="chat-header"><button className="icon-button back-button" onClick={props.onBack} aria-label="Volver a la bandeja"><ArrowLeft size={18} /></button><span className={`avatar avatar-${state.color}`}>{initials(c.nombre)}</span><div className="chat-heading"><h2>{c.nombre || "Prospecto"} <span className="telegram-small">➤</span></h2><span><span className="tiny-dot" /> Conversación de Telegram</span></div><div className="chat-actions"><span className={`control-status ${c.ai_paused ? "human" : ""}`}>{c.ai_paused ? <Users size={14} /> : <Sparkles size={14} />}{c.ai_paused ? "Operador al mando" : "Asesor IA activo"}</span><button className="icon-button info-button" onClick={() => setShowDetails(!showDetails)} aria-label="Ver información del prospecto" aria-expanded={showDetails}><Info size={19} /></button></div></header>
      <div className="ai-summary"><span className="summary-icon"><Sparkles size={16} /></span><div><strong>Un vistazo al contexto <span>Resumen de IA</span></strong><p>{c.resumen || "El resumen aparecerá después de la primera respuesta del asesor."}</p></div></div>
      {c.alerta_inyeccion && <div className="injection-banner"><ShieldAlert size={16} /><span>Se detectó un intento de manipulación en esta conversación.</span></div>}
      <div className="message-history" role="log" aria-label="Historial de mensajes" aria-live="polite">
        <div className="conversation-start"><ShieldAlert size={12} /> Inicio de la conversación con CTT-FISEI</div>
        {!props.messages.length && <p className="no-messages">Todavía no hay mensajes en esta conversación.</p>}
        {props.messages.map((message, index) => {
          const previous = props.messages[index - 1]
          const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString()
          const outgoing = message.role !== "user"
          return <Fragment key={message.id}>{newDay && <div className="date-divider"><span>{new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long" }).format(new Date(message.created_at))}</span></div>}<article className={`message-row ${outgoing ? "outgoing" : "incoming"} ${message.role}`}><span className={`message-avatar ${message.role}`}>{message.role === "user" ? initials(c.nombre) : message.role === "admin" ? <Users size={13} /> : <Sparkles size={13} />}</span><div className="message-content"><div className="message-author">{message.role === "user" ? c.nombre || "Prospecto" : message.role === "admin" ? "Tú · Operador" : "Asesor CTT"}{message.role === "bot" && <span>IA</span>}</div><div className="message-bubble"><MessageText content={message.content} /></div><div className="message-meta"><time dateTime={message.created_at}>{time(message.created_at)}</time>{outgoing && <CheckCheck size={13} aria-label="Guardado en la conversación" />}</div></div></article></Fragment>
        })}
        <div ref={bottom} />
      </div>
      <div className={`handover-strip ${c.ai_paused ? "paused" : ""}`}><span>{c.ai_paused ? <Users size={15} /> : <Bot size={16} />}{c.ai_paused ? "Tienes el control de esta conversación" : "La IA está acompañando a este prospecto"}</span><button disabled={props.busy} onClick={() => void toggle()}>{c.ai_paused ? <Play size={12} /> : <Users size={13} />}{c.ai_paused ? "Reanudar IA" : "Intervenir"}<ChevronRight size={13} /></button></div>
      <form className="composer" onSubmit={(event) => { event.preventDefault(); void send() }}>
        <div className="composer-label"><span><span className="tiny-dot" /> Responder como operador</span><span>Vía Telegram <ChevronDown size={11} /></span></div>
        <textarea ref={textarea} rows={2} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} placeholder={`Escribe una respuesta para ${c.nombre || "el prospecto"}…`} aria-label="Mensaje del operador" disabled={props.busy} />
        {localError && <p className="composer-error" role="alert">{localError}</p>}
        <div className="composer-bottom"><span>{props.busy ? "Guardando cambios…" : "Al enviar, la IA se pausa automáticamente."}</span><button className="send-button" type="submit" disabled={!draft.trim() || props.busy}>{props.busy ? <span className="loading-spinner" /> : <Send size={15} />}<span>{props.busy ? "Enviando" : "Enviar"}</span><kbd>↵</kbd></button></div>
      </form>
    </section>
    <aside className="prospect-details"><button className="icon-button details-close" aria-label="Cerrar detalles" onClick={() => setShowDetails(false)}><X size={18} /></button><div className="details-heading">PERFIL DEL PROSPECTO</div><div className={`profile-avatar avatar-${state.color}`}>{initials(c.nombre)}</div><h3>{c.nombre || "Prospecto"}</h3><span className="profile-channel"><span className="telegram-small">➤</span> Telegram</span><span className={`state-badge ${state.color}`}><span />{state.label}</span><div className="details-divider" /><div className="details-section"><h4>TERMÓMETRO DE INTENCIÓN</h4><div className="thermometer">{["interesado", "dudoso", "frustrado", "lead_caliente"].map((value) => <span key={value} className={`${STATES[value].color} ${c.estado === value ? "lit" : ""}`} title={STATES[value].label} />)}</div><p>{state.description}</p></div><div className="details-divider" /><div className="details-section"><h4>GESTIÓN DEL CHAT</h4><div className="detail-line"><span>Responsable</span><strong>{c.ai_paused ? "Operador" : "Asesor IA"}</strong></div><div className="detail-line"><span>Canal</span><strong>Telegram</strong></div><div className="detail-line"><span>Mensajes</span><strong>{props.messages.length}</strong></div><div className="detail-line"><span>Última actividad</span><strong>{time(c.last_message_at)}</strong></div><div className="detail-line chat-id"><span>ID del chat</span><code>{c.telegram_chat_id}</code></div></div><div className="details-divider" /><div className="details-section"><h4>SEGURIDAD</h4><div className={`security-status ${c.alerta_inyeccion ? "alert" : ""}`}><ShieldAlert size={15} />{c.alerta_inyeccion ? "Manipulación detectada" : "Sin alertas detectadas"}</div></div><div className="profile-note"><MessageSquare size={16} /><p>Una buena conversación es el primer paso hacia una nueva habilidad.</p></div></aside>
  </div>
}
function MessageText({ content }: { content: string }) {
  return <p>{content.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : <Fragment key={index}>{part}</Fragment>)}</p>
}
