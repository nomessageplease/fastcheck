"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"

interface DateTimeScrollPickerProps {
  initialStart?: Date
  initialEnd?: Date
  onChange?: (start: Date, end: Date) => void
  className?: string
  minDate?: Date
  maxDate?: Date
}

export default function DateTimeScrollPicker({
  initialStart,
  initialEnd,
  onChange,
  className,
  minDate,
  maxDate,
}: DateTimeScrollPickerProps) {
  const [mode, setMode] = useState<"date" | "time">("date")
  const [startDate, setStartDate] = useState(initialStart || new Date())
  const [endDate, setEndDate] = useState(initialEnd || new Date())

  // Мемоизированные массивы для выбора
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const minYear = minDate ? minDate.getFullYear() : currentYear
    const maxYear = maxDate ? maxDate.getFullYear() : currentYear + 5
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  }, [minDate, maxDate])

  const months = useMemo(
    () => [
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
    ],
    [],
  )

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }, [])

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), [])
  const minutes = useMemo(() => Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, "0")), [])

  // Обновление дат при изменении
  useEffect(() => {
    if (onChange) {
      onChange(startDate, endDate)
    }
  }, [startDate, endDate, onChange])

  // Оптимизированная функция для создания скролл-селектора
  const createScrollSelector = useCallback(
    (
      items: (string | number)[],
      selectedValue: string | number,
      onSelect: (value: string | number) => void,
      label: string,
    ) => {
      const scrollRef = useRef<HTMLDivElement>(null)
      const [isScrolling, setIsScrolling] = useState(false)

      useEffect(() => {
        if (scrollRef.current && !isScrolling) {
          const selectedIndex = items.findIndex((item) => item.toString() === selectedValue.toString())
          if (selectedIndex !== -1) {
            scrollRef.current.scrollTop = selectedIndex * 40
          }
        }
      }, [selectedValue, items, isScrolling])

      const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
          if (!isScrolling) setIsScrolling(true)

          const container = e.currentTarget
          const itemHeight = 40
          const scrollTop = container.scrollTop
          const centerIndex = Math.round(scrollTop / itemHeight)
          const selectedItem = items[centerIndex]

          if (selectedItem !== undefined && selectedItem.toString() !== selectedValue.toString()) {
            onSelect(selectedItem)
          }

          // Сброс флага скроллинга через небольшую задержку
          setTimeout(() => setIsScrolling(false), 100)
        },
        [items, selectedValue, onSelect, isScrolling],
      )

      const handleItemClick = useCallback(
        (item: string | number, index: number) => {
          onSelect(item)
          if (scrollRef.current) {
            scrollRef.current.scrollTop = index * 40
          }
        },
        [onSelect],
      )

      return (
        <div className="flex flex-col">
          <div className="text-xs text-gray-500 mb-1 text-center font-medium">{label}</div>
          <div
            ref={scrollRef}
            className="h-32 overflow-y-auto scrollbar-hide relative bg-gray-50 rounded-lg"
            onScroll={handleScroll}
            style={{ scrollSnapType: "y mandatory" }}
          >
            {/* Padding сверху и снизу для центрирования */}
            <div className="h-12"></div>
            {items.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="h-10 flex items-center justify-center text-base font-medium cursor-pointer hover:bg-blue-50 transition-colors duration-150"
                style={{ scrollSnapAlign: "center" }}
                onClick={() => handleItemClick(item, index)}
              >
                {item}
              </div>
            ))}
            <div className="h-12"></div>

            {/* Индикатор выбранного элемента */}
            <div className="absolute top-1/2 left-1 right-1 h-10 border-2 border-blue-500 bg-blue-100/30 rounded-md pointer-events-none transform -translate-y-1/2"></div>
          </div>
        </div>
      )
    },
    [],
  )

  // Обработчики изменения даты начала
  const handleStartYearChange = useCallback(
    (year: string | number) => {
      const newDate = new Date(startDate)
      newDate.setFullYear(Number(year))
      setStartDate(newDate)
    },
    [startDate],
  )

  const handleStartMonthChange = useCallback(
    (monthIndex: string | number) => {
      const newDate = new Date(startDate)
      newDate.setMonth(Number(monthIndex))
      setStartDate(newDate)
    },
    [startDate],
  )

  const handleStartDayChange = useCallback(
    (day: string | number) => {
      const newDate = new Date(startDate)
      newDate.setDate(Number(day))
      setStartDate(newDate)
    },
    [startDate],
  )

  const handleStartHourChange = useCallback(
    (hour: string | number) => {
      const newDate = new Date(startDate)
      newDate.setHours(Number(hour))
      setStartDate(newDate)
    },
    [startDate],
  )

  const handleStartMinuteChange = useCallback(
    (minute: string | number) => {
      const newDate = new Date(startDate)
      newDate.setMinutes(Number(minute))
      setStartDate(newDate)
    },
    [startDate],
  )

  // Обработчики изменения даты конца
  const handleEndYearChange = useCallback(
    (year: string | number) => {
      const newDate = new Date(endDate)
      newDate.setFullYear(Number(year))
      setEndDate(newDate)
    },
    [endDate],
  )

  const handleEndMonthChange = useCallback(
    (monthIndex: string | number) => {
      const newDate = new Date(endDate)
      newDate.setMonth(Number(monthIndex))
      setEndDate(newDate)
    },
    [endDate],
  )

  const handleEndDayChange = useCallback(
    (day: string | number) => {
      const newDate = new Date(endDate)
      newDate.setDate(Number(day))
      setEndDate(newDate)
    },
    [endDate],
  )

  const handleEndHourChange = useCallback(
    (hour: string | number) => {
      const newDate = new Date(endDate)
      newDate.setHours(Number(hour))
      setEndDate(newDate)
    },
    [endDate],
  )

  const handleEndMinuteChange = useCallback(
    (minute: string | number) => {
      const newDate = new Date(endDate)
      newDate.setMinutes(Number(minute))
      setEndDate(newDate)
    },
    [endDate],
  )

  // Мемоизированные массивы дней для каждой даты
  const startDays = useMemo(
    () => Array.from({ length: getDaysInMonth(startDate.getFullYear(), startDate.getMonth()) }, (_, i) => i + 1),
    [startDate, getDaysInMonth],
  )

  const endDays = useMemo(
    () => Array.from({ length: getDaysInMonth(endDate.getFullYear(), endDate.getMonth()) }, (_, i) => i + 1),
    [endDate, getDaysInMonth],
  )

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
        <div className="font-medium text-sm">
          {startDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}{" "}
          {startDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          {" — "}
          {endDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}{" "}
          {endDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {mode === "date" ? (
        <div className="space-y-4">
          {/* Дата начала */}
          <div>
            <div className="text-sm font-medium mb-2">Дата начала</div>
            <div className="grid grid-cols-3 gap-2">
              {createScrollSelector(years, startDate.getFullYear(), handleStartYearChange, "Год")}
              {createScrollSelector(
                months.map((_, index) => index),
                startDate.getMonth(),
                handleStartMonthChange,
                "Месяц",
              )}
              {createScrollSelector(startDays, startDate.getDate(), handleStartDayChange, "День")}
            </div>
          </div>

          {/* Дата конца */}
          <div>
            <div className="text-sm font-medium mb-2">Дата окончания</div>
            <div className="grid grid-cols-3 gap-2">
              {createScrollSelector(years, endDate.getFullYear(), handleEndYearChange, "Год")}
              {createScrollSelector(
                months.map((_, index) => index),
                endDate.getMonth(),
                handleEndMonthChange,
                "Месяц",
              )}
              {createScrollSelector(endDays, endDate.getDate(), handleEndDayChange, "День")}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Время начала */}
          <div>
            <div className="text-sm font-medium mb-2">Время начала</div>
            <div className="grid grid-cols-2 gap-4">
              {createScrollSelector(
                hours,
                startDate.getHours().toString().padStart(2, "0"),
                handleStartHourChange,
                "Час",
              )}
              {createScrollSelector(
                minutes,
                Math.floor(startDate.getMinutes() / 15) * 15,
                handleStartMinuteChange,
                "Минута",
              )}
            </div>
          </div>

          {/* Время конца */}
          <div>
            <div className="text-sm font-medium mb-2">Время окончания</div>
            <div className="grid grid-cols-2 gap-4">
              {createScrollSelector(hours, endDate.getHours().toString().padStart(2, "0"), handleEndHourChange, "Час")}
              {createScrollSelector(
                minutes,
                Math.floor(endDate.getMinutes() / 15) * 15,
                handleEndMinuteChange,
                "Минута",
              )}
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
