import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'
import { DESIGN_ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { messages, sessionId, imageUrls } = await request.json()
    const supabase = createServerClient()

    // Fetch design decisions to include in context
    const { data: decisions } = await supabase
      .from('design_decisions')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch favorited files for context
    const { data: favFiles } = await supabase
      .from('files')
      .select('*')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build dynamic system prompt
    let systemPrompt = DESIGN_ASSISTANT_SYSTEM_PROMPT

    if (decisions && decisions.length > 0) {
      systemPrompt += '\n\n## Current Design Decisions\n'
      for (const d of decisions) {
        systemPrompt += `- ${d.title} (${d.category}, ${d.status}): ${d.description || ''}`
        if (d.product_name) systemPrompt += ` | Product: ${d.product_name}`
        if (d.product_code) systemPrompt += ` (${d.product_code})`
        if (d.brand) systemPrompt += ` by ${d.brand}`
        systemPrompt += '\n'
      }
    }

    if (favFiles && favFiles.length > 0) {
      systemPrompt += '\n\n## Favorited Reference Photos\n'
      systemPrompt += 'The homeowners have favorited these photos as important references:\n'
      for (const f of favFiles) {
        systemPrompt += `- ${f.filename} (${f.category}, ${f.room || 'general'}): ${f.notes || 'No notes'}\n`
      }
    }

    // Save user message
    if (sessionId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'user') {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: lastMsg.content,
          image_urls: imageUrls || [],
        })
      }
    }

    // Build Anthropic messages
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (msg: { role: string; content: string }, index: number) => {
        if (
          msg.role === 'user' &&
          index === messages.length - 1 &&
          imageUrls &&
          imageUrls.length > 0
        ) {
          const content: Anthropic.ContentBlockParam[] = imageUrls.map(
            (url: string) => ({
              type: 'image' as const,
              source: { type: 'url' as const, url },
            })
          )
          content.push({ type: 'text' as const, text: msg.content })
          return { role: 'user' as const, content }
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }
      }
    )

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    // Create a TransformStream for SSE
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text
              fullResponse += text
              controller.enqueue(
                encoder.encode(`data: ${text}\n\n`)
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          // Save assistant response
          if (sessionId) {
            await supabase.from('chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
            })

            // Update session timestamp
            await supabase
              .from('chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', sessionId)
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
