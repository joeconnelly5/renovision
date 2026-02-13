import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function streamChatResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  imageUrls?: string[]
) {
  // Build the messages array for the API
  const formattedMessages: Anthropic.MessageParam[] = messages.map((msg, index) => {
    // For the last user message, attach images if provided
    if (
      msg.role === 'user' &&
      index === messages.length - 1 &&
      imageUrls &&
      imageUrls.length > 0
    ) {
      const content: Anthropic.ContentBlockParam[] = imageUrls.map((url) => ({
        type: 'image' as const,
        source: {
          type: 'url' as const,
          url,
        },
      }))
      content.push({ type: 'text' as const, text: msg.content })
      return { role: msg.role as 'user', content }
    }
    return { role: msg.role as 'user' | 'assistant', content: msg.content }
  })

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: formattedMessages,
  })

  return stream
}

export async function parseQuoteDocument(content: string): Promise<{
  vendor_name: string
  date: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract the quote details from this document content. Return ONLY valid JSON, no other text.

Document content:
${content}

Return JSON in this exact format:
{
  "vendor_name": "string",
  "date": "YYYY-MM-DD",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number
}`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response')
  }

  return JSON.parse(jsonMatch[0])
}
