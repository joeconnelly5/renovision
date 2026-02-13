'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/format'
import {
  LayoutDashboard,
  Image,
  MessageSquare,
  DollarSign,
  Users,
  Calendar,
  FolderOpen,
  Palette,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Gallery', href: '/gallery', icon: Image },
  { name: 'Designer', href: '/designer', icon: MessageSquare },
  { name: 'Budget', href: '/budget', icon: DollarSign },
  { name: 'Contractors', href: '/contractors', icon: Users },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Files', href: '/files', icon: FolderOpen },
  { name: 'Design Package', href: '/design-package', icon: Palette },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">RenoVision</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <Home className="h-5 w-5 text-primary" />
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="border-t p-3">
        {!collapsed && (
          <p className="text-xs text-muted-foreground text-center">
            53 Thurston Rd, Toronto
          </p>
        )}
      </div>
    </aside>
  )
}
