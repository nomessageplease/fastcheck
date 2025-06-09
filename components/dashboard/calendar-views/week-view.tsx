"use client"

import { useState } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, User, ChevronDown, ChevronUp } from "lucide-react"
import { getWeekStart, getWeekEnd, getTasksForDate, formatDateShort, isSameDay } from "@/lib/date-utils"
import { TaskDialog } from "../task-dialog"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

interface WeekViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  onTasksChange: () => void
}

export function WeekView({ tasks, projects, executors, onTasksChange }: WeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const isMobile = useMediaQuery("(max-width: 640px)")

  const weekStart = getWeekStart(currentDate)
  const weekEnd = getWeekEnd(currentDate)
  const today = new Date()

  // Создаем массив дней недели
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    weekDays.push(date)
  }

  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getWeekRange = () => {
    if (isMobile) {
      // Сокращенный формат для мобильных
      const startDay = weekStart.getDate()
      const endDay = weekEnd.getDate()
      const month = weekStart.toLocaleDateString("ru-RU", { month: "short" })
      return `${startDay}-${endDay} ${month}`
    }
    return `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`
  }

  const handleCreateTask = (date: Date) => {
    setSelectedDate(date)
    setTaskDialogOpen(true)
  }

  const toggleDayExpansion = (dateString: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dateString)) {
      newExpanded.delete(dateString)
    } else {
      newExpanded.add(dateString)
    }
    setExpandedDays(newExpanded)
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 border-green-300 text-green-800"
      case "in_progress":
        return "bg-blue-100 border-blue-300 text-blue-800"
      case "pending_review":
        return "bg-yellow-100 border-yellow-300 text-yellow-800"
      case "waiting":
        return "bg-gray-100 border-gray-300 text-gray-800"
      case "extended":
        return "bg-purple-100 border-purple-300 text-purple-800"
      case "cancelled":
        return "bg-red-100 border-red-300 text-red-800"
      default:
        return "bg-gray-100 border-gray-300 text-gray-800"
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "✓"
      case "in_progress":
        return "⏳"
      case "pending_review":
        return "👁"
      case "waiting":
        return "⏸"
      case "extended":
        return "📅"
      case "cancelled":
        return "❌"
      default:
        return "📋"
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  const getDayName = (date: Date) => {
    if (isMobile) {
      // Сокращенные названия дней для мобильных
      return date.toLocaleDateString("ru-RU", { weekday: "short" })
    }
    return date.toLocaleDateString("ru-RU", { weekday: "long" })
  }

  const renderSubtasks = (parentTask: Task, dayTasks: Task[]) => {
    const subtasks = dayTasks.filter((task) => task.parent_task_id === parentTask.id)
    if (subtasks.length === 0) return null

    return (
      <div className="ml-2 sm:ml-4 mt-2 space-y-2">
        {subtasks.map((subtask) => {
          const project = projects.find((p) => p.id === subtask.project_id)
          const executor = executors.find((e) => e.id === subtask.executor_id)

          return (
            <div
              key={subtask.id}
              className={cn("p-2 rounded-md border-l-2 text-sm", getStatusColor(subtask.status), "bg-opacity-50")}
              style={{ borderLeftColor: project?.color_icon }}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs opacity-60 shrink-0">└</span>
                    <h5 className="font-medium truncate text-xs sm:text-sm">{subtask.title}</h5>
                    {subtask.is_urgent && (
                      <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded shrink-0">!</span>
                    )}
                  </div>
                  {subtask.description && (
                    <p className="text-xs mt-1 opacity-80 line-clamp-1 sm:line-clamp-2">{subtask.description}</p>
                  )}
                </div>
                <span className="text-xs opacity-60 shrink-0 ml-1">{getStatusIcon(subtask.status)}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 text-xs opacity-70 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {formatTime(new Date(subtask.start_date))} - {formatTime(new Date(subtask.end_date))}
                  </span>
                </div>
                {executor && (
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{executor.name}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col w-full overflow-x-hidden px-2 sm:px-4">
      {/* Заголовок недели */}
      <div className={cn("flex items-center justify-between mb-4 sm:mb-6 w-full", isMobile && "flex-col gap-3")}>
        <div className={cn("flex items-center gap-1 sm:gap-4", isMobile && "w-full justify-between")}>
          <Button variant="outline" size={isMobile ? "sm" : "icon"} onClick={navigatePrev} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base sm:text-xl font-semibold truncate px-1">{getWeekRange()}</h2>
          <Button variant="outline" size={isMobile ? "sm" : "icon"} onClick={navigateNext} className="shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday} className="shrink-0 text-xs sm:text-sm">
            {isMobile ? "Сегодня" : "Сегодня"}
          </Button>
        </div>
        <Button
          onClick={() => setTaskDialogOpen(true)}
          size={isMobile ? "sm" : "default"}
          className={cn(isMobile && "w-full")}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isMobile ? "Задача" : "Новая задача"}
        </Button>
      </div>

      {/* Вертикальный список дней */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full space-y-3 sm:space-y-4">
        {weekDays.map((date) => {
          const dayTasks = getTasksForDate(tasks, date)
          const isToday = isSameDay(date, today)
          const dateString = date.toISOString().split("T")[0]
          const isExpanded = expandedDays.has(dateString)
          const mainTasks = dayTasks.filter((task) => !task.parent_task_id)

          return (
            <Card key={dateString} className={cn("transition-all", isToday && "ring-2 ring-blue-500 ring-inset")}>
              <CardHeader
                className="pb-2 sm:pb-3 cursor-pointer px-3 sm:px-6 py-3"
                onClick={() => dayTasks.length > 0 && toggleDayExpansion(dateString)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                    <div className="min-w-0 truncate">
                      <h3 className={cn("text-sm sm:text-lg font-semibold truncate", isToday && "text-blue-600")}>
                        {getDayName(date)}, {date.getDate()}{" "}
                        {isMobile
                          ? date.toLocaleDateString("ru-RU", { month: "short" })
                          : date.toLocaleDateString("ru-RU", { month: "long" })}
                      </h3>
                      {isToday && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">
                          Сегодня
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {dayTasks.length > 0 && (
                      <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-1 sm:px-2 py-1 rounded">
                        {dayTasks.length}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateTask(date)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {dayTasks.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {dayTasks.length === 0 ? (
                <CardContent className="pt-0 px-3 sm:px-6 pb-3">
                  <p className="text-gray-500 text-center py-2 sm:py-4 text-sm">Задач на этот день нет</p>
                </CardContent>
              ) : (
                isExpanded && (
                  <CardContent className="pt-0 px-3 sm:px-6 pb-3">
                    <div className="space-y-2 sm:space-y-3">
                      {mainTasks.map((task) => {
                        const project = projects.find((p) => p.id === task.project_id)
                        const executor = executors.find((e) => e.id === task.executor_id)

                        return (
                          <div key={task.id}>
                            <div
                              className={cn("p-2 sm:p-3 rounded-lg border-l-4", getStatusColor(task.status))}
                              style={{ borderLeftColor: project?.color_icon }}
                            >
                              <div className="flex items-start justify-between w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-medium truncate text-sm sm:text-base">{task.title}</h4>
                                    {task.is_urgent && (
                                      <span className="text-xs bg-red-100 text-red-800 px-1 sm:px-2 py-1 rounded-full shrink-0">
                                        {isMobile ? "!" : "Срочно"}
                                      </span>
                                    )}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-1 sm:line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm font-medium shrink-0 ml-2">{getStatusIcon(task.status)}</span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-600 gap-1 sm:gap-y-1">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                  <span className="truncate">
                                    {formatTime(new Date(task.start_date))} - {formatTime(new Date(task.end_date))}
                                  </span>
                                </div>
                                {executor && (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                    <span className="truncate">{executor.name}</span>
                                  </div>
                                )}
                              </div>

                              {project && (
                                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                                  {isMobile ? project.name : `Проект: ${project.name}`}
                                </div>
                              )}
                            </div>

                            {/* Подзадачи */}
                            {renderSubtasks(task, dayTasks)}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )
              )}
            </Card>
          )
        })}
      </div>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSuccess={onTasksChange}
        projects={projects}
        executors={executors}
        initialDate={selectedDate}
      />
    </div>
  )
}
