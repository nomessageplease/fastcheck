export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Понедельник как первый день недели
  return new Date(d.setDate(diff))
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date)
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay()
  return firstDay === 0 ? 7 : firstDay // Преобразуем воскресенье (0) в 7
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU")
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const dateTime = date.getTime()
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()
  return dateTime >= startTime && dateTime <= endTime
}

export function getTasksForDate(tasks: any[], date: Date): any[] {
  return tasks.filter((task) => {
    const taskStart = new Date(task.start_date)
    const taskEnd = new Date(task.due_date)

    // Сбрасываем время для корректного сравнения дат
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const startDate = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate())
    const endDate = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate())

    return checkDate >= startDate && checkDate <= endDate
  })
}
