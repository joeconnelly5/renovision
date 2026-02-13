'use client'

import { BudgetItem, WorkPackage } from '@/types'
import { formatCurrency, cn } from '@/lib/utils/format'

interface VarianceReportProps {
  budgetItems: BudgetItem[]
  workPackages: WorkPackage[]
}

export function VarianceReport({ budgetItems, workPackages }: VarianceReportProps) {
  const wpSummaries = workPackages.map((wp) => {
    const items = budgetItems.filter((bi) => bi.work_package_id === wp.id)
    const estimated = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
    const quoted = items.reduce((sum, i) => sum + (i.quoted_cost || 0), 0)
    const actual = items.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
    const variance = actual - estimated
    const variancePct = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0

    return {
      wp,
      estimated,
      quoted,
      actual,
      variance,
      variancePct,
      itemCount: items.length,
    }
  })

  const totals = {
    estimated: wpSummaries.reduce((s, w) => s + w.estimated, 0),
    quoted: wpSummaries.reduce((s, w) => s + w.quoted, 0),
    actual: wpSummaries.reduce((s, w) => s + w.actual, 0),
  }

  const totalVariance = totals.actual - totals.estimated
  const totalVariancePct =
    totals.estimated > 0 ? ((totals.actual - totals.estimated) / totals.estimated) * 100 : 0

  const getVarianceColor = (variance: number) => {
    if (variance <= 0) return 'text-green-600'
    if (variance <= 0.1 * Math.abs(variance)) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBarWidth = (actual: number) => {
    const maxActual = Math.max(...wpSummaries.map((w) => w.actual), 1)
    return Math.max(0, Math.min(100, (actual / maxActual) * 100))
  }

  return (
    <div className="space-y-6">
      {/* Summary bars */}
      <div className="space-y-3">
        {wpSummaries
          .filter((w) => w.itemCount > 0)
          .map(({ wp, estimated, actual, variancePct }) => (
            <div key={wp.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  WP{wp.number}: {wp.name.slice(0, 40)}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(actual)} / {formatCurrency(estimated)}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    actual <= estimated
                      ? 'bg-green-500'
                      : actual <= estimated * 1.1
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${getBarWidth(actual)}%` }}
                />
              </div>
            </div>
          ))}
      </div>

      {/* Detailed table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Work Package</th>
              <th className="text-right p-3 font-medium">Estimated</th>
              <th className="text-right p-3 font-medium">Quoted</th>
              <th className="text-right p-3 font-medium">Actual</th>
              <th className="text-right p-3 font-medium">Variance ($)</th>
              <th className="text-right p-3 font-medium">Variance (%)</th>
            </tr>
          </thead>
          <tbody>
            {wpSummaries.map(({ wp, estimated, quoted, actual, variance, variancePct }) => (
              <tr key={wp.id} className="border-t hover:bg-muted/30">
                <td className="p-3">
                  WP{wp.number}: {wp.name}
                </td>
                <td className="p-3 text-right">{formatCurrency(estimated)}</td>
                <td className="p-3 text-right">{formatCurrency(quoted)}</td>
                <td className="p-3 text-right">{formatCurrency(actual)}</td>
                <td className={cn('p-3 text-right font-medium', getVarianceColor(variance))}>
                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </td>
                <td className={cn('p-3 text-right', getVarianceColor(variance))}>
                  {variancePct !== 0 ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-foreground/20 font-semibold bg-muted/30">
              <td className="p-3">TOTAL</td>
              <td className="p-3 text-right">{formatCurrency(totals.estimated)}</td>
              <td className="p-3 text-right">{formatCurrency(totals.quoted)}</td>
              <td className="p-3 text-right">{formatCurrency(totals.actual)}</td>
              <td className={cn('p-3 text-right', getVarianceColor(totalVariance))}>
                {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
              </td>
              <td className={cn('p-3 text-right', getVarianceColor(totalVariance))}>
                {totalVariancePct !== 0
                  ? `${totalVariancePct > 0 ? '+' : ''}${totalVariancePct.toFixed(1)}%`
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
