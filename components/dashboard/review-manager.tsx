"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { ReviewDialog } from "./review-dialog"
import { shouldShowDailyReview, getTasksForReview } from "@/lib/review-utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Bell, AlertTriangle } from "lucide-react"

interface ReviewManagerProps {
  user: User
  onReviewComplete: () => void
}

export function ReviewManager({ user, onReviewComplete }: ReviewManagerProps) {
  const { toast } = useToast()
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [pendingReviews, setPendingReviews] = useState(0)
  const [urgentTasks, setUrgentTasks] = useState(0)

  useEffect(() => {
    checkForReviews()

    // Проверяем каждые 5 минут
    const interval = setInterval(checkForReviews, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user.id])

  const checkForReviews = async () => {
    try {
      // Проверяем, нужно ли показать ежедневную проверку
      const shouldShow = await shouldShowDailyReview(user.id)

      // Получаем задачи для проверки
      const reviewTasks = await getTasksForReview(user.id)
      const urgentCount = reviewTasks.filter((task) => task.isUrgent).length

      setPendingReviews(reviewTasks.length)
      setUrgentTasks(urgentCount)

      // Показываем уведомление о ежедневной проверке
      if (shouldShow && reviewTasks.length > 0) {
        toast({
          title: "Время ежедневной проверки!",
          description: `У вас ${reviewTasks.length} задач для проверки`,
          action: (
            <Button size="sm" onClick={() => setShowReviewDialog(true)}>
              Проверить
            </Button>
          ),
        })
      }

      // Показываем уведомления о срочных задачах
      if (urgentCount > 0) {
        const urgentTasksNeedingReview = reviewTasks.filter(
          (task) => task.isUrgent && (task.isOverdue || task.task.status === "pending_review"),
        )

        if (urgentTasksNeedingReview.length > 0) {
          toast({
            title: "Срочные задачи требуют внимания!",
            description: `${urgentTasksNeedingReview.length} срочных задач требуют проверки`,
            variant: "destructive",
            action: (
              <Button size="sm" variant="destructive" onClick={() => setShowReviewDialog(true)}>
                Проверить
              </Button>
            ),
          })
        }
      }
    } catch (error) {
      console.error("Ошибка при проверке задач:", error)
    }
  }

  const handleManualReview = () => {
    setShowReviewDialog(true)
  }

  return (
    <>
      {/* Кнопка для ручной проверки */}
      {pendingReviews > 0 && (
        <Button
          variant={urgentTasks > 0 ? "destructive" : "outline"}
          size="sm"
          onClick={handleManualReview}
          className="relative"
        >
          {urgentTasks > 0 ? <AlertTriangle className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
          Проверки ({pendingReviews})
          {urgentTasks > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {urgentTasks}
            </span>
          )}
        </Button>
      )}

      <ReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        user={user}
        onReviewComplete={() => {
          onReviewComplete()
          checkForReviews() // Обновляем счетчики после проверки
        }}
      />
    </>
  )
}
