"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)

    // Установка начального значения
    setMatches(media.matches)

    // Обработчик изменений
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Добавление слушателя
    media.addEventListener("change", listener)

    // Очистка
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])

  return matches
}
