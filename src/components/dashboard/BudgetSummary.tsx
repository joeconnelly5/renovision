'use client'

import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils/format'
import { DollarSign, FileCheck, CreditCard } from 'lucide-react'
import type { WorkPackage, BudgetItem } from '@/types'

// --------------- Props ---------------

interface BudgetSummaryProps {
  workPackages: WorkPackage[]
  budgetItems: BudgetItem[]
}

// --------------- Component ---------------

export function BudgetSummary({ workPackages, budgetItems }: BudgetSummaryProps) {
  // Total budget = sum of budget_allocated across all work packages
  const totalBudget = workPackages.reduce(
    (sum, wp) => sum + wp.budget_allocated,
    0
  )

  // Total committed = sum of (quoted_cost OR actual_cost) for each budget item
  const totalCommitted = budgetItems.reduce(
    (sum, item) => sum + (item.actual_cost ?? item.quoted_cost ?? 0),
    0
  )

  // Total spent = sum of actual_cost where status = 'paid'
  const totalSpent = budgetItems.reduce(
    (sum, item) =>
      item.status === 'paid' ? sum + (item.actual_cost ?? 0) : sum,
    0
  )

  const spendPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const committedPercent =
    totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0

  const stats = [
    {
      label: 'Total Budget',
      value: formatCurrency(totalBudget),
      icon: DollarSign,
      accent: 'text-primary',
      bgAccent: 'bg-primary/10',
    },
    {
      label: 'Committed',
      value: formatCurrency(totalCommitted),
      icon: FileCheck,
      accent:
        totalCommitted > totalBudget ? 'text-destructive' : 'text-blue-600',
      bgAccent:
        totalCommitted > totalBudget ? 'bg-destructive/10' : 'bg-blue-50',
    },
    {
      label: 'Spent (Paid)',
      value: formatCurrency(totalSpent),
      icon: CreditCard,
      accent: 'text-green-600',
      bgAccent: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  stat.bgAccent
                )}
              >
                <stat.icon className={cn('h-5 w-5', stat.accent)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className={cn('text-xl font-bold tracking-tight', stat.accent)}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Overall Spend
            </span>
            <span className="text-xs text-muted-foreground">
              {spendPercent}% spent &middot; {committedPercent}% committed
            </span>
          </div>

          {/* Stacked bar: committed (lighter) behind spent (darker) */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-200 transition-all duration-500"
              style={{ width: `${Math.min(committedPercent, 100)}%` }}
            />
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                spendPercent > 100 ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${Math.min(spendPercent, 100)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Paid
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-200" />
              Committed
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
