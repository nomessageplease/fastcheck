"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TaskStatusManager } from "@/lib/task-status-manager"
import type { Task } from "@/lib/supabase/types"
import { supabase } from "@/lib/supabase/client"

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onReviewComplete: () => void
  specificTaskId?: string // Для проверки конкретной задачи
}

export function ReviewDialog({ open, onOpenChange, user, onReviewComplete, specificTaskId }: ReviewDialogProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reviewNote, setReviewNote] = useState("")
  const [extendedDate, setExtendedDate] = useState("")

  useEffect(() => {
    if (open) {
      loadTasksForReview()
    }
  }, [open, user.id, specificTaskId])

  const loadTasksForReview = async () => {
    setLoading(true)
    try {
      let reviewTasks: Task[] = []

      if (specificTaskId) {
        // Загружаем конкретную задачу
        const { data: task } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", specificTaskId)
          .eq("user_id", user.id)
          .single()

        if (task && (task.status === "pending_review" || task.is_urgent)) {
          reviewTasks = [task]
        }
      } else {
        // Загружаем все задачи для проверки
        const urgentTasks = await TaskStatusManager.getUrgentReviewTasks(user.id)
        const dailyTasks = await TaskStatusManager.getDailyReviewTasks(user.id)

        // Объединяем и убираем дубликаты
        const allTasks = [...urgentTasks, ...dailyTasks]
        reviewTasks = allTasks.filter((task, index, self) => index === self.findIndex((t) => t.id === task.id))
      }

      setTasks(reviewTasks)
      setCurrentTaskIndex(0)
    } catch (error) {
      console.error("Ошибка при загрузке задач для проверки:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (result: "completed" | "cancelled") => {
    if (tasks.length === 0) return

    const currentTask = tasks[currentTaskIndex]
    setLoading(true)

    try {
      await TaskStatusManager.reviewTask(
        user.id,
        currentTask.id,
        result,
        reviewNote,
        result === "extended" ? extendedDate : undefined,
      )

      toast({
        title: "Проверка завершена",
        description: `Задача "${currentTask.title}" ${
          result === "completed" ? "отмечена как выполненная" : "отменена"
        }`,
      })

      // Переходим к следующей задаче или закрываем диалог
      if (currentTaskIndex < tasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1)
        setReviewNote("")
        setExtendedDate("")
      } else {
        // Все задачи проверены
        onReviewComplete()
        onOpenChange(false)
        toast({
          title: "Проверка завершена",
          description: specificTaskId ? "Задача проверена!" : "Все задачи проверены!",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExtend = async () => {
    if (!extendedDate) {
      toast({
        title: "Ошибка",
        description: "Укажите новый срок выполнения",
        variant: "destructive",
      })
      return
    }

    const currentTask = tasks[currentTaskIndex]
    setLoading(true)

    try {
      await TaskStatusManager.reviewTask(user.id, currentTask.id, "extended" as any, reviewNote, extendedDate)

      toast({
        title: "Задача продлена",
        description: `Задача "${currentTask.title}" продлена до ${new Date(extendedDate).toLocaleDateString("ru-RU")}`,
      })

      // Переходим к следующей задаче или закрываем диалог
      if (currentTaskIndex < tasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1)
        setReviewNote("")
        setExtendedDate("")
      } else {
        onReviewComplete()
        onOpenChange(false)
        toast({
          title: "Проверка завершена",
          description: specificTaskId ? "Задача проверена!" : "Все задачи проверены!",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending_review":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading && tasks.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Загрузка задач для проверки...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (tasks.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Проверка задач</DialogTitle>
            <DialogDescription>
              {specificTaskId ? "Задача не требует проверки" : "Нет задач, требующих проверки"}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Все задачи в порядке!</p>
            <p className="text-gray-500">
              {specificTaskId
                ? "Эта задача не требует проверки или уже была проверена"
                : "Нет задач, требующих проверки"}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const currentTask = tasks[currentTaskIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {specificTaskId ? "Проверка задачи" : `Проверка задач (${currentTaskIndex + 1} из ${tasks.length})`}
          </DialogTitle>
          <DialogDescription>Проверьте выполнение задачи и выберите действие</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о задаче */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(currentTask.status)}
                  <div>
                    <CardTitle className="text-lg">{currentTask.title}</CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      {currentTask.is_urgent && <Badge variant="destructive">Срочная</Badge>}
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Ожидает проверки
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentTask.description && <p className="text-gray-600 mb-4">{currentTask.description}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Начало: {formatDate(currentTask.start_date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Срок: {formatDate(currentTask.due_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Форма проверки */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="review-note">Комментарий к проверке (необязательно)</Label>
              <Textarea
                id="review-note"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Добавьте комментарий о результате проверки..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="extended-date">Новый срок (только для продления)</Label>
              <Input
                id="extended-date"
                type="datetime-local"
                value={extendedDate}
                onChange={(e) => setExtendedDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Прогресс (только для множественной проверки) */}
          {!specificTaskId && tasks.length > 1 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Прогресс проверки</span>
                <span>
                  {currentTaskIndex + 1} / {tasks.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentTaskIndex + 1) / tasks.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отложить
          </Button>
          <div className="space-x-2">
            <Button variant="destructive" onClick={() => handleReview("cancelled")} disabled={loading}>
              Отменить
            </Button>
            <Button variant="outline" onClick={handleExtend} disabled={loading || !extendedDate}>
              Продлить
            </Button>
            <Button onClick={() => handleReview("completed")} disabled={loading}>
              Выполнено
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
