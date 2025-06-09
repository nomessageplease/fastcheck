"use client"

import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, LayoutDashboard, FolderKanban } from "lucide-react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  user: User | null
  currentPage: "dashboard" | "settings" | "projects"
  loadData: () => void
}

export function Header({ user, currentPage, loadData }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => (window.location.hash = "")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Календарь</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => (window.location.hash = "projects")}>
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>Проекты</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => (window.location.hash = "settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
