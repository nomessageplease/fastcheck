"use client"

import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{user?.email ? getInitials(user.email) : "U"}</AvatarFallback>
                </Avatar>
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
