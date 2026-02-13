'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { WorkPackage, BudgetItem, ContractorAssignment, Contractor, ScheduleTask, FileRecord, DesignDecision } from '@/types'
import { WorkPackageCard } from '@/components/dashboard/WorkPackageCard'
import { BudgetSummary } from '@/components/dashboard/BudgetSummary'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, MessageSquare, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([])
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([])
  const [recentDecisions, setRecentDecisions] = useState<DesignDecision[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    const [
      wpRes,
      biRes,
      caRes,
      cRes,
      stRes,
      fRes,
      dRes,
    ] = await Promise.all([
      supabase.from('work_packages').select('*').order('number'),
      supabase.from('budget_items').select('*'),
      supabase.from('contractor_assignments').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('schedule_tasks').select('*'),
      supabase.from('files').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('design_decisions').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    setWorkPackages(wpRes.data || [])
    setBudgetItems(biRes.data || [])
    setAssignments(caRes.data || [])
    setContractors(cRes.data || [])
    setScheduleTasks(stRes.data || [])
    setRecentFiles(fRes.data || [])
    setRecentDecisions(dRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <BudgetSummary workPackages={workPackages} budgetItems={budgetItems} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/gallery">
          <Button variant="outline" className="gap-2">
            <Camera className="h-4 w-4" />
            Upload Photos
          </Button>
        </Link>
        <Link href="/designer">
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat with Designer
          </Button>
        </Link>
        <Link href="/budget">
          <Button variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Add Expense
          </Button>
        </Link>
        <Link href="/schedule">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Update Schedule
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Work Package Cards */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Work Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workPackages.map((wp) => {
              const wpBudgetItems = budgetItems.filter(
                (bi) => bi.work_package_id === wp.id
              )
              const wpAssignments = assignments.filter(
                (a) => a.work_package_id === wp.id && a.is_selected
              )
              const wpContractors = wpAssignments
                .map((a) => contractors.find((c) => c.id === a.contractor_id))
                .filter(Boolean) as Contractor[]
              const wpTasks = scheduleTasks.filter(
                (t) => t.work_package_id === wp.id
              )

              return (
                <WorkPackageCard
                  key={wp.id}
                  workPackage={wp}
                  budgetItems={wpBudgetItems}
                  contractors={wpContractors}
                  scheduleTasks={wpTasks}
                />
              )
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                recentFiles={recentFiles}
                recentDecisions={recentDecisions}
                recentBudgetItems={budgetItems.slice(0, 5)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
