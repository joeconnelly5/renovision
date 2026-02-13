import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { exportBudgetCSV } from '@/lib/utils/export'

export async function GET() {
  try {
    const supabase = createServerClient()

    const [{ data: items }, { data: workPackages }] = await Promise.all([
      supabase.from('budget_items').select('*').order('created_at'),
      supabase.from('work_packages').select('*').order('number'),
    ])

    if (!items || !workPackages) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    const csv = exportBudgetCSV(items, workPackages)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="renovision-budget-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Budget CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export budget' }, { status: 500 })
  }
}
