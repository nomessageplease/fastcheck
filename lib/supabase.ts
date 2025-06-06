import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для базы данных
export interface Project {
  id: string
  name: string
  description: string
  color_icon: string
  user_id: string
  start_date: string
  planned_finish: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: string
  project_id: string
  parent_id: string | null
  user_id: string
  due_date: string
  priority: string
  created_at: string
}

export interface ReviewLog {
  id: string
  task_id: string
  user_id: string
  date: string
  result: string
  note: string
  created_at: string
}
