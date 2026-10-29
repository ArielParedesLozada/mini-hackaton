import { useMemo, useState, type ReactNode } from "react"
import { ArrowUpRight, BookOpen, Check, CircleHelp, GraduationCap, Inbox, Menu, MessageSquare, Radio, RefreshCw, Sparkles, Users, X, Zap } from "lucide-react"
import { ChatPanel } from "./components/ChatPanel"
import { ConversationList } from "./components/ConversationList"
import { CourseCatalog, courses } from "./components/CourseCatalog"
import { useDashboard } from "./hooks/useDashboard"
import type { ChatMessage } from "./types"

export function App() {
  const data = useDashboard()
  const [page, setPage] = useState<"inbox" | "catalog">("inbox")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileThread, setMobileThread] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const ordered = useMemo(() => [...data.conversations].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)), [data.conversations])
  const selected = ordered.find((c) => c.id === selectedId) ?? ordered[0] ?? null
  const thread = useMemo(() => data.messages.filter((message) => message.conversation_id === selected?.id), [data.messages, selected?.id])
  const lastMessages = useMemo(() => {
    const map: Record<string, ChatMessage | undefined> = {}
    for (const message of data.messages) map[message.conversation_id] = message
    return map
  }, [data.messages])
  const leads = ordered.filter((c) => c.estado === "lead_caliente").length
  const human = ordered.filter((c) => c.ai_paused).length
  const botMessages = data.messages.filter((m) => m.role === "bot").length
  const replyMessages = data.messages.filter((m) => m.role !== "user").length
  const automation = replyMessages ? Math.round(botMessages / replyMessages * 100) : 0
  const changePage = (next: typeof page) => { setPage(next); setSidebarOpen(false) }

  return (
    <div className={`workspace ${sidebarOpen ? "nav-open" : ""}`}>
      {sidebarOpen && <button className="nav-backdrop" aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)} />}
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); changePage("inbox") }} aria-label="CTT Connect, inicio">
          <span className="brand-mark"><GraduationCap size={23} /></span><span>ctt<span className="brand-light">connect</span></span>
        </a>
        <div className="workspace-picker"><span className="workspace-logo">U</span><div>CTT · FISEI</div><span className="workspace-tag">UTA</span></div>
        <nav aria-label="Navegación principal">
          <button className={`nav-item ${page === "inbox" ? "active" : ""}`} onClick={() => changePage("inbox")}><Inbox size={19} /> Conversaciones <span className="nav-count">{ordered.length}</span></button>
          <button className={`nav-item ${page === "catalog" ? "active" : ""}`} onClick={() => changePage("catalog")}><BookOpen size={19} /> Catálogo de cursos <span className="nav-count subtle">{courses.length}</span></button>
        </nav>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => setShowHelp(true)}><CircleHelp size={18} /> Guía del operador <ArrowUpRight size={14} /></button><div className="operator"><span className="operator-avatar">OP<span /></span><div>Operador CTT<small>Equipo de admisiones</small></div><span className="operator-role">ADMIN</span></div></div>
      </aside>
      <main className="main-workspace">
        <header className="topbar">
          <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Abrir navegación" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><h1>{page === "inbox" ? "Conversaciones" : "Catálogo de cursos"}</h1><span className="page-count">{page === "inbox" ? ordered.length : courses.length}</span></div>
          <div className="topbar-right"><time className="today">{new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" }).format(new Date())}</time><span className={`live-indicator ${data.connection}`}><span />{data.connection === "live" ? "En tiempo real" : data.connection === "offline" ? "Sin conexión" : "Conectando"}</span><span className="top-avatar">OP</span></div>
        </header>
        <div className="page-content">
          {page === "inbox" ? <>
            <section className="metrics" aria-label="Indicadores de conversaciones">
              <Metric title="Conversaciones" value={ordered.length} detail="Prospectos en el centro" icon={<MessageSquare size={19} />} color="teal" />
              <Metric title="Leads calientes" value={leads} detail="Con intención de inscribirse" icon={<Zap size={19} />} color="green" />
              <Metric title="Atención humana" value={human} detail="Conversaciones con IA pausada" icon={<Users size={19} />} color="amber" />
              <Metric title="Respuestas de IA" value={`${automation}%`} detail={`${botMessages} de ${replyMessages} respuestas`} icon={<Sparkles size={19} />} color="violet" />
            </section>
            {data.error && <div className="error-banner" role="alert"><span>{data.error}</span><button onClick={() => void data.reload()}><RefreshCw size={14} /> Reintentar</button><button className="icon-button" aria-label="Cerrar aviso" onClick={data.dismissError}><X size={16} /></button></div>}
            {data.connection === "offline" && !data.error && <div className="error-banner" role="status">Se perdió la conexión en tiempo real. Los cambios se sincronizarán al reconectar.</div>}
            <section className={`inbox-layout ${mobileThread ? "show-thread" : ""}`} aria-label="Centro de conversaciones">
              <ConversationList conversations={ordered} lastMessages={lastMessages} selectedId={selected?.id ?? null} loading={data.loading} onSelect={(id) => { setSelectedId(id); setMobileThread(true) }} />
              <ChatPanel key={selected?.id ?? "empty"} conversation={selected} messages={thread} busy={data.busy} loading={data.loading} onBack={() => setMobileThread(false)} onTogglePause={(paused) => selected ? data.togglePause(selected.id, paused) : Promise.resolve()} onSend={(text) => selected ? data.sendMessage(selected.id, text) : Promise.reject(new Error("Selecciona una conversación"))} />
            </section>
            <footer className="workspace-footer"><span>CTT-FISEI · Universidad Técnica de Ambato</span><span>Centro de atención</span></footer>
          </> : <CourseCatalog />}
        </div>
      </main>
      {showHelp && <div className="modal-backdrop" onClick={() => setShowHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-label="Guía del operador" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") setShowHelp(false) }} onClick={(event) => event.stopPropagation()}><button autoFocus className="icon-button modal-close" onClick={() => setShowHelp(false)} aria-label="Cerrar guía"><X size={20} /></button><span className="modal-icon"><GraduationCap size={28} /></span><h2>Guía del operador</h2><p>El asesor responde en Telegram y resume cada conversación. Aquí puedes acompañar al prospecto en tiempo real.</p><div className="help-step"><MessageSquare size={20} /><div><strong>Escucha y entiende</strong><p>Selecciona un chat para ver su historial, estado y resumen generado por IA.</p></div></div><div className="help-step"><Users size={20} /><div><strong>Toma el control</strong><p>“Intervenir” pausa la IA. Escribir una respuesta también la pausa automáticamente; el bot la reenvía a Telegram.</p></div></div><div className="help-step"><Check size={20} /><div><strong>Devuelve el control</strong><p>Pulsa “Reanudar IA” cuando termines. Si se detecta frustración, la IA se pausa por sí sola.</p></div></div><div className="help-footnote"><Radio size={15} /> El bot debe estar ejecutándose para entregar los mensajes a Telegram.</div></section></div>}
    </div>
  )
}
function Metric({ title, value, detail, icon, color }: { title: string; value: number | string; detail: string; icon: ReactNode; color: string }) {
  return <article className={`metric metric-${color}`} title={detail}><span className={`metric-icon ${color}`}>{icon}</span><div className="metric-copy"><span>{title}</span><strong className="metric-value">{value}</strong></div></article>
}
