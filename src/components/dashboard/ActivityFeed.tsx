'use client'

import { FileRecord, DesignDecision, BudgetItem } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { ImageIcon, Palette, DollarSign, Clock } from 'lucide-react'

interface ActivityFeedProps {
  recentFiles: FileRecord[]
  recentDecisions: DesignDecision[]
  recentBudgetItems: BudgetItem[]
}

interface ActivityItem {
  id: string
  icon: React.ReactNode
  description: string
  timestamp: string
  type: string
}

export function ActivityFeed({
  recentFiles,
  recentDecisions,
  recentBudgetItems,
}: ActivityFeedProps) {
  const items: ActivityItem[] = []

  for (const file of recentFiles) {
    items.push({
      id: `file-${file.id}`,
      icon: <ImageIcon className="h-4 w-4 text-blue-500" />,
      description: `Uploaded ${file.filename}${file.room ? ` (${file.room.replace('_', ' ')})` : ''}`,
      timestamp: file.created_at,
      type: 'file',
    })
  }

  for (const decision of recentDecisions) {
    items.push({
      id: `decision-${decision.id}`,
      icon: <Palette className="h-4 w-4 text-purple-500" />,
      description: `Design decision: ${decision.title}${decision.product_name ? ` — ${decision.product_name}` : ''}`,
      timestamp: decision.created_at,
      type: 'decision',
    })
  }

  for (const item of recentBudgetItems) {
    items.push({
      id: `budget-${item.id}`,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
      description: `Budget: ${item.description}${item.vendor ? ` (${item.vendor})` : ''}`,
      timestamp: item.created_at,
      type: 'budget',
    })
  }

  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const display = items.slice(0, 10)

  if (display.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">Upload photos or start a design session to get going</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {display.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-tight">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(item.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
