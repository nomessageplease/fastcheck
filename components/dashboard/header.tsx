"use client"

import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

interface HeaderProps {
  user: User | null
  currentPage: "dashboard" | "settings" | "projects"
  loadData: () => void
}

export function Header({ user, currentPage, loadData }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => (window.location.hash = "")}
            className="text-xl font-bold hover:bg-gray-100 p-2"
          >
            FastCheck
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => (window.location.hash = "projects")} className="text-sm font-medium">
            Проекты
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => (window.location.hash = "settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
