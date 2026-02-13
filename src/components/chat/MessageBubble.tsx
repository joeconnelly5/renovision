'use client'

import { cn } from '@/lib/utils/format'
import { Bot, User } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface MessageBubbleProps {
  message: {
    role: string
    content: string
    image_urls?: string[]
    created_at?: string
  }
}

function formatMarkdown(text: string): string {
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.slice(3, -3).replace(/^\w+\n/, '')
      return `<pre class="bg-muted rounded p-2 my-2 text-xs overflow-x-auto"><code>${code}</code></pre>`
    })
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks (but not between list items or after headers)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  return html
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 max-w-full', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'rounded-lg px-4 py-3 max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border'
        )}
      >
        {/* Attached images */}
        {message.image_urls && message.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.image_urls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Attached ${i + 1}`}
                className="w-20 h-20 object-cover rounded"
              />
            ))}
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            'text-sm leading-relaxed prose-sm',
            isUser ? 'text-primary-foreground' : ''
          )}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />

        {message.created_at && (
          <p
            className={cn(
              'text-xs mt-2 opacity-60',
              isUser ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
