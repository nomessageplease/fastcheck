"use client"

import { useState, useEffect } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, CheckCircle, Clock, AlertTriangle, Edit, Trash2, Eye } from "lucide-react"
import { getTasksForDate, isSameDay } from "@/lib/date-utils"
import { TaskDialog } from "../task-dialog"
import { ReviewDialog } from "../review-dialog"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"

interface DayViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  user: User
  onTasksChange: () => void
}

const getTimeRemaining = (dueDate: string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()

  if (diff <= 0) {
    return "Просрочено"
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}д ${hours}ч ${minutes}м`
  } else if (hours > 0) {
    return `${hours}ч ${minutes}м`
  } else {
    return `${minutes}м`
  }
}

export function DayView({ tasks, projects, executors, user, onTasksChange }: DayViewProps) {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined)
  const [reviewTaskId, setReviewTaskId] = useState<string | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Обновляем каждую минуту

    return () => clearInterval(interval)
  }, [])

  const today = new Date()
  const isToday = isSameDay(currentDate, today)

  const dayTasks = getTasksForDate(tasks, currentDate)

  // Группируем задачи по статусу
  const tasksByStatus = {
    waiting: dayTasks.filter((task) => task.status === "waiting"),
    in_progress: dayTasks.filter((task) => task.status === "in_progress"),
    pending_review: dayTasks.filter((task) => task.status === "pending_review"),
    completed: dayTasks.filter((task) => task.status === "completed"),
    extended: dayTasks.filter((task) => task.status === "extended"),
    cancelled: dayTasks.filter((task) => task.status === "cancelled"),
  }

  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getDayName = () => {
    return currentDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }

  const handleReviewTask = (task: Task) => {
    setReviewTaskId(task.id)
    setReviewDialogOpen(true)
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskToDelete.id)

      if (error) throw error

      toast({
        title: "Задача удалена",
        description: "Задача успешно удалена",
      })

      onTasksChange()
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTaskToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending_review":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "waiting":
        return <Clock className="h-4 w-4 text-gray-500" />
      case "extended":
        return <Clock className="h-4 w-4 text-purple-500" />
      case "cancelled":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "waiting":
        return "Ожидает выполнения"
      case "in_progress":
        return "Выполняется"
      case "pending_review":
        return "Ожидает проверки"
      case "completed":
        return "Выполнено"
      case "extended":
        return "Продлено"
      case "cancelled":
        return "Отменено"
      default:
        return "Неизвестно"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "waiting":
        return "bg-gray-500"
      case "in_progress":
        return "bg-blue-500"
      case "pending_review":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "extended":
        return "bg-purple-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const canReviewTask = (task: Task) => {
    const now = new Date()
    const dueDate = new Date(task.due_date)

    // Задача требует проверки если:
    // 1. Статус pending_review
    // 2. Срочная задача, которая просрочена
    return (
      task.status === "pending_review" ||
      (task.is_urgent && now > dueDate && task.status !== "completed" && task.status !== "cancelled")
    )
  }

  const renderTaskCard = (task: Task) => {
    const project = projects.find((p) => p.id === task.project_id)
    const executor = executors.find((e) => e.id === task.executor_id)
    const needsReview = canReviewTask(task)

    return (
      <Card
        key={task.id}
        className={cn("mb-3 cursor-pointer transition-all hover:shadow-md", needsReview && "ring-2 ring-yellow-300")}
        onClick={() => (needsReview ? handleReviewTask(task) : undefined)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            {/* Заголовок и статус */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1 min-w-0">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base leading-tight">{task.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.is_urgent && (
                      <Badge variant="outline" className="text-xs border-gray-400">
                        Срочно
                      </Badge>
                    )}
                    {needsReview && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                        Требует проверки
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {needsReview && (
                  <Button variant="ghost" size="icon" onClick={() => handleReviewTask(task)} className="h-8 w-8">
                    <Eye className="h-3 w-3 text-yellow-600" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)} className="h-8 w-8">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setTaskToDelete(task)
                    setDeleteDialogOpen(true)
                  }}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Описание */}
            {task.description && <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{task.description}</p>}

            {/* Метаинформация */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {project && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: project.color_icon }} />
                    <span className="truncate max-w-[120px]">{project.name}</span>
                  </div>
                )}
                {executor && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: executor.color_icon }} />
                    <span className="truncate max-w-[120px]">{executor.name}</span>
                  </div>
                )}
              </div>

              {task.status === "in_progress" && !task.executor_id && (
                <div className="flex items-center text-xs font-medium text-blue-600">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Осталось: {getTimeRemaining(task.due_date)}</span>
                </div>
              )}

              <div className="text-xs text-gray-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                  <span>
                    {new Date(task.start_date).toLocaleDateString("ru-RU")}{" "}
                    {new Date(task.start_date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="hidden sm:inline">—</span>
                  <span>
                    {new Date(task.due_date).toLocaleDateString("ru-RU")}{" "}
                    {new Date(task.due_date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderTaskSection = (status: Task["status"], tasks: Task[]) => {
    if (tasks.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
          <h3 className="font-medium text-gray-900">
            {getStatusLabel(status)} ({tasks.length})
          </h3>
          {status === "pending_review" && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Кликните для проверки
            </Badge>
          )}
        </div>
        <div className="space-y-2">{tasks.map(renderTaskCard)}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Заголовок дня */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={navigatePrev} className="h-8 w-8 flex-shrink-0">
              <span className="text-lg">←</span>
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8 flex-shrink-0">
              <span className="text-lg">→</span>
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday} className="text-xs px-2 h-8">
              Сегодня
            </Button>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-semibold leading-tight">{getDayName()}</h2>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          {tasksByStatus.pending_review.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewDialogOpen(true)}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-10"
            >
              <Eye className="h-4 w-4 mr-2" />
              Проверить все ({tasksByStatus.pending_review.length})
            </Button>
          )}
          <Button onClick={() => setTaskDialogOpen(true)} size="sm" className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Новая задача
          </Button>
        </div>
      </div>

      {/* Задачи по статусам */}
      {dayTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Нет задач на этот день</p>
          <Button onClick={() => setTaskDialogOpen(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Создать задачу
          </Button>
        </div>
      ) : (
        <div>
          {renderTaskSection("waiting", tasksByStatus.waiting)}
          {renderTaskSection("in_progress", tasksByStatus.in_progress)}
          {renderTaskSection("pending_review", tasksByStatus.pending_review)}
          {renderTaskSection("extended", tasksByStatus.extended)}
          {renderTaskSection("completed", tasksByStatus.completed)}
          {renderTaskSection("cancelled", tasksByStatus.cancelled)}
        </div>
      )}

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSuccess={() => {
          onTasksChange()
          setSelectedTask(undefined)
        }}
        task={selectedTask}
        projects={projects}
        executors={executors}
      />

      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        user={user}
        onReviewComplete={() => {
          onTasksChange()
          setReviewTaskId(undefined)
        }}
        specificTaskId={reviewTaskId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить задачу "{taskToDelete?.title}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
