import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import type { Sale } from "../lib/statistics"

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const generation = useRef(0)
  const reload = useCallback(async () => {
    if (!supabase) { setError("Configura la conexión de Supabase para consultar ventas."); setLoading(false); return }
    const request = ++generation.current
    try {
      const records: Sale[] = []
      for (let offset = 0; ; offset += 1000) {
        const result = await supabase.from("sales").select("*").order("sold_at", { ascending: false }).order("id").range(offset, offset + 999)
        if (result.error) throw result.error
        records.push(...result.data as Sale[])
        if (result.data.length < 1000) break
      }
      if (request !== generation.current) return
      setSales(records)
      setError(null)
    } catch {
      if (request === generation.current) setError("No se pudieron consultar las ventas. Revisa la conexión y aplica supabase/sales.sql si es la primera vez.")
    } finally { if (request === generation.current) setLoading(false) }
  }, [])
  useEffect(() => {
    if (!supabase) { void reload(); return }
    const client = supabase
    let active = true
    const channel = client.channel("ctt-sales-statistics")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => { if (active) void reload() })
      .subscribe((status) => { if (active && status === "SUBSCRIBED") void reload() })
    const online = () => { if (active) void reload() }
    window.addEventListener("online", online)
    void reload()
    return () => { active = false; generation.current++; window.removeEventListener("online", online); void client.removeChannel(channel) }
  }, [reload])
  async function registerSale(sale: Omit<Sale, "id" | "created_at" | "sold_at">, id: string) {
    if (!supabase || savingRef.current) throw new Error("Espera a que termine la operación actual.")
    if (!Number.isFinite(sale.amount) || sale.amount <= 0) throw new Error("Ingresa un importe válido mayor que cero.")
    savingRef.current = true
    setSaving(true)
    try {
      // A stable ID makes a retry safe if the server saved but the connection dropped.
      const result = await supabase.from("sales").upsert({ ...sale, id }, { onConflict: "id", ignoreDuplicates: true }).select()
      if (result.error?.code === "23505") throw new Error("Este prospecto ya tiene una venta registrada para ese curso.")
      if (result.error) throw new Error("No se pudo guardar la venta. Revisa la conexión e intenta de nuevo.")
      await reload()
    } finally { savingRef.current = false; setSaving(false) }
  }
  return { sales, loading, error, saving, reload, registerSale }
}
