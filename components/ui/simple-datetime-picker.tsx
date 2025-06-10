"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, RotateCcw } from "lucide-react"

interface SimpleDateTimePickerProps {
  initialStart?: Date
  initialEnd?: Date
  onChange?: (start: Date, end: Date) => void
  className?: string
  minDate?: Date
  maxDate?: Date
}

// Функция для форматирования даты для input[type="date"]
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Функция для форматирования времени для input[type="time"]
const formatTimeForInput = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, "0") // Округляем до 15 минут
  return `${hours}:${minutes}`
}

// Функция для создания даты из строк даты и времени
const createDateFromInputs = (dateStr: string, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const date = new Date(dateStr)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export default function SimpleDateTimePicker({
  initialStart,
  initialEnd,
  onChange,
  className,
  minDate,
  maxDate,
}: SimpleDateTimePickerProps) {
  const [startDate, setStartDate] = useState(initialStart || new Date())
  const [endDate, setEndDate] = useState(initialEnd || new Date())

  // Состояния для полей ввода
  const [startDateStr, setStartDateStr] = useState(formatDateForInput(startDate))
  const [startTimeStr, setStartTimeStr] = useState(formatTimeForInput(startDate))
  const [endDateStr, setEndDateStr] = useState(formatDateForInput(endDate))
  const [endTimeStr, setEndTimeStr] = useState(formatTimeForInput(endDate))

  // Обновляем строки при изменении дат
  useEffect(() => {
    setStartDateStr(formatDateForInput(startDate))
    setStartTimeStr(formatTimeForInput(startDate))
    setEndDateStr(formatDateForInput(endDate))
    setEndTimeStr(formatTimeForInput(endDate))
  }, [startDate, endDate])

  // Обновляем даты при изменении строк
  useEffect(() => {
    if (startDateStr && startTimeStr) {
      const newStartDate = createDateFromInputs(startDateStr, startTimeStr)
      if (!isNaN(newStartDate.getTime())) {
        setStartDate(newStartDate)
      }
    }
  }, [startDateStr, startTimeStr])

  useEffect(() => {
    if (endDateStr && endTimeStr) {
      const newEndDate = createDateFromInputs(endDateStr, endTimeStr)
      if (!isNaN(newEndDate.getTime())) {
        setEndDate(newEndDate)
      }
    }
  }, [endDateStr, endTimeStr])

  // Вызываем onChange при изменении дат
  useEffect(() => {
    if (onChange && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      onChange(startDate, endDate)
    }
  }, [startDate, endDate, onChange])

  // Быстрые кнопки для установки популярных периодов
  const setQuickPeriod = (hours: number) => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(9, 0, 0, 0) // Начало в 9:00

    const end = new Date(start.getTime() + hours * 60 * 60 * 1000)

    setStartDate(start)
    setEndDate(end)
  }

  const resetToDefaults = () => {
    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setHours(9, 0, 0, 0)

    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    defaultEnd.setHours(17, 30, 0, 0)

    setStartDate(defaultStart)
    setEndDate(defaultEnd)
  }

  // Форматирование минимальной и максимальной даты для input
  const minDateStr = minDate ? formatDateForInput(minDate) : undefined
  const maxDateStr = maxDate ? formatDateForInput(maxDate) : undefined

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Отображение выбранного периода */}
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Выбранный период:</div>
        <div className="font-medium text-sm">
          {startDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}{" "}
          {startDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" — "}
          {endDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}{" "}
          {endDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Быстрые кнопки */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickPeriod(8)} className="text-xs">
          1 день
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickPeriod(40)} className="text-xs">
          1 неделя
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickPeriod(160)} className="text-xs">
          1 месяц
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetToDefaults} className="text-xs">
          <RotateCcw className="w-3 h-3 mr-1" />
          Сброс
        </Button>
      </div>

      {/* Дата и время начала */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          <Label className="text-sm font-medium">Начало</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-xs text-gray-500">
              Дата
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              min={minDateStr}
              max={maxDateStr}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="start-time" className="text-xs text-gray-500">
              Время
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              step="900" // 15 минут
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Дата и время окончания */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-600" />
          <Label className="text-sm font-medium">Окончание</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs text-gray-500">
              Дата
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              min={startDateStr} // Дата окончания не может быть раньше даты начала
              max={maxDateStr}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="end-time" className="text-xs text-gray-500">
              Время
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              step="900" // 15 минут
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Предупреждение о некорректном периоде */}
      {startDate >= endDate && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">⚠️ Дата окончания должна быть позже даты начала</div>
        </div>
      )}
    </div>
  )
}
