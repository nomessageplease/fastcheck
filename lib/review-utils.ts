import { supabase } from "@/lib/supabase/client"
import type { Task, Settings } from "@/lib/supabase/types"

export interface TaskReview {
  task: Task
  isOverdue: boolean
  isUrgent: boolean
  daysOverdue: number
}

export async function getTasksForReview(userId: string): Promise<TaskReview[]> {
  try {
    // Получаем все задачи пользователя, которые требуют проверки
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending_review", "in_progress"])
      .order("due_date", { ascending: true })

    if (!tasks) return []

    const now = new Date()
    const reviewTasks: TaskReview[] = []

    for (const task of tasks) {
      const dueDate = new Date(task.due_date)
      const isOverdue = now > dueDate
      const daysOverdue = isOverdue ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      // Добавляем задачу в список для проверки если:
      // 1. Она просрочена
      // 2. Она срочная и срок подошел
      // 3. Она в статусе "ждет проверки"
      if (isOverdue || task.is_urgent || task.status === "pending_review") {
        reviewTasks.push({
          task,
          isOverdue,
          isUrgent: task.is_urgent,
          daysOverdue,
        })
      }
    }

    return reviewTasks
  } catch (error) {
    console.error("Ошибка при получении задач для проверки:", error)
    return []
  }
}

export async function getUserSettings(userId: string): Promise<Settings | null> {
  try {
    console.log("Загружаем настройки пользователя:", userId)

    // Используем maybeSingle() чтобы не падать при отсутствии записи
    const { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).maybeSingle()

    if (error) {
      console.error("Ошибка при получении настроек:", error.message, error.details)
      return null
    }

    if (!data) {
      console.log("Настройки не найдены, создаем дефолтные для пользователя:", userId)

      // Создаем дефолтные настройки
      const defaultSettings = {
        user_id: userId,
        review_time: "09:00",
        push_notifications: true,
      }

      const { error: insertError, data: insertedData } = await supabase
        .from("settings")
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        console.error("Не удалось создать дефолтные настройки:", insertError.message, insertError.details)
        return null
      }

      console.log("Дефолтные настройки созданы:", insertedData)
      return insertedData as Settings
    }

    console.log("Настройки найдены:", data)
    return data as Settings
  } catch (error) {
    console.error("Неожиданная ошибка при получении настроек:", error)
    return null
  }
}

export async function shouldShowDailyReview(userId: string): Promise<boolean> {
  try {
    const settings = await getUserSettings(userId)
    if (!settings) return false

    const now = new Date()
    const reviewTime = settings.review_time.split(":")
    const reviewHour = Number.parseInt(reviewTime[0])
    const reviewMinute = Number.parseInt(reviewTime[1])

    // Создаем время проверки на сегодня
    const todayReviewTime = new Date()
    todayReviewTime.setHours(reviewHour, reviewMinute, 0, 0)

    // Проверяем, прошло ли время ежедневной проверки
    const hasPassedReviewTime = now >= todayReviewTime

    // Проверяем, была ли уже проверка сегодня
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayReviews } = await supabase
      .from("review_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", todayStart.toISOString())

    const hasReviewedToday = todayReviews && todayReviews.length > 0

    return hasPassedReviewTime && !hasReviewedToday
  } catch (error) {
    console.error("Ошибка при проверке времени ежедневной проверки:", error)
    return false
  }
}

export async function createReviewLog(
  userId: string,
  taskId: string,
  result: "completed" | "extended" | "cancelled",
  note?: string,
) {
  try {
    const { error } = await supabase.from("review_logs").insert({
      user_id: userId,
      task_id: taskId,
      date: new Date().toISOString(),
      result,
      note: note || null,
    })

    if (error) throw error
  } catch (error) {
    console.error("Ошибка при создании лога проверки:", error)
    throw error
  }
}

export async function updateTaskAfterReview(
  taskId: string,
  result: "completed" | "extended" | "cancelled",
  newDueDate?: string,
) {
  try {
    const updateData: any = {
      status: result,
    }

    // Если задача продлена, обновляем срок выполнения
    if (result === "extended" && newDueDate) {
      updateData.due_date = new Date(newDueDate).toISOString()
      updateData.status = "in_progress" // Возвращаем в работу
    }

    const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId)

    if (error) throw error
  } catch (error) {
    console.error("Ошибка при обновлении задачи после проверки:", error)
    throw error
  }
}
