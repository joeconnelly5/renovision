import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerClient()

    const [
      { data: decisions },
      { data: workPackages },
      { data: renderings },
    ] = await Promise.all([
      supabase.from('design_decisions').select('*').order('created_at'),
      supabase.from('work_packages').select('*').order('number'),
      supabase
        .from('files')
        .select('*')
        .eq('ai_generated', true)
        .eq('category', 'rendering')
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      decisions: decisions || [],
      workPackages: workPackages || [],
      renderings: renderings || [],
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Design package export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate design package' },
      { status: 500 }
    )
  }
}
