// ============================================================
// RenoVision — Contractor Assignments API
// GET: list (optional filter) | POST: create | PATCH: update | DELETE: remove
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const workPackageId = searchParams.get('work_package_id')
  const contractorId = searchParams.get('contractor_id')

  let query = supabase
    .from('contractor_assignments')
    .select('*, contractor:contractors(*), work_package:work_packages(*)')

  if (workPackageId) {
    query = query.eq('work_package_id', workPackageId)
  }

  if (contractorId) {
    query = query.eq('contractor_id', contractorId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('contractor_assignments')
    .insert(body)
    .select('*, contractor:contractors(*), work_package:work_packages(*)')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ data: null, error: 'Missing id in request body' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contractor_assignments')
    .update(updates)
    .eq('id', id)
    .select('*, contractor:contractors(*), work_package:work_packages(*)')
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ data: null, error: 'Missing id in search params' }, { status: 400 })
  }

  const { error } = await supabase
    .from('contractor_assignments')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: null, error: null })
}
