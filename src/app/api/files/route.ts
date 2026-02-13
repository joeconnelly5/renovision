// ============================================================
// RenoVision — Files API
// GET: list (optional filters) | POST: create record | DELETE: remove record + storage
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const room = searchParams.get('room')
  const workPackageId = searchParams.get('work_package_id')

  let query = supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  if (room) {
    query = query.eq('room', room)
  }

  if (workPackageId) {
    query = query.eq('work_package_id', workPackageId)
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
    .from('files')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ data: null, error: 'Missing id in search params' }, { status: 400 })
  }

  // First fetch the file record to get the storage path
  const { data: fileRecord, error: fetchError } = await supabase
    .from('files')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ data: null, error: fetchError.message }, { status: 500 })
  }

  if (!fileRecord) {
    return NextResponse.json({ data: null, error: 'File not found' }, { status: 404 })
  }

  // Determine bucket from file type
  const isImage = fileRecord.file_type?.startsWith('image/')
  const bucket = isImage ? 'photos' : 'documents'

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([fileRecord.storage_path])

  if (storageError) {
    console.error('Storage delete warning:', storageError.message)
    // Continue with DB delete even if storage delete fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('files')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ data: null, error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ data: null, error: null })
}
