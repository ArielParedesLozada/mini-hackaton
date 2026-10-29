import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const configurationError = !url || !key
  ? "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY."
  : null

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
