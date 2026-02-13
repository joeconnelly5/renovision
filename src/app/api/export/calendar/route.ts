import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateICS } from '@/lib/utils/export'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: tasks, error } = await supabase
      .from('schedule_tasks')
      .select('*')
      .order('start_date')

    if (error || !tasks) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    const ics = generateICS(tasks)

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="renovision-schedule.ics"',
      },
    })
  } catch (error) {
    console.error('Calendar export error:', error)
    return NextResponse.json({ error: 'Failed to export calendar' }, { status: 500 })
  }
}
