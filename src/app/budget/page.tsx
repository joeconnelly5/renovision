'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { BudgetItem, WorkPackage, Contractor, ContractorAssignment } from '@/types'
import { BudgetTable } from '@/components/budget/BudgetTable'
import { VarianceReport } from '@/components/budget/VarianceReport'
import { QuoteComparison } from '@/components/budget/QuoteComparison'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Download, Upload, FileText, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { useToast } from '@/components/ui/use-toast'

export default function BudgetPage() {
  const [loading, setLoading] = useState(true)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([])
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [parsingQuote, setParsingQuote] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()
    const [biRes, wpRes, cRes, caRes] = await Promise.all([
      supabase.from('budget_items').select('*').order('created_at'),
      supabase.from('work_packages').select('*').order('number'),
      supabase.from('contractors').select('*').order('name'),
      supabase.from('contractor_assignments').select('*'),
    ])
    setBudgetItems(biRes.data || [])
    setWorkPackages(wpRes.data || [])
    setContractors(cRes.data || [])
    setAssignments(caRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpdate = async (id: string, updates: Partial<BudgetItem>) => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('budget_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    } else if (data) {
      setBudgetItems((prev) => prev.map((i) => (i.id === id ? data : i)))
    }
  }

  const handleAdd = async (item: Partial<BudgetItem>) => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('budget_items')
      .insert(item)
      .select()
      .single()

    if (error) {
      toast({ title: 'Error', description: 'Failed to add item', variant: 'destructive' })
    } else if (data) {
      setBudgetItems((prev) => [...prev, data])
      toast({ title: 'Added', description: 'Budget item created' })
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('budget_items').delete().eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } else {
      setBudgetItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  const handleSelectWinner = async (assignmentId: string, wpId: string) => {
    const supabase = createBrowserClient()
    // Deselect all for this WP
    await supabase
      .from('contractor_assignments')
      .update({ is_selected: false })
      .eq('work_package_id', wpId)

    // Select the winner
    await supabase
      .from('contractor_assignments')
      .update({ is_selected: true })
      .eq('id', assignmentId)

    fetchData()
    toast({ title: 'Selected', description: 'Contractor selected for this work package' })
  }

  const handleParseQuote = async () => {
    if (!quoteText.trim()) return
    setParsingQuote(true)

    try {
      const res = await fetch('/api/ai/parse-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: quoteText }),
      })

      if (!res.ok) throw new Error('Failed to parse')
      const data = await res.json()

      // Create budget items from parsed data
      for (const item of data.line_items || []) {
        await handleAdd({
          description: item.description,
          quoted_cost: item.total,
          vendor: data.vendor_name,
          status: 'quoted',
        })
      }

      setQuoteDialogOpen(false)
      setQuoteText('')
      toast({ title: 'Imported', description: `${data.line_items?.length || 0} items imported from quote` })
    } catch {
      toast({ title: 'Error', description: 'Failed to parse quote', variant: 'destructive' })
    } finally {
      setParsingQuote(false)
    }
  }

  const handleExportCSV = () => {
    window.open('/api/export/budget-csv', '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  const totalBudget = workPackages.reduce((s, wp) => s + (wp.budget_allocated || 0), 0)
  const totalQuoted = budgetItems.reduce((s, i) => s + (i.quoted_cost || 0), 0)
  const totalActual = budgetItems.reduce((s, i) => s + (i.actual_cost || 0), 0)
  const totalEstimated = budgetItems.reduce((s, i) => s + (i.estimated_cost || 0), 0)
  const spendPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Estimated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quoted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalQuoted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
            <Progress value={spendPct} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {spendPct.toFixed(0)}% of budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setQuoteDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Import Quote
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="variance">Variance Report</TabsTrigger>
          <TabsTrigger value="quotes">Quote Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <BudgetTable
            budgetItems={budgetItems}
            workPackages={workPackages}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="variance" className="mt-4">
          <VarianceReport budgetItems={budgetItems} workPackages={workPackages} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <QuoteComparison
            assignments={assignments}
            contractors={contractors}
            workPackages={workPackages}
            onSelectWinner={handleSelectWinner}
          />
        </TabsContent>
      </Tabs>

      {/* Quote Import Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paste quote text or extracted PDF content</Label>
              <Textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Paste the quote content here..."
                rows={10}
                className="mt-2"
              />
            </div>
            <Button
              onClick={handleParseQuote}
              disabled={!quoteText.trim() || parsingQuote}
              className="w-full gap-2"
            >
              {parsingQuote ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Parse & Import
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
