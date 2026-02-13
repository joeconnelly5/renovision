'use client'

import { ContractorAssignment, Contractor, WorkPackage } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils/format'
import { Check, Trophy } from 'lucide-react'
import { useState } from 'react'

interface QuoteComparisonProps {
  assignments: ContractorAssignment[]
  contractors: Contractor[]
  workPackages: WorkPackage[]
  onSelectWinner: (assignmentId: string, wpId: string) => void
}

export function QuoteComparison({
  assignments,
  contractors,
  workPackages,
  onSelectWinner,
}: QuoteComparisonProps) {
  const [selectedWP, setSelectedWP] = useState<string>('')

  const wpAssignments = selectedWP
    ? assignments.filter((a) => a.work_package_id === selectedWP)
    : []

  const getContractor = (id: string) => contractors.find((c) => c.id === id)

  // Find lowest quote
  const quotedAssignments = wpAssignments.filter((a) => a.quote_amount)
  const lowestQuote = quotedAssignments.length > 0
    ? Math.min(...quotedAssignments.map((a) => a.quote_amount!))
    : null

  return (
    <div className="space-y-4">
      <Select value={selectedWP} onValueChange={setSelectedWP}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select a work package to compare quotes" />
        </SelectTrigger>
        <SelectContent>
          {workPackages.map((wp) => (
            <SelectItem key={wp.id} value={wp.id}>
              WP{wp.number}: {wp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedWP && wpAssignments.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No quotes submitted for this work package yet. Assign contractors in the Contractors module.
        </p>
      )}

      {wpAssignments.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Contractor</th>
                <th className="text-left p-3 font-medium">Company</th>
                <th className="text-right p-3 font-medium">Quote Amount</th>
                <th className="text-left p-3 font-medium">Notes</th>
                <th className="text-center p-3 font-medium">Selected</th>
                <th className="p-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {wpAssignments.map((assignment) => {
                const contractor = getContractor(assignment.contractor_id)
                const isLowest = assignment.quote_amount === lowestQuote
                return (
                  <tr
                    key={assignment.id}
                    className={cn(
                      'border-t hover:bg-muted/30',
                      assignment.is_selected && 'bg-green-50'
                    )}
                  >
                    <td className="p-3 font-medium">
                      {contractor?.name || 'Unknown'}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {contractor?.company || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        {formatCurrency(assignment.quote_amount)}
                        {isLowest && assignment.quote_amount && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            Lowest
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">
                      {assignment.quote_notes || '—'}
                    </td>
                    <td className="p-3 text-center">
                      {assignment.is_selected && (
                        <div className="flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {!assignment.is_selected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => onSelectWinner(assignment.id, selectedWP)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Select
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
