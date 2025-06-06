"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Settings, FolderOpen, Menu, X } from "lucide-react"

interface HeaderProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: "dashboard", label: "Главная", icon: Calendar, shortLabel: "Гл." },
    { id: "projects", label: "Проекты", icon: FolderOpen, shortLabel: "Пр." },
    { id: "settings", label: "Настройки", icon: Settings, shortLabel: "Н." },
  ]

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">FastCheck</h1>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(item.id)}
                className="flex items-center space-x-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile Navigation Tabs */}
        <nav className="flex md:hidden space-x-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(item.id)}
              className="flex flex-col items-center space-y-1 px-2 py-1 h-auto min-w-[60px]"
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs">{item.shortLabel}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onViewChange(item.id)
                  setMobileMenuOpen(false)
                }}
                className="justify-start"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
