"use client"

import { useEffect, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { TaskStatusManager } from "@/lib/task-status-manager"
import { getUserSettings } from "@/lib/review-utils"
import {
  requestNotificationPermission,
  sendBrowserNotification,
  isNotificationSupported,
} from "@/lib/notification-utils"
import type { Task, Project } from "@/lib/supabase/types"
import { supabase } from "@/lib/supabase/client"

interface NotificationManagerProps {
  user: User
  tasks: Task[]
  projects: Project[]
  onOpenReview?: (taskId?: string) => void
}

export function NotificationManager({ user, tasks, projects, onOpenReview }: NotificationManagerProps) {
  const permissionRequestedRef = useRef(false)
  const notificationsSentRef = useRef(new Set<string>())
  const lastCheckTimeRef = useRef<Date>(new Date())

  useEffect(() => {
    // Запрашиваем разрешение на уведомления при первой загрузке
    if (!permissionRequestedRef.current) {
      requestNotificationPermission()
      permissionRequestedRef.current = true
    }

    // Проверяем уведомления при изменении задач
    checkNotifications()
  }, [user.id, tasks, projects])

  useEffect(() => {
    // Подписываемся на изменения задач в реальном времени
    const subscription = supabase
      .channel("task-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Task changed, checking notifications:", payload)
          // Небольшая задержка для обновления локального состояния
          setTimeout(checkNotifications, 500)
        },
      )
      .subscribe()

    // Проверяем уведомления каждую минуту для точности времени
    const interval = setInterval(checkNotifications, 60 * 1000)

    return () => {
      supabase.removeChannel(subscription)
      clearInterval(interval)
    }
  }, [user.id])

  const checkNotifications = async () => {
    try {
      // Проверяем, поддерживаются ли уведомления и есть ли разрешение
      if (!isNotificationSupported() || Notification.permission !== "granted") {
        return
      }

      const settings = await getUserSettings(user.id)
      if (!settings || !settings.push_notifications) return

      // Сначала обновляем статусы всех задач
      await TaskStatusManager.updateTaskStatuses(user.id)

      const now = new Date()

      // Проверяем задачи, которые только что перешли в pending_review
      await checkNewPendingReviewTasks(now)

      // Проверяем ежедневную проверку в назначенное время
      await checkDailyReviewTime(settings.review_time, now)

      // Проверяем дедлайны проектов
      await checkProjectDeadlines()

      lastCheckTimeRef.current = now
    } catch (error) {
      console.error("Ошибка при проверке уведомлений:", error)
    }
  }

  const checkNewPendingReviewTasks = async (now: Date) => {
    // Получаем задачи, которые недавно перешли в pending_review
    const pendingTasks = tasks.filter((task) => {
      const dueDate = new Date(task.due_date)
      const timeSinceDue = now.getTime() - dueDate.getTime()

      // Задача только что стала просроченной (в течение последних 2 минут)
      return task.status === "pending_review" && timeSinceDue >= 0 && timeSinceDue <= 2 * 60 * 1000
    })

    for (const task of pendingTasks) {
      const notificationId = `task-review-${task.id}`

      if (!notificationsSentRef.current.has(notificationId)) {
        const notification = sendBrowserNotification(
          task.is_urgent ? "Срочная задача требует проверки!" : "Задача требует проверки",
          {
            body: `Задача "${task.title}" завершена и ожидает проверки`,
            icon: "/favicon.ico",
            tag: `task-review-${task.id}`,
            requireInteraction: task.is_urgent,
            data: { type: "task_review", taskId: task.id },
          },
        )

        if (notification) {
          notification.onclick = () => {
            window.focus()
            onOpenReview?.(task.id)
            notification.close()
          }
        }

        notificationsSentRef.current.add(notificationId)

        // Удаляем из отправленных через 24 часа
        setTimeout(
          () => {
            notificationsSentRef.current.delete(notificationId)
          },
          24 * 60 * 60 * 1000,
        )
      }
    }
  }

  const checkDailyReviewTime = async (reviewTime: string, now: Date) => {
    const [hours, minutes] = reviewTime.split(":").map(Number)
    const reviewDateTime = new Date()
    reviewDateTime.setHours(hours, minutes, 0, 0)

    // Проверяем, что сейчас точно время проверки (с точностью до минуты)
    const currentTime = new Date()
    currentTime.setSeconds(0, 0)

    const isReviewTime = Math.abs(currentTime.getTime() - reviewDateTime.getTime()) < 60 * 1000

    if (isReviewTime) {
      const needsDailyReview = await TaskStatusManager.checkDailyReviewNeeded(user.id, reviewTime)

      if (needsDailyReview) {
        const dailyTasks = await TaskStatusManager.getDailyReviewTasks(user.id)
        const today = new Date().toDateString()
        const notificationId = `daily-review-${today}`

        if (!notificationsSentRef.current.has(notificationId)) {
          const notification = sendBrowserNotification("Время ежедневной проверки!", {
            body: `У вас ${dailyTasks.length} задач для проверки`,
            icon: "/favicon.ico",
            tag: "daily-review",
            requireInteraction: true,
            data: { type: "daily_review", taskIds: dailyTasks.map((t) => t.id) },
          })

          if (notification) {
            notification.onclick = () => {
              window.focus()
              onOpenReview?.()
              notification.close()
            }
          }

          notificationsSentRef.current.add(notificationId)
        }
      }
    }
  }

  const checkProjectDeadlines = async () => {
    const now = new Date()

    for (const project of projects) {
      const deadline = new Date(project.planned_finish)
      const timeDiff = deadline.getTime() - now.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

      // Уведомление за 7, 3 и 1 день до дедлайна (только один раз в день)
      if ([7, 3, 1].includes(daysDiff)) {
        const today = new Date().toDateString()
        const notificationId = `project-deadline-${project.id}-${daysDiff}-${today}`

        if (!notificationsSentRef.current.has(notificationId)) {
          const notification = sendBrowserNotification("Приближается дедлайн проекта!", {
            body: `До завершения проекта "${project.name}" осталось ${daysDiff} дней`,
            icon: "/favicon.ico",
            tag: `project-${project.id}`,
            requireInteraction: false,
            data: { type: "project_deadline", projectId: project.id },
          })

          if (notification) {
            notification.onclick = () => {
              window.focus()
              notification.close()
            }
          }

          notificationsSentRef.current.add(notificationId)
        }
      }
    }
  }

  // Компонент не рендерит ничего, только управляет уведомлениями
  return null
}
