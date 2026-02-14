import { NextRequest, NextResponse } from 'next/server'
import { generateRoomRendering } from '@/lib/ai/openai'
import { createServerClient } from '@/lib/supabase/server'
import { IMAGE_GENERATION_PROMPT_TEMPLATE } from '@/lib/ai/prompts'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { prompt, room, style } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Build full prompt with template
    const fullPrompt = IMAGE_GENERATION_PROMPT_TEMPLATE(prompt, room || 'room', style)

    // Generate image
    const imageBuffer = await generateRoomRendering(fullPrompt)

    // Upload to Supabase Storage
    const supabase = createServerClient()
    const filename = `rendering-${room || 'room'}-${Date.now()}.png`
    const storagePath = `renderings/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload generated image' },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(storagePath)

    // Create file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        filename,
        storage_path: storagePath,
        file_type: 'image/png',
        category: 'rendering',
        room: room || 'general',
        notes: prompt,
        ai_generated: true,
        tags: ['ai-generated', 'rendering', room || 'general'],
      })
      .select()
      .single()

    if (fileError) {
      console.error('File record error:', fileError)
      return NextResponse.json(
        { error: 'Failed to create file record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...fileRecord,
      public_url: publicUrl,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
