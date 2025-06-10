"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"

interface DateTimeScrollPickerProps {
  initialStart?: Date
  initialEnd?: Date
  onChange?: (start: Date, end: Date) => void
  className?: string
}

export default function DateTimeScrollPicker({
  initialStart,
  initialEnd,
  onChange,
  className,
}: DateTimeScrollPickerProps) {
  const [mode, setMode] = useState<"date" | "time">("date")
  const [startDate, setStartDate] = useState(initialStart || new Date())
  const [endDate, setEndDate] = useState(initialEnd || new Date())

  // Refs для скролл-контейнеров
  const startYearRef = useRef<HTMLDivElement>(null)
  const startMonthRef = useRef<HTMLDivElement>(null)
  const startDayRef = useRef<HTMLDivElement>(null)
  const startHourRef = useRef<HTMLDivElement>(null)
  const startMinuteRef = useRef<HTMLDivElement>(null)

  const endYearRef = useRef<HTMLDivElement>(null)
  const endMonthRef = useRef<HTMLDivElement>(null)
  const endDayRef = useRef<HTMLDivElement>(null)
  const endHourRef = useRef<HTMLDivElement>(null)
  const endMinuteRef = useRef<HTMLDivElement>(null)

  // Генерация массивов для выбора
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ]
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, "0"))

  // Обновление дат при изменении
  useEffect(() => {
    if (onChange) {
      onChange(startDate, endDate)
    }
  }, [startDate, endDate, onChange])

  // Функция для создания скролл-селектора
  const createScrollSelector = (
    items: (string | number)[],
    selectedValue: string | number,
    onSelect: (value: string | number) => void,
    ref: React.RefObject<HTMLDivElement>,
  ) => {
    const [initialScroll, setInitialScroll] = useState<number | null>(null)

    useEffect(() => {
      if (ref.current) {
        const selectedIndex = items.findIndex((item) => item.toString() === selectedValue.toString())
        if (selectedIndex !== -1) {
          setInitialScroll(selectedIndex * 40)
        }
      }
    }, [selectedValue, items, ref])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      const itemHeight = 40
      const scrollTop = container.scrollTop
      const centerIndex = Math.round(scrollTop / itemHeight)
      const selectedItem = items[centerIndex]

      if (selectedItem !== undefined) {
        onSelect(selectedItem)
      }
    }

    return (
      <div
        ref={ref}
        className="h-32 overflow-y-auto scrollbar-hide relative"
        onScroll={handleScroll}
        style={{ scrollSnapType: "y mandatory", ...(initialScroll !== null ? { scrollTop: initialScroll } : {}) }}
      >
        {/* Padding сверху и снизу для центрирования */}
        <div className="h-12"></div>
        {items.map((item, index) => (
          <div
            key={index}
            className="h-10 flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-gray-100 transition-colors"
            style={{ scrollSnapAlign: "center" }}
            onClick={() => {
              onSelect(item)
              if (ref.current) {
                ref.current.scrollTop = index * 40
              }
            }}
          >
            {item}
          </div>
        ))}
        <div className="h-12"></div>

        {/* Индикатор выбранного элемента */}
        <div className="absolute top-1/2 left-0 right-0 h-10 border-t-2 border-b-2 border-blue-500 bg-blue-50/50 pointer-events-none transform -translate-y-1/2"></div>
      </div>
    )
  }

  // Обработчики изменения даты начала
  const handleStartYearChange = (year: string | number) => {
    const newDate = new Date(startDate)
    newDate.setFullYear(Number(year))
    setStartDate(newDate)
  }

  const handleStartMonthChange = (monthIndex: string | number) => {
    const newDate = new Date(startDate)
    newDate.setMonth(Number(monthIndex))
    setStartDate(newDate)
  }

  const handleStartDayChange = (day: string | number) => {
    const newDate = new Date(startDate)
    newDate.setDate(Number(day))
    setStartDate(newDate)
  }

  const handleStartHourChange = (hour: string | number) => {
    const newDate = new Date(startDate)
    newDate.setHours(Number(hour))
    setStartDate(newDate)
  }

  const handleStartMinuteChange = (minute: string | number) => {
    const newDate = new Date(startDate)
    newDate.setMinutes(Number(minute))
    setStartDate(newDate)
  }

  // Обработчики изменения даты конца
  const handleEndYearChange = (year: string | number) => {
    const newDate = new Date(endDate)
    newDate.setFullYear(Number(year))
    setEndDate(newDate)
  }

  const handleEndMonthChange = (monthIndex: string | number) => {
    const newDate = new Date(endDate)
    newDate.setMonth(Number(monthIndex))
    setEndDate(newDate)
  }

  const handleEndDayChange = (day: string | number) => {
    const newDate = new Date(endDate)
    newDate.setDate(Number(day))
    setEndDate(newDate)
  }

  const handleEndHourChange = (hour: string | number) => {
    const newDate = new Date(endDate)
    newDate.setHours(Number(hour))
    setEndDate(newDate)
  }

  const handleEndMinuteChange = (minute: string | number) => {
    const newDate = new Date(endDate)
    newDate.setMinutes(Number(minute))
    setEndDate(newDate)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Переключатель режима */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "date" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("date")}
          className="flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Дата
        </Button>
        <Button
          type="button"
          variant={mode === "time" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("time")}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Время
        </Button>
      </div>

      {/* Отображение выбранного периода */}
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Выбранный период:</div>
        <div className="font-medium">
          {startDate.toLocaleDateString("ru-RU")}{" "}
          {startDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          {" — "}
          {endDate.toLocaleDateString("ru-RU")}{" "}
          {endDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {mode === "date" ? (
        <div className="space-y-4">
          {/* Дата начала */}
          <div>
            <div className="text-sm font-medium mb-2">Дата начала</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Год</div>
                {createScrollSelector(years, startDate.getFullYear(), handleStartYearChange, startYearRef)}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Месяц</div>
                {createScrollSelector(
                  months.map((month, index) => index),
                  startDate.getMonth(),
                  handleStartMonthChange,
                  startMonthRef,
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">День</div>
                {createScrollSelector(
                  Array.from(
                    { length: getDaysInMonth(startDate.getFullYear(), startDate.getMonth()) },
                    (_, i) => i + 1,
                  ),
                  startDate.getDate(),
                  handleStartDayChange,
                  startDayRef,
                )}
              </div>
            </div>
          </div>

          {/* Дата конца */}
          <div>
            <div className="text-sm font-medium mb-2">Дата окончания</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Год</div>
                {createScrollSelector(years, endDate.getFullYear(), handleEndYearChange, endYearRef)}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Месяц</div>
                {createScrollSelector(
                  months.map((month, index) => index),
                  endDate.getMonth(),
                  handleEndMonthChange,
                  endMonthRef,
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">День</div>
                {createScrollSelector(
                  Array.from({ length: getDaysInMonth(endDate.getFullYear(), endDate.getMonth()) }, (_, i) => i + 1),
                  endDate.getDate(),
                  handleEndDayChange,
                  endDayRef,
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Время начала */}
          <div>
            <div className="text-sm font-medium mb-2">Время начала</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Час</div>
                {createScrollSelector(
                  hours,
                  startDate.getHours().toString().padStart(2, "0"),
                  handleStartHourChange,
                  startHourRef,
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Минута</div>
                {createScrollSelector(
                  minutes,
                  Math.floor(startDate.getMinutes() / 15) * 15,
                  handleStartMinuteChange,
                  startMinuteRef,
                )}
              </div>
            </div>
          </div>

          {/* Время конца */}
          <div>
            <div className="text-sm font-medium mb-2">Время окончания</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Час</div>
                {createScrollSelector(
                  hours,
                  endDate.getHours().toString().padStart(2, "0"),
                  handleEndHourChange,
                  endHourRef,
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 text-center">Минута</div>
                {createScrollSelector(
                  minutes,
                  Math.floor(endDate.getMinutes() / 15) * 15,
                  handleEndMinuteChange,
                  endMinuteRef,
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
