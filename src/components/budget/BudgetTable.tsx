'use client'

import { useState } from 'react'
import { BudgetItem, WorkPackage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, ArrowUpDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils/format'

interface BudgetTableProps {
  budgetItems: BudgetItem[]
  workPackages: WorkPackage[]
  onUpdate: (id: string, updates: Partial<BudgetItem>) => void
  onAdd: (item: Partial<BudgetItem>) => void
  onDelete: (id: string) => void
}

type SortField = 'description' | 'estimated_cost' | 'quoted_cost' | 'actual_cost' | 'status'

const statusOptions = ['estimated', 'quoted', 'committed', 'paid']
const statusColors: Record<string, string> = {
  estimated: 'bg-gray-100 text-gray-700',
  quoted: 'bg-blue-100 text-blue-700',
  committed: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
}

export function BudgetTable({
  budgetItems,
  workPackages,
  onUpdate,
  onAdd,
  onDelete,
}: BudgetTableProps) {
  const [sortField, setSortField] = useState<SortField>('description')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [wpFilter, setWpFilter] = useState<string>('all')
  const [showAddRow, setShowAddRow] = useState(false)
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    description: '',
    status: 'estimated',
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const startEdit = (id: string, field: string, currentValue: string | number | null) => {
    setEditingCell({ id, field })
    setEditValue(currentValue?.toString() || '')
  }

  const commitEdit = () => {
    if (!editingCell) return
    const { id, field } = editingCell
    const numericFields = ['estimated_cost', 'quoted_cost', 'actual_cost']
    const value = numericFields.includes(field)
      ? editValue ? parseFloat(editValue) : null
      : editValue

    onUpdate(id, { [field]: value })
    setEditingCell(null)
  }

  const filteredItems = wpFilter === 'all'
    ? budgetItems
    : budgetItems.filter((i) => i.work_package_id === wpFilter)

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aVal = a[sortField] ?? ''
    const bVal = b[sortField] ?? ''
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const getBudgetHealth = (item: BudgetItem) => {
    if (!item.estimated_cost || !item.actual_cost) return ''
    const ratio = item.actual_cost / item.estimated_cost
    if (ratio <= 1) return 'bg-green-50'
    if (ratio <= 1.1) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  const handleAddItem = () => {
    if (!newItem.description) return
    onAdd(newItem)
    setNewItem({ description: '', status: 'estimated' })
    setShowAddRow(false)
  }

  const wpMap = new Map(workPackages.map((wp) => [wp.id, `WP${wp.number}`]))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={wpFilter} onValueChange={setWpFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by WP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Work Packages</SelectItem>
            {workPackages.map((wp) => (
              <SelectItem key={wp.id} value={wp.id}>
                WP{wp.number}: {wp.name.slice(0, 30)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowAddRow(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium w-8">WP</th>
              <th
                className="text-left p-2 font-medium cursor-pointer"
                onClick={() => handleSort('description')}
              >
                <span className="flex items-center gap-1">
                  Description <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th
                className="text-right p-2 font-medium cursor-pointer w-28"
                onClick={() => handleSort('estimated_cost')}
              >
                <span className="flex items-center justify-end gap-1">
                  Estimated <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="text-right p-2 font-medium w-28">Quoted</th>
              <th className="text-right p-2 font-medium w-28">Actual</th>
              <th className="text-left p-2 font-medium w-24">Status</th>
              <th className="text-left p-2 font-medium w-32">Vendor</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr
                key={item.id}
                className={cn('border-t hover:bg-muted/30', getBudgetHealth(item))}
              >
                <td className="p-2">
                  <Badge variant="outline" className="text-xs">
                    {wpMap.get(item.work_package_id || '') || '—'}
                  </Badge>
                </td>
                <td
                  className="p-2 cursor-pointer"
                  onClick={() => startEdit(item.id, 'description', item.description)}
                >
                  {editingCell?.id === item.id && editingCell.field === 'description' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    item.description
                  )}
                </td>
                <td
                  className="p-2 text-right cursor-pointer"
                  onClick={() => startEdit(item.id, 'estimated_cost', item.estimated_cost)}
                >
                  {editingCell?.id === item.id && editingCell.field === 'estimated_cost' ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      autoFocus
                      className="h-7 text-sm text-right"
                    />
                  ) : (
                    formatCurrency(item.estimated_cost)
                  )}
                </td>
                <td
                  className="p-2 text-right cursor-pointer"
                  onClick={() => startEdit(item.id, 'quoted_cost', item.quoted_cost)}
                >
                  {editingCell?.id === item.id && editingCell.field === 'quoted_cost' ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      autoFocus
                      className="h-7 text-sm text-right"
                    />
                  ) : (
                    formatCurrency(item.quoted_cost)
                  )}
                </td>
                <td
                  className="p-2 text-right cursor-pointer"
                  onClick={() => startEdit(item.id, 'actual_cost', item.actual_cost)}
                >
                  {editingCell?.id === item.id && editingCell.field === 'actual_cost' ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      autoFocus
                      className="h-7 text-sm text-right"
                    />
                  ) : (
                    formatCurrency(item.actual_cost)
                  )}
                </td>
                <td className="p-2">
                  <Select
                    value={item.status}
                    onValueChange={(v) => onUpdate(item.id, { status: v as BudgetItem['status'] })}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td
                  className="p-2 cursor-pointer"
                  onClick={() => startEdit(item.id, 'vendor', item.vendor)}
                >
                  {editingCell?.id === item.id && editingCell.field === 'vendor' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span className="text-muted-foreground">{item.vendor || '—'}</span>
                  )}
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}

            {showAddRow && (
              <tr className="border-t bg-muted/20">
                <td className="p-2">
                  <Select
                    value={newItem.work_package_id || ''}
                    onValueChange={(v) => setNewItem((p) => ({ ...p, work_package_id: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs w-16">
                      <SelectValue placeholder="WP" />
                    </SelectTrigger>
                    <SelectContent>
                      {workPackages.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id}>
                          WP{wp.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Description"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    className="h-7 text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, estimated_cost: parseFloat(e.target.value) || undefined }))
                    }
                    className="h-7 text-sm text-right"
                  />
                </td>
                <td className="p-2" />
                <td className="p-2" />
                <td className="p-2" />
                <td className="p-2">
                  <Input
                    placeholder="Vendor"
                    onChange={(e) => setNewItem((p) => ({ ...p, vendor: e.target.value }))}
                    className="h-7 text-sm"
                  />
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddItem}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setShowAddRow(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
