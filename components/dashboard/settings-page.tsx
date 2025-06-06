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
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управление настройками приложения</p>
      </div>

      <Tabs defaultValue="executors" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-md">
          <TabsTrigger value="executors" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Исполнители
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Статистика
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executors" className="mt-6">
          <ExecutorsManagement user={user} executors={executors} onDataChange={onDataChange} />
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
