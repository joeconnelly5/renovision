import { NextRequest, NextResponse } from 'next/server'
import { parseQuoteDocument } from '@/lib/ai/claude'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let textContent: string

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      textContent = await file.text()
    } else {
      const body = await request.json()
      textContent = body.content
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No content to parse' },
        { status: 400 }
      )
    }

    const result = await parseQuoteDocument(textContent)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Quote parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse quote document' },
      { status: 500 }
    )
  }
}
