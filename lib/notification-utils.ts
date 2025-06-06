import { supabase } from "@/lib/supabase/client"

export interface NotificationData {
  id?: string
  user_id: string
  title: string
  message: string
  type: "task_reminder" | "task_overdue" | "daily_review" | "project_deadline" | "system"
  data?: any
  read: boolean
  created_at?: string
}

// Проверяем поддержку уведомлений в браузере
export function isNotificationSupported(): boolean {
  return "Notification" in window
}

// Запрашиваем разрешение на уведомления
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied"
  }

  // Если разрешение уже есть, возвращаем его
  if (Notification.permission !== "default") {
    return Notification.permission
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error("Ошибка при запросе разрешения на уведомления:", error)
    return "denied"
  }
}

// Отправляем браузерное уведомление
export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported()) {
    console.warn("Уведомления не поддерживаются в этом браузере")
    return null
  }

  if (Notification.permission !== "granted") {
    console.warn("Нет разрешения на отправку уведомлений")
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      dir: "ltr",
      lang: "ru",
      renotify: false,
      silent: false,
      ...options,
    })

    // Автоматически закрываем через 10 секунд, если не требуется взаимодействие
    if (!options?.requireInteraction) {
      setTimeout(() => {
        notification.close()
      }, 10000)
    }

    // Обработчики событий
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    notification.onerror = (error) => {
      console.error("Ошибка уведомления:", error)
    }

    return notification
  } catch (error) {
    console.error("Ошибка при создании уведомления:", error)
    return null
  }
}

// Сохраняем уведомление в базу данных (для истории)
export async function saveNotification(notification: Omit<NotificationData, "id" | "created_at">) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        ...notification,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Ошибка при сохранении уведомления:", error)
    throw error
  }
}

// Получаем уведомления пользователя
export async function getUserNotifications(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Ошибка при получении уведомлений:", error)
    return []
  }
}

// Отмечаем уведомление как прочитанное
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (error) throw error
  } catch (error) {
    console.error("Ошибка при отметке уведомления как прочитанного:", error)
    throw error
  }
}

// Отмечаем все уведомления как прочитанные
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) throw error
  } catch (error) {
    console.error("Ошибка при отметке всех уведомлений как прочитанных:", error)
    throw error
  }
}

// Удаляем уведомление
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) throw error
  } catch (error) {
    console.error("Ошибка при удалении уведомления:", error)
    throw error
  }
}

// Создаем уведомление о задаче и сохраняем в БД
export async function createTaskNotification(
  userId: string,
  taskTitle: string,
  type: "task_reminder" | "task_overdue",
  taskId: string,
) {
  const notification: Omit<NotificationData, "id" | "created_at"> = {
    user_id: userId,
    title: type === "task_reminder" ? "Напоминание о задаче" : "Задача просрочена",
    message:
      type === "task_reminder"
        ? `Не забудьте выполнить задачу: ${taskTitle}`
        : `Задача "${taskTitle}" просрочена и требует внимания`,
    type,
    data: { taskId },
    read: false,
  }

  // Сохраняем в базу для истории
  await saveNotification(notification)

  // Отправляем браузерное уведомление
  sendBrowserNotification(notification.title, {
    body: notification.message,
    tag: `task-${taskId}`,
    data: { taskId, type },
    requireInteraction: type === "task_overdue",
  })
}

// Создаем уведомление о ежедневной проверке
export async function createDailyReviewNotification(userId: string, tasksCount: number) {
  const notification: Omit<NotificationData, "id" | "created_at"> = {
    user_id: userId,
    title: "Время ежедневной проверки",
    message: `У вас ${tasksCount} задач для проверки`,
    type: "daily_review",
    data: { tasksCount },
    read: false,
  }

  await saveNotification(notification)

  sendBrowserNotification(notification.title, {
    body: notification.message,
    tag: "daily-review",
    data: { type: "daily_review" },
    requireInteraction: true,
  })
}

// Создаем уведомление о дедлайне проекта
export async function createProjectDeadlineNotification(
  userId: string,
  projectName: string,
  projectId: string,
  daysLeft: number,
) {
  const notification: Omit<NotificationData, "id" | "created_at"> = {
    user_id: userId,
    title: "Приближается дедлайн проекта",
    message: `До завершения проекта "${projectName}" осталось ${daysLeft} дней`,
    type: "project_deadline",
    data: { projectId, daysLeft },
    read: false,
  }

  await saveNotification(notification)

  sendBrowserNotification(notification.title, {
    body: notification.message,
    tag: `project-${projectId}`,
    data: { projectId, type: "project_deadline" },
    requireInteraction: false,
  })
}

// Проверяем, можно ли отправить уведомление (для предотвращения спама)
export function canSendNotification(lastSent: Date | null, cooldownMinutes = 30): boolean {
  if (!lastSent) return true

  const now = new Date()
  const timeDiff = now.getTime() - lastSent.getTime()
  const minutesDiff = timeDiff / (1000 * 60)

  return minutesDiff >= cooldownMinutes
}
