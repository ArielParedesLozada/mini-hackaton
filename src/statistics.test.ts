import { expect, test } from "vitest"
import { buildStatistics, periodStart, type Sale } from "../frontend/apps/web/src/lib/statistics"
import type { ChatMessage, Conversation } from "../frontend/apps/web/src/types"
const now = new Date("2026-10-29T15:00:00Z")
const prospect = (id: string, state = "interesado"): Conversation => ({ id, telegram_chat_id: 1, nombre: "Prueba", estado: state, resumen: "", ai_paused: false, alerta_inyeccion: false, created_at: "2026-10-28T10:00:00Z", last_message_at: "2026-10-29T10:00:00Z" })
const sale = (id: string, course: number, amount: number, soldAt = "2026-10-29T10:00:00Z"): Sale => ({ id, conversation_id: id, course_id: course, course_name: `Curso ${course}`, amount, sold_at: soldAt, created_at: soldAt })
const message = (id: string, role: ChatMessage["role"], createdAt: string): ChatMessage => ({ id, conversation_id: "a", role, content: "Mensaje", created_at: createdAt })

test("un lead caliente no se cuenta como venta ni produce ingresos", () => {
  const result = buildStatistics([prospect("a", "lead_caliente")], [], [], "7", now)
  expect(result.active).toHaveLength(1)
  expect(result.recentSales).toHaveLength(0)
  expect(result.income).toBe(0)
})
test("el filtro de siete días comienza a medianoche en Ecuador", () => {
  expect(periodStart("7", now)).toBe(new Date("2026-10-23T05:00:00Z").getTime())
  const result = buildStatistics([], [], [sale("a", 18, 60, "2026-10-23T04:59:59Z"), sale("b", 18, 65, "2026-10-23T05:00:00Z"), sale("c", 18, 100, "2026-10-30T05:00:00Z")], "7", now)
  expect(result.recentSales.map((s) => s.id)).toEqual(["b"])
  expect(result.income).toBe(65)
})
test("agrega importes en centavos y ordena los cursos por inscripciones", () => {
  const result = buildStatistics([], [], [sale("a", 18, 60.1), sale("b", 18, 60.2), sale("c", 2, 200)], "all", now)
  expect(result.income).toBe(320.3)
  expect(result.ranking[0]).toMatchObject({ id: 18, quantity: 2, income: 120.3 })
})
test("el porcentaje de IA usa respuestas y agrupa los mensajes por día ecuatoriano", () => {
  const result = buildStatistics([], [message("1", "user", "2026-10-29T04:00:00Z"), message("2", "bot", "2026-10-29T04:01:00Z"), message("3", "admin", "2026-10-29T05:01:00Z")], [], "7", now)
  expect(result.automation).toBe(50)
  expect(result.activity.find((day) => day.key === "2026-10-28")).toMatchObject({ user: 1, bot: 1, admin: 0 })
  expect(result.activity.find((day) => day.key === "2026-10-29")).toMatchObject({ user: 0, bot: 0, admin: 1 })
})
