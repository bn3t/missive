"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Mail, Bell, Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SignOutButton } from "./sign-out-button"

interface DashboardHeaderProps {
  user?: {
    name?: string | null
    email?: string | null
  }
}

const navItems = [
  { label: "Emails", href: "/emails", active: true },
  { label: "API Keys", href: "/settings/api-keys" },
  { label: "Settings", href: "/settings" },
]

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "JD"

  const CurrentIcon = resolvedTheme === "light" ? Sun : resolvedTheme === "dark" ? Moon : Monitor

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-14 items-center px-6 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground">
            <Mail className="h-4 w-4 text-background" />
          </div>
          <span className="font-semibold text-foreground text-lg tracking-tight">Missive</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                item.active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Live updates */}
        <div className="flex items-center gap-2 text-xs text-success ml-auto mr-4">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live updates
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-foreground")}>
              {mounted && <CurrentIcon className="h-4 w-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                <Sun className="h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                <Moon className="h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                <Monitor className="h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-8 w-8 rounded-full p-0 inline-flex items-center justify-center">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Team</DropdownMenuItem>
              <DropdownMenuItem>
                <SignOutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
