"use client"

import type { Task, Project, Executor } from "@/lib/supabase/types"
import type { User } from "@supabase/supabase-js"
import { MonthView } from "./calendar-views/month-view"
import { WeekView } from "./calendar-views/week-view"
import { DayView } from "./calendar-views/day-view"

interface TaskViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  user: User
  viewType: "month" | "week" | "day"
  onTasksChange: () => void
}

export function TaskView({ tasks, projects, executors, user, viewType, onTasksChange }: TaskViewProps) {
  const commonProps = {
    tasks,
    projects,
    executors,
    user,
    onTasksChange,
  }

  switch (viewType) {
    case "month":
      return <MonthView {...commonProps} />
    case "week":
      return <WeekView {...commonProps} />
    case "day":
      return <DayView {...commonProps} />
    default:
      return <DayView {...commonProps} />
  }
}
