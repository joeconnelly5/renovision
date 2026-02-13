'use client'

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils/format'
import {
  CalendarDays,
  HardHat,
  ArrowRight,
} from 'lucide-react'
import type {
  WorkPackage,
  BudgetItem,
  Contractor,
  ContractorAssignment,
  ScheduleTask,
} from '@/types'

// --------------- Status helpers ---------------

const statusConfig: Record<
  WorkPackage['status'],
  { label: string; className: string }
> = {
  not_started: {
    label: 'Not Started',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  in_design: {
    label: 'In Design',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  quoted: {
    label: 'Quoted',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  complete: {
    label: 'Complete',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
}

// --------------- Props ---------------

interface WorkPackageCardProps {
  workPackage: WorkPackage
  budgetItems: BudgetItem[]
  contractors: Contractor[]
  scheduleTasks: ScheduleTask[]
}

// --------------- Component ---------------

export function WorkPackageCard({
  workPackage,
  budgetItems,
  contractors,
  scheduleTasks,
}: WorkPackageCardProps) {
  const wp = workPackage
  const status = statusConfig[wp.status]

  // Budget calculations
  const totalActual = budgetItems.reduce(
    (sum, item) => sum + (item.actual_cost ?? item.quoted_cost ?? item.estimated_cost),
    0
  )
  const budgetPercent =
    wp.budget_allocated > 0
      ? Math.round((totalActual / wp.budget_allocated) * 100)
      : 0
  const overBudget = totalActual > wp.budget_allocated

  // Assigned contractor
  const selected = contractors.length > 0 ? contractors[0] : null

  // Earliest start / latest end from schedule tasks
  const sortedTasks = [...scheduleTasks].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )
  const earliestStart = sortedTasks[0]?.start_date ?? null
  const latestEnd = sortedTasks.length
    ? sortedTasks.reduce(
        (latest, t) =>
          new Date(t.end_date) > new Date(latest) ? t.end_date : latest,
        sortedTasks[0].end_date
      )
    : null

  return (
    <div className="block group">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {wp.number}
              </span>
              <h3 className="text-sm font-semibold leading-tight">
                {wp.name}
              </h3>
            </div>
            <Badge className={cn('shrink-0 text-[10px]', status.className)}>
              {status.label}
            </Badge>
          </div>
          {wp.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {wp.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          {/* Budget bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Budget</span>
              <span
                className={cn(
                  'font-medium',
                  overBudget ? 'text-destructive' : 'text-foreground'
                )}
              >
                {formatCurrency(totalActual)} / {formatCurrency(wp.budget_allocated)}
              </span>
            </div>
            <Progress
              value={Math.min(budgetPercent, 100)}
              className="h-1.5"
            />
          </div>

          {/* Contractor */}
          {selected && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardHat className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {selected.company ?? selected.name}
              </span>
            </div>
          )}

          {/* Schedule dates */}
          {earliestStart && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                {formatDate(earliestStart)}
                {latestEnd && latestEnd !== earliestStart
                  ? ` — ${formatDate(latestEnd)}`
                  : ''}
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-4">
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View details <ArrowRight className="h-3 w-3" />
          </span>
        </CardFooter>
      </Card>
    </div>
  )
}
