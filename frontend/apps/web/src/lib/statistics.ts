import type { ChatMessage, Conversation } from "../types"

export type Sale = {
  id: string
  conversation_id: string
  course_id: number
  course_name: string
  amount: number
  sold_at: string
  created_at: string
}
export type Period = "7" | "30" | "all"
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit" })
export function dayKey(value: string | Date) { return dayFormat.format(new Date(value)) }
export function periodStart(period: Period, now = new Date()) {
  if (period === "all") return 0
  const today = new Date(`${dayKey(now)}T00:00:00-05:00`)
  return today.getTime() - (Number(period) - 1) * 86400000
}
export function buildStatistics(conversations: Conversation[], messages: ChatMessage[], sales: Sale[], period: Period, now = new Date()) {
  const start = periodStart(period, now)
  const end = now.getTime()
  const inPeriod = (date: string) => { const time = new Date(date).getTime(); return time >= start && time <= end }
  const recentMessages = messages.filter((message) => inPeriod(message.created_at))
  const recentSales = sales.filter((sale) => inPeriod(sale.sold_at)).sort((a, b) => b.sold_at.localeCompare(a.sold_at))
  const activeIds = new Set(recentMessages.map((message) => message.conversation_id))
  for (const sale of recentSales) activeIds.add(sale.conversation_id)
  const active = conversations.filter((conversation) => activeIds.has(conversation.id) || inPeriod(conversation.created_at))
  const incomeCents = recentSales.reduce((sum, sale) => sum + Math.round(Number(sale.amount) * 100), 0)
  const replies = recentMessages.filter((message) => message.role !== "user")
  const botReplies = replies.filter((message) => message.role === "bot").length
  const ranking = new Map<number, { id: number; name: string; quantity: number; income: number }>()
  for (const sale of recentSales) {
    const row = ranking.get(sale.course_id) ?? { id: sale.course_id, name: sale.course_name, quantity: 0, income: 0 }
    row.quantity += 1
    row.income += Math.round(Number(sale.amount) * 100)
    ranking.set(sale.course_id, row)
  }
  const days = period === "30" ? 30 : 7
  const today = new Date(`${dayKey(now)}T00:00:00-05:00`).getTime()
  const activity = Array.from({ length: days }, (_, index) => {
    const date = new Date(today - (days - 1 - index) * 86400000)
    const key = dayKey(date)
    const daily = recentMessages.filter((message) => dayKey(message.created_at) === key)
    return { key, label: new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short" }).format(date), user: daily.filter((m) => m.role === "user").length, bot: daily.filter((m) => m.role === "bot").length, admin: daily.filter((m) => m.role === "admin").length }
  })
  return { active, recentMessages, recentSales, income: incomeCents / 100, botReplies, replyCount: replies.length, automation: replies.length ? Math.round(botReplies / replies.length * 100) : 0, ranking: [...ranking.values()].sort((a, b) => b.quantity - a.quantity || b.income - a.income).map((row) => ({ ...row, income: row.income / 100 })), activity }
}
