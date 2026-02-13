'use client'

import { Contractor, ContractorAssignment, WorkPackage } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Mail, Star, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/format'

interface ContractorCardProps {
  contractor: Contractor
  assignments: ContractorAssignment[]
  workPackages: WorkPackage[]
  onEdit: (contractor: Contractor) => void
  onDelete: (id: string) => void
  onRate: (id: string, rating: number) => void
}

const statusColors: Record<string, string> = {
  prospective: 'bg-gray-100 text-gray-700',
  quoting: 'bg-blue-100 text-blue-700',
  hired: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  complete: 'bg-purple-100 text-purple-700',
}

export function ContractorCard({
  contractor,
  assignments,
  workPackages,
  onEdit,
  onDelete,
  onRate,
}: ContractorCardProps) {
  const wpMap = new Map(workPackages.map((wp) => [wp.id, wp]))
  const assignedWPs = assignments
    .map((a) => wpMap.get(a.work_package_id))
    .filter(Boolean)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base">{contractor.name}</h3>
            {contractor.company && (
              <p className="text-sm text-muted-foreground">{contractor.company}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(contractor)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(contractor.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {contractor.trade && (
            <Badge variant="outline" className="text-xs">
              {contractor.trade}
            </Badge>
          )}
          <Badge className={cn('text-xs', statusColors[contractor.status] || '')}>
            {contractor.status.charAt(0).toUpperCase() + contractor.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact info */}
        <div className="space-y-1">
          {contractor.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={`tel:${contractor.phone}`} className="hover:underline">
                {contractor.phone}
              </a>
            </div>
          )}
          {contractor.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={`mailto:${contractor.email}`} className="hover:underline">
                {contractor.email}
              </a>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => onRate(contractor.id, star)}>
              <Star
                className={cn(
                  'h-4 w-4 transition-colors',
                  (contractor.rating || 0) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
        </div>

        {/* Assigned WPs */}
        {assignedWPs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Assigned Work Packages
            </p>
            <div className="flex flex-wrap gap-1">
              {assignedWPs.map((wp) => (
                <Badge key={wp!.id} variant="secondary" className="text-xs">
                  WP{wp!.number}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contractor.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {contractor.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
