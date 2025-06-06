"use client"

import { useState } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { getDaysInMonth, getFirstDayOfMonth, getTasksForDate, isSameDay } from "@/lib/date-utils"
import { TaskDialog } from "../task-dialog"
import { cn } from "@/lib/utils"

interface MonthViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  onTasksChange: () => void
}

export function MonthView({ tasks, projects, executors, onTasksChange }: MonthViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()

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

  const navigatePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const navigateNext = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getMonthName = () => {
    return currentDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setTaskDialogOpen(true)
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

  return (
    <div>
      {/* Заголовок календаря */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Button variant="outline" size="icon" onClick={navigatePrev} className="h-8 w-8 lg:h-10 lg:w-10">
            <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
          </Button>
          <h2 className="text-lg lg:text-xl font-semibold">{getMonthName()}</h2>
          <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8 lg:h-10 lg:w-10">
            <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday} className="text-xs lg:text-sm">
            Сегодня
          </Button>
        </div>
        <Button onClick={() => setTaskDialogOpen(true)} size="sm" className="w-full lg:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="lg:inline">Новая задача</span>
        </Button>
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
              key={index}
              className={cn(
                "min-h-[80px] lg:min-h-[120px] cursor-pointer transition-colors hover:bg-gray-50",
                !day.isCurrentMonth && "bg-gray-50 opacity-50",
                isToday && "ring-2 ring-blue-500",
              )}
              onClick={() => handleDateClick(day.date)}
            >
              <CardContent className="p-1 lg:p-2">
                <div
                  className={cn(
                    "text-xs lg:text-sm mb-1 lg:mb-2",
                    !day.isCurrentMonth && "text-gray-400",
                    isToday && "font-bold",
                  )}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5 lg:space-y-1 max-h-[50px] lg:max-h-[80px] overflow-y-auto">
                  {dayTasks.slice(0, 2).map((task) => {
                    const project = projects.find((p) => p.id === task.project_id)
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "text-[10px] lg:text-xs p-0.5 lg:p-1 rounded border-l-2 truncate flex items-center gap-1",
                          getStatusColor(task.status),
                        )}
                        style={{ borderLeftColor: project?.color_icon }}
                        title={task.title}
                      >
                        <span className="flex-1 truncate">{task.title}</span>
                        {task.is_urgent && (
                          <span className="text-[8px] lg:text-[10px] bg-gray-200 text-gray-800 px-1 rounded border border-gray-400 flex-shrink-0">
                            !
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {dayTasks.length > 2 && (
                    <div className="text-[10px] lg:text-xs text-gray-500 text-center">+{dayTasks.length - 2} еще</div>
                  )}
                </div>
              </CardContent>
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
      />
    </div>
  )
}
