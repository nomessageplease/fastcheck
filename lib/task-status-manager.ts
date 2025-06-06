import { supabase } from "@/lib/supabase/client"
import type { Task } from "@/lib/supabase/types"

export class TaskStatusManager {
  // Автоматическое обновление статусов задач
  static async updateTaskStatuses(userId: string): Promise<void> {
    try {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled")

      if (!tasks) return

      const now = new Date()
      const updates: Array<{ id: string; status: Task["status"] }> = []

      for (const task of tasks) {
        const startDate = new Date(task.start_date)
        const dueDate = new Date(task.due_date)
        const newStatus = this.calculateTaskStatus(task, now, startDate, dueDate)

        if (newStatus !== task.status) {
          updates.push({ id: task.id, status: newStatus })
        }
      }

      // Обновляем статусы пакетно
      for (const update of updates) {
        await supabase.from("tasks").update({ status: update.status }).eq("id", update.id)
      }

      console.log(`Обновлено статусов задач: ${updates.length}`)
    } catch (error) {
      console.error("Ошибка при обновлении статусов задач:", error)
    }
  }

  // Вычисление статуса задачи
  private static calculateTaskStatus(task: Task, now: Date, startDate: Date, dueDate: Date): Task["status"] {
    // Если задача уже завершена или отменена - не меняем
    if (task.status === "completed" || task.status === "cancelled") {
      return task.status
    }

    // Если время выполнения еще не началось
    if (now < startDate) {
      return "waiting"
    }

    // Если время выполнения идет
    if (now >= startDate && now <= dueDate) {
      return "in_progress"
    }

    // Если время выполнения прошло - ВСЕГДА ждет проверки (не просрочено!)
    if (now > dueDate) {
      return "pending_review"
    }

    return task.status
  }

  // Получение задач для срочной проверки
  static async getUrgentReviewTasks(userId: string): Promise<Task[]> {
    try {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_urgent", true)
        .eq("status", "pending_review")
        .order("due_date", { ascending: true })

      return tasks || []
    } catch (error) {
      console.error("Ошибка при получении срочных задач:", error)
      return []
    }
  }

  // Получение задач для ежедневной проверки
  static async getDailyReviewTasks(userId: string): Promise<Task[]> {
    try {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending_review")
        .order("due_date", { ascending: true })

      return tasks || []
    } catch (error) {
      console.error("Ошибка при получении задач для ежедневной проверки:", error)
      return []
    }
  }

  // Проведение проверки задачи
  static async reviewTask(
    userId: string,
    taskId: string,
    result: "completed" | "cancelled",
    note?: string,
    newDueDate?: string,
  ): Promise<void> {
    try {
      // Создаем лог проверки
      await supabase.from("review_logs").insert({
        user_id: userId,
        task_id: taskId,
        date: new Date().toISOString(),
        result,
        note: note || null,
      })

      // Обновляем статус задачи
      const updateData: any = { status: result }

      // Если задача продлена, обновляем срок и возвращаем в работу
      if (result === "extended" && newDueDate) {
        updateData.due_date = new Date(newDueDate).toISOString()
        updateData.status = "waiting" // Возвращаем в ожидание
      }

      await supabase.from("tasks").update(updateData).eq("id", taskId)
    } catch (error) {
      console.error("Ошибка при проведении проверки:", error)
      throw error
    }
  }

  // Проверка необходимости срочной проверки
  static async checkUrgentReviewNeeded(userId: string): Promise<boolean> {
    const urgentTasks = await this.getUrgentReviewTasks(userId)
    return urgentTasks.length > 0
  }

  // Проверка необходимости ежедневной проверки
  static async checkDailyReviewNeeded(userId: string, reviewTime: string): Promise<boolean> {
    const now = new Date()
    const [hours, minutes] = reviewTime.split(":").map(Number)

    const todayReviewTime = new Date()
    todayReviewTime.setHours(hours, minutes, 0, 0)

    // Если время проверки еще не наступило
    if (now < todayReviewTime) {
      return false
    }

    // Проверяем, была ли уже проверка сегодня
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayReviews } = await supabase
      .from("review_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", todayStart.toISOString())

    const hasReviewedToday = todayReviews && todayReviews.length > 0

    if (hasReviewedToday) {
      return false
    }

    // Проверяем, есть ли задачи для проверки
    const dailyTasks = await this.getDailyReviewTasks(userId)
    return dailyTasks.length > 0
  }
}
