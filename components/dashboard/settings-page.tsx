"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import type { Project, Executor } from "@/lib/supabase/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ExecutorsManagement } from "./executors-management"
import { UsageStats } from "./usage-stats"
import { ReviewStats } from "./review-stats"
import { NotificationSettings } from "./notification-settings"
import { UserCircle, Bell, BarChart, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SettingsPageProps {
  user: User | null
  projects: Project[]
  executors: Executor[]
  onDataChange: () => void
}

export function SettingsPage({ user, projects, executors, onDataChange }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState("executors")
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      })
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-muted-foreground">Управление настройками приложения</p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2 w-full sm:w-auto">
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>

      <Tabs defaultValue="executors" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="executors" className="flex items-center gap-1 text-xs sm:text-sm">
            <UserCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Исполнители</span>
            <span className="sm:hidden">Испол.</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-1 text-xs sm:text-sm">
            <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Статистика</span>
            <span className="sm:hidden">Стат.</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Уведомления</span>
            <span className="sm:hidden">Увед.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executors" className="mt-6">
          <ExecutorsManagement executors={executors} onExecutorsChange={onDataChange} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageStats user={user} projects={projects} />
            <ReviewStats user={user} />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
