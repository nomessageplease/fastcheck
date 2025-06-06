export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color_icon: string
  start_date: string
  planned_finish: string
  created_at: string
}

export interface Executor {
  id: string
  user_id: string
  name: string
  color_icon: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string
  parent_id: string | null
  executor_id: string | null
  title: string
  description: string | null
  start_date: string
  due_date: string
  is_urgent: boolean
  status: "waiting" | "in_progress" | "pending_review" | "completed" | "extended" | "cancelled"
  created_at: string
  // Relations
  project?: Project
  executor?: Executor
  subtasks?: Task[]
}

export interface Settings {
  id: string
  user_id: string
  review_time: string
  push_notifications: boolean
  created_at: string
}

export interface ReviewLog {
  id: string
  user_id: string
  task_id: string
  date: string
  result: "completed" | "extended" | "cancelled"
  note: string | null
  created_at: string
}
