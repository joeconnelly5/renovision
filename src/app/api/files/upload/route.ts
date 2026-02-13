// ============================================================
// RenoVision — File Upload API
// POST: upload file to Supabase Storage + create DB record
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ data: null, error: 'No file provided' }, { status: 400 })
  }

  // Extract metadata from form data
  const category = (formData.get('category') as string) || 'other'
  const room = (formData.get('room') as string) || null
  const tags = formData.get('tags') as string | null
  const workPackageId = (formData.get('work_package_id') as string) || null
  const notes = (formData.get('notes') as string) || null

  // Determine bucket based on content type
  const contentType = file.type
  const isImage = contentType.startsWith('image/')
  const bucket = isImage ? 'photos' : 'documents'

  // Generate unique filename with timestamp prefix
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${timestamp}_${sanitizedName}`

  // Convert file to buffer for upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ data: null, error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Get public URL
  const publicUrl = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath).data.publicUrl

  // Parse tags from comma-separated string
  const parsedTags = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  // Create file record in database
  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      filename: file.name,
      storage_path: storagePath,
      file_type: contentType,
      category,
      room,
      tags: parsedTags,
      notes,
      work_package_id: workPackageId,
      is_favorite: false,
      ai_generated: false,
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file if DB insert fails
    await supabase.storage.from(bucket).remove([storagePath])
    return NextResponse.json({ data: null, error: `DB insert failed: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    data: { ...fileRecord, public_url: publicUrl },
    error: null,
  }, { status: 201 })
}
