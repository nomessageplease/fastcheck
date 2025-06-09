"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, X, Clock, User } from "lucide-react"
import { getDaysInMonth, getFirstDayOfMonth, getTasksForDate, isSameDay } from "@/lib/date-utils"
import { TaskDialog } from "../task-dialog"
import { cn } from "@/lib/utils"

interface MonthViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  onTasksChange: () => void
}

interface MonthData {
  year: number
  month: number
  id: string
}

export function MonthView({ tasks, projects, executors, onTasksChange }: MonthViewProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const [months, setMonths] = useState<MonthData[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const today = new Date()

  // Инициализация месяцев - текущий месяц сверху
  useEffect(() => {
    const currentDate = new Date()
    const initialMonths: MonthData[] = []

    // Добавляем текущий месяц и следующие 11 месяцев
    for (let i = 0; i <= 11; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      initialMonths.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        id: `${date.getFullYear()}-${date.getMonth()}`,
      })
    }

    setMonths(initialMonths)
  }, [])

  // Автоматический скролл к текущему месяцу при загрузке
  useEffect(() => {
    if (months.length > 0 && isInitialLoad) {
      // Небольшая задержка для рендеринга элементов
      setTimeout(() => {
        scrollToToday()
        setIsInitialLoad(false)
      }, 100)
    }
  }, [months, isInitialLoad])

  const scrollToToday = () => {
    const todayId = `${today.getFullYear()}-${today.getMonth()}`
    const todayElement = monthRefs.current.get(todayId)

    if (todayElement && scrollContainerRef.current) {
      todayElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const getMonthName = (year: number, month: number) => {
    return new Date(year, month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  }

  const handleDateClick = (date: Date) => {
    setExpandedDate(date)
  }

  const handleCreateTask = (date: Date) => {
    setSelectedDate(date)
    setTaskDialogOpen(true)
    setExpandedDate(null)
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 border-green-300"
      case "in_progress":
        return "bg-blue-100 border-blue-300"
      case "pending_review":
        return "bg-yellow-100 border-yellow-300"
      case "waiting":
        return "bg-gray-100 border-gray-300"
      case "extended":
        return "bg-purple-100 border-purple-300"
      case "cancelled":
        return "bg-red-100 border-red-300"
      default:
        return "bg-gray-100 border-gray-300"
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

  const renderMonth = (monthData: MonthData) => {
    const { year, month, id } = monthData
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    // Создаем массив дней для отображения в календаре
    const calendarDays = []

    // Добавляем дни предыдущего месяца
    const prevMonthDays = getDaysInMonth(year, month - 1)
    for (let i = firstDayOfMonth - 1; i > 0; i--) {
      calendarDays.push({
        date: new Date(year, month - 1, prevMonthDays - i + 1),
        isCurrentMonth: false,
      })
    }

    // Добавляем дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      })
    }

    // Добавляем дни следующего месяца до заполнения 42 ячеек (6 недель)
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      })
    }

    return (
      <div
        key={id}
        ref={(el) => {
          if (el) {
            monthRefs.current.set(id, el)
          }
        }}
        data-month-id={id}
        className="mb-8"
      >
        {/* Заголовок месяца */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-center">{getMonthName(year, month)}</h3>
        </div>

        {/* Заголовки дней недели */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Календарная сетка */}
        <div className="grid grid-cols-7 gap-0.5 lg:gap-1">
          {calendarDays.map((day, index) => {
            const dayTasks = getTasksForDate(tasks, day.date)
            const isToday = isSameDay(day.date, today)

            return (
              <Card
                key={`${id}-${index}`}
                className={cn(
                  "min-h-[60px] sm:min-h-[80px] lg:min-h-[120px] cursor-pointer transition-all duration-300 hover:bg-gray-50",
                  !day.isCurrentMonth && "bg-gray-50 opacity-50",
                  isToday && "ring-2 ring-blue-500",
                )}
                onClick={() => handleDateClick(day.date)}
              >
                <CardContent className="p-1 sm:p-2">
                  <div
                    className={cn(
                      "text-xs sm:text-sm mb-1",
                      !day.isCurrentMonth && "text-gray-400",
                      isToday && "font-bold",
                    )}
                  >
                    {day.date.getDate()}
                  </div>

                  <div className="space-y-0.5 max-h-[30px] sm:max-h-[50px] lg:max-h-[80px] overflow-y-auto">
                    {dayTasks.slice(0, 2).map((task) => {
                      const project = projects.find((p) => p.id === task.project_id)
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "text-[8px] sm:text-[10px] lg:text-xs p-0.5 rounded border-l-2 truncate flex items-center gap-1",
                            getStatusColor(task.status),
                          )}
                          style={{ borderLeftColor: project?.color_icon }}
                          title={task.title}
                        >
                          <span className="flex-1 truncate">{task.title}</span>
                          {task.is_urgent && (
                            <span className="text-[6px] sm:text-[8px] lg:text-[10px] bg-gray-200 text-gray-800 px-0.5 rounded border border-gray-400 flex-shrink-0">
                              !
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] sm:text-[10px] lg:text-xs text-gray-500 text-center">
                        +{dayTasks.length - 2} еще
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current

    // Добавляем месяцы вперед при приближении к концу
    if (scrollTop + clientHeight > scrollHeight - 1000) {
      setMonths((prev) => {
        const lastMonth = prev[prev.length - 1]
        const newMonths = []

        for (let i = 1; i <= 6; i++) {
          const date = new Date(lastMonth.year, lastMonth.month + i, 1)
          newMonths.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            id: `${date.getFullYear()}-${date.getMonth()}`,
          })
        }

        return [...prev, ...newMonths]
      })
    }

    // Добавляем месяцы назад при приближении к началу
    if (scrollTop < 1000) {
      setMonths((prev) => {
        const firstMonth = prev[0]
        const newMonths = []

        for (let i = 6; i >= 1; i--) {
          const date = new Date(firstMonth.year, firstMonth.month - i, 1)
          newMonths.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            id: `${date.getFullYear()}-${date.getMonth()}`,
          })
        }

        return [...newMonths, ...prev]
      })
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок с текущим видимым месяцем */}
      <div className="flex items-center justify-between mb-4 lg:mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
        <h2 className="text-lg lg:text-xl font-semibold">Календарь</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={scrollToToday} className="text-xs lg:text-sm">
            Сегодня
          </Button>
          <Button onClick={() => setTaskDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="lg:inline">Новая задача</span>
          </Button>
        </div>
      </div>

      {/* Скроллируемый контейнер с месяцами */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="px-1">{months.map(renderMonth)}</div>
      </div>

      {/* Расширенный вид дня */}
      {expandedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">
                {expandedDate.toLocaleDateString("ru-RU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setExpandedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Список задач */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {(() => {
                const dayTasks = getTasksForDate(tasks, expandedDate)
                if (dayTasks.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-4xl mb-2">📅</div>
                      <p>Задач на этот день нет</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    {dayTasks.map((task) => {
                      const project = projects.find((p) => p.id === task.project_id)
                      const executor = executors.find((e) => e.id === task.executor_id)

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "p-3 rounded-lg border-l-4 bg-gray-50",
                            getStatusColor(task.status).replace("border-", "border-l-"),
                          )}
                          style={{ borderLeftColor: project?.color_icon }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            <div className="flex items-center gap-1">
                              {task.is_urgent && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Срочно</span>
                              )}
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
                                {getStatusIcon(task.status)}
                                {task.status === "completed" && "Выполнено"}
                                {task.status === "in_progress" && "В работе"}
                                {task.status === "pending_review" && "На проверке"}
                                {task.status === "waiting" && "Ожидание"}
                                {task.status === "extended" && "Продлено"}
                                {task.status === "cancelled" && "Отменено"}
                              </span>
                            </div>
                          </div>

                          {task.description && <p className="text-xs text-gray-600 mb-2">{task.description}</p>}

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatTime(new Date(task.start_date))} - {formatTime(new Date(task.end_date))}
                              </span>
                            </div>
                            {executor && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{executor.name}</span>
                              </div>
                            )}
                          </div>

                          {project && (
                            <div className="mt-2 text-xs text-gray-500">
                              Проект: <span className="font-medium">{project.name}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Кнопка добавления задачи */}
            <div className="p-4 border-t bg-gray-50">
              <Button onClick={() => handleCreateTask(expandedDate)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Добавить задачу
              </Button>
            </div>
          </div>
        </div>
      )}

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
