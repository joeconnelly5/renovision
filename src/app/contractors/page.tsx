'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Contractor, ContractorAssignment, WorkPackage } from '@/types'
import { ContractorCard } from '@/components/contractors/ContractorCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const trades = [
  'General Contractor',
  'Flooring',
  'Painting',
  'Cabinetry',
  'Countertops',
  'Tile',
  'Staircase',
  'Appliances',
  'Electrical',
  'Plumbing',
  'Other',
]

const statuses = ['prospective', 'quoting', 'hired', 'active', 'complete']

export default function ContractorsPage() {
  const [loading, setLoading] = useState(true)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([])
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Contractor | null>(null)
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({
    name: '',
    company: '',
    trade: '',
    phone: '',
    email: '',
    status: 'prospective',
    notes: '',
  })
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()
    const [cRes, caRes, wpRes] = await Promise.all([
      supabase.from('contractors').select('*').order('name'),
      supabase.from('contractor_assignments').select('*'),
      supabase.from('work_packages').select('*').order('number'),
    ])
    setContractors(cRes.data || [])
    setAssignments(caRes.data || [])
    setWorkPackages(wpRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddDialog = () => {
    setEditing(null)
    setForm({
      name: '',
      company: '',
      trade: '',
      phone: '',
      email: '',
      status: 'prospective',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (contractor: Contractor) => {
    setEditing(contractor)
    setForm({
      name: contractor.name,
      company: contractor.company || '',
      trade: contractor.trade || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      status: contractor.status,
      notes: contractor.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const supabase = createBrowserClient()

    if (editing) {
      const { data, error } = await supabase
        .from('contractors')
        .update(form)
        .eq('id', editing.id)
        .select()
        .single()

      if (error) {
        toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
      } else if (data) {
        setContractors((prev) => prev.map((c) => (c.id === data.id ? data : c)))
        toast({ title: 'Updated', description: 'Contractor updated' })
      }
    } else {
      const { data, error } = await supabase
        .from('contractors')
        .insert(form)
        .select()
        .single()

      if (error) {
        toast({ title: 'Error', description: 'Failed to add', variant: 'destructive' })
      } else if (data) {
        setContractors((prev) => [...prev, data])
        toast({ title: 'Added', description: 'Contractor added' })
      }
    }

    setDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('contractors').delete().eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } else {
      setContractors((prev) => prev.filter((c) => c.id !== id))
      toast({ title: 'Deleted', description: 'Contractor removed' })
    }
  }

  const handleRate = async (id: string, rating: number) => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('contractors')
      .update({ rating })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setContractors((prev) => prev.map((c) => (c.id === id ? data : c)))
    }
  }

  let filtered = contractors
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s) ||
        c.trade?.toLowerCase().includes(s)
    )
  }
  if (tradeFilter !== 'all') {
    filtered = filtered.filter((c) => c.trade === tradeFilter)
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter((c) => c.status === statusFilter)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="h-4 w-4" />
          Add Contractor
        </Button>

        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {trades.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-48"
          />
        </div>

        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} contractor{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No contractors found</p>
          <p className="text-sm mt-1">Add your first contractor to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              assignments={assignments.filter((a) => a.contractor_id === contractor.id)}
              workPackages={workPackages}
              onEdit={openEditDialog}
              onDelete={handleDelete}
              onRate={handleRate}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label>Trade</Label>
              <Select
                value={form.trade}
                onValueChange={(v) => setForm((f) => ({ ...f, trade: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trade" />
                </SelectTrigger>
                <SelectContent>
                  {trades.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="416-555-0000"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes about this contractor..."
                rows={3}
              />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name}>
              {editing ? 'Update' : 'Add'} Contractor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
