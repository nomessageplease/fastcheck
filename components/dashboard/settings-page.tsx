"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import type { Project, Executor } from "@/lib/supabase/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExecutorsManagement } from "./executors-management"
import { UsageStats } from "./usage-stats"
import { ReviewStats } from "./review-stats"
import { NotificationSettings } from "./notification-settings"
import { UserCircle, Bell, BarChart } from "lucide-react"

interface SettingsPageProps {
  user: User | null
  projects: Project[]
  executors: Executor[]
  onDataChange: () => void
}

export function SettingsPage({ user, projects, executors, onDataChange }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState("executors")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground">Управление настройками приложения</p>
      </div>

      <Tabs defaultValue="executors" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-3 w-full min-w-[300px] h-12">
            <TabsTrigger value="executors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
              <UserCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Исполнители</span>
              <span className="xs:hidden">Испол.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
              <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Статистика</span>
              <span className="xs:hidden">Стат.</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Уведомления</span>
              <span className="xs:hidden">Увед.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="executors" className="mt-6">
          <ExecutorsManagement user={user} executors={executors} onDataChange={onDataChange} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
