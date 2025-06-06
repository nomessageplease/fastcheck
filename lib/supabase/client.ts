import { createClient } from "@supabase/supabase-js"

// Получаем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
})

// Функция для получения текущего пользователя
export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) throw error
    return session?.user ?? null
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

// Функция для выхода
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}
