import { getUserSettings } from "@/lib/review-utils"
import type { Task } from "@/lib/supabase/types"

export interface TaskUrgencyStatus {
  isOverdue: boolean
  isUrgent: boolean
  shouldHighlight: boolean
  hoursOverdue: number
}

export async function getTaskUrgencyStatus(task: Task, userId: string): Promise<TaskUrgencyStatus> {
  const now = new Date()
  const dueDate = new Date(task.due_date)
  const isOverdue = now > dueDate
  const hoursOverdue = isOverdue ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60)) : 0

  // Если задача уже завершена или отменена - не выделяем
  if (task.status === "completed" || task.status === "cancelled") {
    return {
      isOverdue,
      isUrgent: task.is_urgent,
      shouldHighlight: false,
      hoursOverdue,
    }
  }

  // Если задача не требует проверки - не выделяем
  if (task.status !== "pending_review") {
    return {
      isOverdue,
      isUrgent: task.is_urgent,
      shouldHighlight: false,
      hoursOverdue,
    }
  }

  let shouldHighlight = false

  if (task.is_urgent) {
    // Срочная задача: красная если не проверена в течение часа после окончания
    shouldHighlight = isOverdue && hoursOverdue >= 1
  } else {
    // Не срочная задача: красная если не проверена во время ежедневной проверки
    if (isOverdue) {
      try {
        const settings = await getUserSettings(userId)
        if (settings) {
          const reviewTime = settings.review_time.split(":")
          const reviewHour = Number.parseInt(reviewTime[0])
          const reviewMinute = Number.parseInt(reviewTime[1])

          // Создаем время ежедневной проверки на день окончания задачи
          const taskDueDay = new Date(dueDate)
          taskDueDay.setHours(reviewHour, reviewMinute, 0, 0)

          // Если текущее время больше времени ежедневной проверки в день окончания задачи
          shouldHighlight = now > taskDueDay
        } else {
          // Если нет настроек, используем дефолтное время 09:00
          const taskDueDay = new Date(dueDate)
          taskDueDay.setHours(9, 0, 0, 0)
          shouldHighlight = now > taskDueDay
        }
      } catch (error) {
        console.error("Ошибка при получении настроек для проверки срочности:", error)
        // В случае ошибки используем простую логику - через день после окончания
        shouldHighlight = hoursOverdue >= 24
      }
    }
  }

  return {
    isOverdue,
    isUrgent: task.is_urgent,
    shouldHighlight,
    hoursOverdue,
  }
}

export function getTaskCardClassName(shouldHighlight: boolean, needsReview: boolean): string {
  let className = "mb-3 cursor-pointer transition-all hover:shadow-md"

  if (shouldHighlight) {
    className += " bg-red-50 border-2 border-red-300 ring-2 ring-red-200"
  } else if (needsReview) {
    className += " ring-2 ring-yellow-300"
  }

  return className
}
