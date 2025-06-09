"use client"

import { useState, useEffect, useRef } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Plus, CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react"
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
  const [expandedDay, setExpandedDay] = useState<Date | null>(null)
  const expandedCardRef = useRef<HTMLDivElement>(null)

  const isMobile = useMediaQuery("(max-width: 640px)")
  const isSmallMobile = useMediaQuery("(max-width: 380px)")

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
    return `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`
  }

  const handleDayClick = (date: Date) => {
    if (isMobile) {
      // На мобильных открываем расширенный вид
      setExpandedDay(date)
    } else {
      // На десктопе открываем диалог создания задачи
      setSelectedDate(date)
      setTaskDialogOpen(true)
    }
  }

  const handleAddTaskClick = (date: Date) => {
    setSelectedDate(date)
    setTaskDialogOpen(true)
    setExpandedDay(null) // Закрываем расширенный вид
  }

  const closeExpandedDay = () => {
    setExpandedDay(null)
  }

  // Закрытие расширенного дня при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedCardRef.current && !expandedCardRef.current.contains(event.target as Node)) {
        closeExpandedDay()
      }
    }

    if (expandedDay) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [expandedDay])

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "in_progress":
        return <Clock className="h-3 w-3 text-blue-500" />
      case "pending_review":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "waiting":
        return <Clock className="h-3 w-3 text-gray-500" />
      case "extended":
        return <Clock className="h-3 w-3 text-purple-500" />
      case "cancelled":
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  // Названия дней недели
  const dayNames = isMobile
    ? isSmallMobile
      ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    : ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

  // Форматирование даты для мобильного вида
  const formatMobileDate = (date: Date) => {
    return date.getDate()
  }

  // Получение количества задач для дня
  const getTaskCount = (date: Date) => {
    return getTasksForDate(tasks, date).length
  }

  // Получение проекта по ID
  const getProjectById = (projectId: string) => {
    return projects.find((p) => p.id === projectId)
  }

  return (
    <div className="relative">
      {/* Заголовок недели */}
      <div className={cn("flex items-center justify-between mb-6", isMobile && "flex-col gap-2")}>
        <div className={cn("flex items-center space-x-2 sm:space-x-4", isMobile && "w-full justify-between")}>
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold">{getWeekRange()}</h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday}>
            Сегодня
          </Button>
        </div>
        {!isMobile && (
          <Button onClick={() => setTaskDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая задача
          </Button>
        )}
      </div>

      {/* Мобильный вид недели */}
      {isMobile ? (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Заголовки дней недели */}
          {dayNames.map((name, index) => (
            <div key={`header-${index}`} className="text-center font-medium text-xs text-gray-500 py-1">
              {name}
            </div>
          ))}

          {/* Ячейки дней */}
          {weekDays.map((date) => {
            const dayTasks = getTasksForDate(tasks, date)
            const isToday = isSameDay(date, today)
            const dayOfMonth = date.getDate()
            const taskCount = dayTasks.length
            const hasUrgentTasks = dayTasks.some((task) => task.is_urgent)

            return (
              <Card
                key={date.toISOString()}
                className={cn(
                  "min-h-[100px] flex flex-col cursor-pointer touch-manipulation",
                  isToday && "ring-2 ring-blue-500",
                  hasUrgentTasks && "border-red-300",
                )}
                onClick={() => handleDayClick(date)}
              >
                <CardContent className="p-1 sm:p-2 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className={cn("text-base font-medium", isToday && "text-blue-600")}>{dayOfMonth}</span>
                      {isToday && <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1 rounded">•</span>}
                    </div>
                    {taskCount > 0 && (
                      <span className={cn("text-xs font-medium", hasUrgentTasks ? "text-red-500" : "text-blue-500")}>
                        {taskCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {taskCount === 0 ? (
                      <div className="h-full flex items-end justify-center">
                        <span className="text-[10px] text-gray-400">нет</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task) => {
                          const project = getProjectById(task.project_id)

                          return (
                            <div
                              key={task.id}
                              className="h-2 rounded-full"
                              style={{ backgroundColor: project?.color_icon || "#cbd5e1" }}
                            />
                          )
                        })}
                        {taskCount > 2 && <div className="text-[10px] text-gray-500 text-center">+{taskCount - 2}</div>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        // Десктопный вид недели (оригинальный)
        <div className="grid grid-cols-7 gap-2">
          {/* Заголовки дней недели */}
          {dayNames.map((name, index) => (
            <div key={`header-${index}`} className="text-center font-medium text-sm text-gray-500 py-2">
              {name}
            </div>
          ))}

          {/* Ячейки дней */}
          {weekDays.map((date) => {
            const dayTasks = getTasksForDate(tasks, date)
            const isToday = isSameDay(date, today)
            const dayOfMonth = date.getDate()

            return (
              <Card
                key={date.toISOString()}
                className={cn("min-h-[150px] flex flex-col", isToday && "ring-2 ring-blue-500")}
              >
                <CardContent className="p-2 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className={cn("text-lg font-medium", isToday && "text-blue-600")}>{dayOfMonth}</span>
                      {isToday && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Сегодня</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDayClick(date)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {dayTasks.length === 0 ? (
                      <p className="text-xs text-gray-400">Нет задач</p>
                    ) : (
                      <div className="space-y-1">
                        {dayTasks.map((task) => {
                          const project = projects.find((p) => p.id === task.project_id)
                          const executor = executors.find((e) => e.id === task.executor_id)

                          return (
                            <div
                              key={task.id}
                              className="flex items-center p-1 rounded-md border-l-2 bg-gray-50 text-xs"
                              style={{ borderLeftColor: project?.color_icon }}
                            >
                              {getStatusIcon(task.status)}
                              <div className="ml-1 truncate">
                                {task.title}
                                {task.is_urgent && (
                                  <span className="ml-1 inline-block bg-red-100 text-red-800 px-1 rounded text-[10px]">
                                    !
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Расширенный вид дня при клике на мобильном */}
      {expandedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeExpandedDay}>
          <div
            ref={expandedCardRef}
            className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                  <h3 className="text-lg font-semibold">
                    {expandedDay.toLocaleDateString("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {isSameDay(expandedDay, today) && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Сегодня</span>
                    )}
                  </h3>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8" onClick={closeExpandedDay}>
                  &times;
                </Button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
              {getTasksForDate(tasks, expandedDay).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Нет задач на этот день</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getTasksForDate(tasks, expandedDay).map((task) => {
                    const project = projects.find((p) => p.id === task.project_id)
                    const executor = executors.find((e) => e.id === task.executor_id)

                    return (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg"
                        style={{ borderLeftWidth: "4px", borderLeftColor: project?.color_icon }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium flex items-center">
                              {task.title}
                              {task.is_urgent && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">Срочно</span>
                              )}
                            </h4>
                            {project && <p className="text-sm text-gray-500 mt-1">{project.name}</p>}
                          </div>
                          <div className="flex items-center">
                            {getStatusIcon(task.status)}
                            <span className="text-xs ml-1 text-gray-500">
                              {task.status === "completed"
                                ? "Завершено"
                                : task.status === "in_progress"
                                  ? "В работе"
                                  : task.status === "pending_review"
                                    ? "На проверке"
                                    : task.status === "waiting"
                                      ? "Ожидание"
                                      : task.status === "extended"
                                        ? "Продлено"
                                        : task.status === "cancelled"
                                          ? "Отменено"
                                          : ""}
                            </span>
                          </div>
                        </div>

                        {task.description && <p className="text-sm mt-2 text-gray-600">{task.description}</p>}

                        {executor && (
                          <div className="mt-3 text-xs text-gray-500 flex items-center">
                            <span
                              className="inline-block h-3 w-3 rounded-full mr-1"
                              style={{ backgroundColor: executor.color_icon }}
                            ></span>
                            {executor.name}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                          {new Date(task.start_date).toLocaleDateString("ru-RU")}{" "}
                          {new Date(task.start_date).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          - {new Date(task.due_date).toLocaleDateString("ru-RU")}{" "}
                          {new Date(task.due_date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Кнопка добавления задачи */}
            <div className="p-4 border-t">
              <Button onClick={() => handleAddTaskClick(expandedDay)} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить задачу
              </Button>
            </div>
          </div>
        </div>
      )}

      <TaskDialog
        open={taskDialogOpen && selectedDate !== null}
        onOpenChange={(open) => {
          setTaskDialogOpen(open)
          if (!open) setSelectedDate(null)
        }}
        onSuccess={() => {
          onTasksChange()
          setSelectedDate(null)
        }}
        projects={projects}
        executors={executors}
        initialDate={selectedDate || undefined}
      />
    </div>
  )
}
