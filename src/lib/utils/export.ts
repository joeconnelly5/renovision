import type { BudgetItem, WorkPackage, ScheduleTask } from '@/types'
import { format } from 'date-fns'

export function exportBudgetCSV(
  items: BudgetItem[],
  workPackages: WorkPackage[]
): string {
  const wpMap = new Map(workPackages.map((wp) => [wp.id, `WP${wp.number}: ${wp.name}`]))

  const headers = [
    'Work Package',
    'Description',
    'Estimated Cost',
    'Quoted Cost',
    'Actual Cost',
    'Status',
    'Vendor',
    'Due Date',
    'Notes',
  ]

  const rows = items.map((item) => [
    wpMap.get(item.work_package_id || '') || 'Unassigned',
    escapeCsvField(item.description),
    item.estimated_cost?.toString() || '',
    item.quoted_cost?.toString() || '',
    item.actual_cost?.toString() || '',
    item.status,
    escapeCsvField(item.vendor || ''),
    item.due_date || '',
    escapeCsvField(item.notes || ''),
  ])

  // Add totals row
  const totalEstimated = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
  const totalQuoted = items.reduce((sum, i) => sum + (i.quoted_cost || 0), 0)
  const totalActual = items.reduce((sum, i) => sum + (i.actual_cost || 0), 0)

  rows.push([
    'TOTAL',
    '',
    totalEstimated.toString(),
    totalQuoted.toString(),
    totalActual.toString(),
    '',
    '',
    '',
    '',
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  return csvContent
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function generateICS(tasks: ScheduleTask[]): string {
  const milestones = tasks.filter((t) => t.is_milestone && t.start_date)

  const events = milestones.map((task) => {
    const date = task.start_date
      ? format(new Date(task.start_date), "yyyyMMdd")
      : format(new Date(), "yyyyMMdd")

    return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${date}
DTEND;VALUE=DATE:${date}
SUMMARY:RenoVision: ${task.name}
DESCRIPTION:${task.notes || ''}
STATUS:${task.status === 'complete' ? 'COMPLETED' : 'CONFIRMED'}
END:VEVENT`
  })

  // Also include non-milestone tasks with date ranges
  const rangedTasks = tasks.filter(
    (t) => !t.is_milestone && t.start_date && t.end_date
  )

  for (const task of rangedTasks) {
    const startDate = format(new Date(task.start_date!), "yyyyMMdd")
    const endDate = format(new Date(task.end_date!), "yyyyMMdd")

    events.push(`BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:RenoVision: ${task.name}
DESCRIPTION:${task.notes || ''}
STATUS:${task.status === 'complete' ? 'COMPLETED' : 'CONFIRMED'}
END:VEVENT`)
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RenoVision//Renovation Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:RenoVision - 53 Thurston Rd Renovation
${events.join('\n')}
END:VCALENDAR`
}
