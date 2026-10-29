import { useMemo, useState, type ReactNode } from "react"
import { ArrowUpRight, Banknote, BarChart3, Check, CircleDollarSign, GraduationCap, MessageSquare, Plus, RefreshCw, ShoppingBag, Sparkles, Users, X, Zap } from "lucide-react"
import { useSales } from "../hooks/useSales"
import { buildStatistics, type Period, type Sale } from "../lib/statistics"
import { STATES, type ChatMessage, type Conversation } from "../types"
import { courses } from "./CourseCatalog"
const money = (value: number) => new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value)
const date = (value: string) => new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))

export function StatisticsPanel({ conversations, messages, loading, dataError, onOpenConversation }: {
  conversations: Conversation[]; messages: ChatMessage[]; loading: boolean; dataError: string | null; onOpenConversation: (id: string) => void
}) {
  const data = useSales()
  const [period, setPeriod] = useState<Period>("7")
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [notice, setNotice] = useState("")
  const stats = useMemo(() => buildStatistics(conversations, messages, data.sales, period), [conversations, messages, data.sales, period])
  const states = Object.entries(STATES).map(([key, state]) => ({ ...state, key, count: stats.active.filter((conversation) => conversation.estado === key).length }))
  const maxActivity = Math.max(1, ...stats.activity.map((day) => day.user + day.bot + day.admin))
  const salesReady = !data.loading && !data.error
  return <div className="statistics-page">
    <div className="statistics-toolbar"><div className="period-control" aria-label="Período de estadísticas">{[{ value: "7", label: "7 días" }, { value: "30", label: "30 días" }, { value: "all", label: "Todo" }].map((option) => <button key={option.value} className={period === option.value ? "active" : ""} aria-pressed={period === option.value} onClick={() => setPeriod(option.value as Period)}>{option.label}</button>)}</div><button className="register-sale-button" disabled={!salesReady || !conversations.length} title={!conversations.length ? "Primero debe existir una conversación con el prospecto" : "Registrar una inscripción pagada"} onClick={() => { setNotice(""); setShowSaleForm(true) }}><Plus size={15} /> Registrar venta</button></div>
    {notice && <div className="sale-success" role="status"><Check size={16} />{notice}<button className="icon-button" aria-label="Cerrar confirmación" onClick={() => setNotice("")}><X size={14} /></button></div>}
    {(data.error || dataError) && <div className="error-banner" role="alert"><span>{data.error || dataError}</span><button onClick={() => void data.reload()}><RefreshCw size={14} /> Reintentar</button></div>}
    <div className="metrics stats-metrics">
      <Stat title="Conversaciones activas" value={loading || dataError ? "—" : stats.active.length} icon={<MessageSquare size={19} />} color="teal" />
      <Stat title="Cursos vendidos" value={salesReady ? stats.recentSales.length : "—"} icon={<ShoppingBag size={19} />} color="green" />
      <Stat title="Ingresos confirmados" value={salesReady ? money(stats.income) : "—"} icon={<CircleDollarSign size={19} />} color="amber" />
      <Stat title="Leads calientes" value={loading || dataError ? "—" : states.find((state) => state.key === "lead_caliente")?.count ?? 0} icon={<Zap size={19} />} color="violet" />
    </div>
    <div className="stats-chart-grid">
      <section className="stats-card activity-card"><header><h2>Actividad de mensajes</h2><span className="stats-card-counter">{loading || dataError ? "—" : stats.recentMessages.length} en el período</span></header><div className="activity-legend"><span><i className="user" />Prospectos</span><span><i className="bot" />Asesor IA</span><span><i className="admin" />Operador</span></div>
        <div className={`activity-chart ${period === "30" ? "many-days" : ""}`} role="img" aria-label={`Mensajes por día. ${stats.activity.map((day) => `${day.label}: ${day.user + day.bot + day.admin}`).join("; ")}`}>
          {stats.activity.map((day) => <div className="activity-column" key={day.key} title={`${day.label}: ${day.user} mensajes de prospectos, ${day.bot} de IA, ${day.admin} de operadores`}><span className="activity-total">{day.user + day.bot + day.admin || ""}</span><div className="activity-track"><div className="activity-stack" style={{ height: `${(day.user + day.bot + day.admin) / maxActivity * 100}%` }}>{day.admin > 0 && <span className="admin" style={{ flex: day.admin }} />}{day.bot > 0 && <span className="bot" style={{ flex: day.bot }} />}{day.user > 0 && <span className="user" style={{ flex: day.user }} />}</div></div><span className="activity-label">{day.label}</span></div>)}
        </div><div className="stats-chart-foot"><span><Sparkles size={14} />{stats.automation}% de respuestas con IA</span><span>{period === "all" ? "Gráfico: últimos 7 días" : "Hora de Ecuador"}</span></div>
      </section>
      <section className="stats-card intent-card"><header><h2>Estado de prospectos</h2><Users size={17} /></header><p className="stats-description">Estado actual de las conversaciones con actividad en el período.</p><div className="intent-list">{states.map((state) => <div className="intent-row" key={state.key}><div><span className={`state-badge ${state.color}`}><span />{state.label}</span><strong>{loading || dataError ? "—" : state.count}</strong></div><div className="intent-track"><span className={state.color} style={{ width: `${stats.active.length ? state.count / stats.active.length * 100 : 0}%` }} /></div></div>)}</div><div className="attention-summary"><span><Users size={14} /> IA pausada</span><strong>{stats.active.filter((c) => c.ai_paused).length}</strong></div></section>
    </div>
    <div className="stats-sales-grid">
      <section className="stats-card"><header><h2>Cursos más vendidos</h2><GraduationCap size={18} /></header>{stats.ranking.length && salesReady ? <div className="ranking-list">{stats.ranking.map((course, index) => <div className="ranking-row" key={course.id}><span className="ranking-position">{String(index + 1).padStart(2, "0")}</span><div className="ranking-course"><strong>{course.name}</strong><span>{course.quantity} {course.quantity === 1 ? "inscripción" : "inscripciones"}</span></div><strong className="ranking-income">{money(course.income)}</strong></div>)}</div> : <Empty icon={<GraduationCap size={25} />} title={data.loading ? "Cargando ventas" : data.error ? "Ventas no disponibles" : "Aún no hay ventas registradas"} text="Las inscripciones pagadas aparecerán aquí al registrarlas." />}</section>
      <section className="stats-card"><header><h2>Ventas recientes</h2><Banknote size={18} /></header>{stats.recentSales.length && salesReady ? <div className="recent-sales">{stats.recentSales.slice(0, 8).map((sale) => { const prospect = conversations.find((c) => c.id === sale.conversation_id); return <button className="recent-sale-row" key={sale.id} onClick={() => onOpenConversation(sale.conversation_id)} title="Abrir conversación del prospecto"><span className="sale-row-icon"><ShoppingBag size={15} /></span><span className="recent-sale-copy"><strong>{prospect?.nombre || "Prospecto"}</strong><span>{sale.course_name}</span><time>{date(sale.sold_at)}</time></span><strong className="sale-amount">{money(Number(sale.amount))}<ArrowUpRight size={13} /></strong></button> })}</div> : <Empty icon={<BarChart3 size={25} />} title={data.loading ? "Consultando registros" : data.error ? "Revisa la conexión de ventas" : "Sin movimientos en este período"} text="Registra la primera venta para comenzar a medir los resultados." />}</section>
    </div>
    <p className="statistics-note">Una venta corresponde a una inscripción pagada registrada por el operador. Los ingresos son la suma de esos importes, en dólares. Períodos calculados en hora de Ecuador.</p>
    {showSaleForm && <SaleForm conversations={conversations} sales={data.sales} saving={data.saving} onClose={() => setShowSaleForm(false)} onSave={async (sale, id) => { await data.registerSale(sale, id); setShowSaleForm(false); setNotice("Venta registrada correctamente.") }} />}
  </div>
}
function Stat({ title, value, icon, color }: { title: string; value: string | number; icon: ReactNode; color: string }) {
  return <article className={`metric metric-${color}`}><span className={`metric-icon ${color}`}>{icon}</span><div className="metric-copy"><span>{title}</span><strong className="metric-value">{value}</strong></div></article>
}
function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="stats-empty"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>
}
function SaleForm({ conversations, sales, saving, onClose, onSave }: { conversations: Conversation[]; sales: Sale[]; saving: boolean; onClose: () => void; onSave: (sale: Omit<Sale, "id" | "created_at" | "sold_at">, id: string) => Promise<void> }) {
  const [id] = useState(() => crypto.randomUUID())
  const [conversationId, setConversationId] = useState("")
  const [courseId, setCourseId] = useState("")
  const [amount, setAmount] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState("")
  const course = courses.find((course) => course.id === Number(courseId))
  const duplicate = sales.some((sale) => sale.conversation_id === conversationId && sale.course_id === Number(courseId))
  return <div className="modal-backdrop" onClick={() => { if (!saving) onClose() }}><section className="sale-modal" role="dialog" aria-modal="true" aria-label="Registrar venta" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape" && !saving) onClose() }}><button className="icon-button modal-close" aria-label="Cerrar registro de venta" disabled={saving} onClick={onClose}><X size={19} /></button><h2>Registrar venta</h2><p>Asocia una inscripción pagada con el curso y el prospecto.</p><form onSubmit={async (event) => { event.preventDefault(); if (!course || !conversationId || !confirmed || duplicate || saving) return; setError(""); try { await onSave({ conversation_id: conversationId, course_id: course.id, course_name: course.nombre, amount: Number(amount) }, id) } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la venta.") } }}>
    <label>Prospecto<select required autoFocus value={conversationId} disabled={saving} onChange={(event) => setConversationId(event.target.value)}><option value="">Selecciona una conversación</option>{conversations.map((c) => <option key={c.id} value={c.id}>{c.nombre || "Prospecto"} · {c.telegram_chat_id}</option>)}</select></label>
    <label>Curso<select required value={courseId} disabled={saving} onChange={(event) => { setCourseId(event.target.value); const next = courses.find((c) => c.id === Number(event.target.value)); setAmount(next?.precios.publico == null ? "" : String(next.precios.publico)) }}><option value="">Selecciona el curso vendido</option>{courses.filter((c) => c.estado === "ABIERTO").map((c) => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>
    <label>Importe pagado (USD)<input type="number" min="0.01" max="99999999.99" step="0.01" required value={amount} disabled={saving} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
    {course && <div className="sale-price-options">{[{ key: "estudianteUta", label: "Estudiante UTA" }, { key: "docenteUta", label: "Docente / graduado" }, { key: "publico", label: "Público" }].map((tier) => { const value = course.precios[tier.key as keyof typeof course.precios]; return value != null ? <button type="button" key={tier.key} disabled={saving} onClick={() => setAmount(String(value))}>{tier.label} · {money(value)}</button> : null })}</div>}
    <label className="sale-confirm"><input type="checkbox" required checked={confirmed} disabled={saving} onChange={(event) => setConfirmed(event.target.checked)} />Confirmo que esta inscripción fue pagada.</label>
    {duplicate && <p role="alert" className="sale-form-error">Este prospecto ya tiene una venta registrada para ese curso.</p>}{error && <p role="alert" className="sale-form-error">{error}</p>}
    <button type="submit" className="register-sale-button sale-save" disabled={saving || duplicate || !confirmed || !course || !conversationId || !amount}>{saving ? <span className="loading-spinner" /> : <Check size={16} />}{saving ? "Guardando…" : "Confirmar venta"}</button>
  </form></section></div>
}
