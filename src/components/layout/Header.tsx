'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Project Dashboard',
  '/gallery': 'Photo Gallery & Inspiration',
  '/designer': 'AI Design Assistant',
  '/budget': 'Budget Tracker',
  '/contractors': 'Contractors & Suppliers',
  '/schedule': 'Schedule & Timeline',
  '/files': 'Documents & Files',
  '/design-package': 'Design Package',
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'RenoVision'

  return (
    <header className="flex h-14 items-center border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
