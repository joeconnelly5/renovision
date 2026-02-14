'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { ChatSession, ChatMessage } from '@/types'
import { MessageBubble } from './MessageBubble'
import { PhotoAttachment } from './PhotoAttachment'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Send,
  ImagePlus,
  Square,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils/format'

interface LocalMessage {
  role: 'user' | 'assistant'
  content: string
  image_urls?: string[]
  created_at?: string
}

export function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })

      setSessions(data || [])
      if (data && data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id)
      }
      setLoading(false)
    }
    fetchSessions()
  }, [activeSessionId])

  // Fetch messages when session changes
  useEffect(() => {
    if (!activeSessionId) return

    const fetchMessages = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: true })

      setMessages(
        (data || []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          image_urls: m.image_urls,
          created_at: m.created_at,
        }))
      )
    }
    fetchMessages()
  }, [activeSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  const createNewSession = async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('chat_sessions')
      .insert({
        title: `Design Session — ${new Date().toLocaleDateString()}`,
      })
      .select()
      .single()

    if (data) {
      setSessions((prev) => [data, ...prev])
      setActiveSessionId(data.id)
      setMessages([])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !activeSessionId) return

    const userMessage: LocalMessage = {
      role: 'user',
      content: input.trim(),
      image_urls: attachedImages.length > 0 ? [...attachedImages] : undefined,
      created_at: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setAttachedImages([])
    setIsStreaming(true)
    setStreamingMessage('')

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: activeSessionId,
          imageUrls: userMessage.image_urls,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            fullText += data
            setStreamingMessage(fullText)
          }
        }
      }

      // Check for image generation tags
      const imageTagRegex = /\[GENERATE_IMAGE\s+room="([^"]*)"(?:\s+style="([^"]*)")?\]([\s\S]*?)\[\/GENERATE_IMAGE\]/g
      const imageMatch = imageTagRegex.exec(fullText)

      let displayText = fullText
      if (imageMatch) {
        const [fullTag, room, style, prompt] = imageMatch
        displayText = fullText.replace(fullTag, '🎨 *Generating rendering...*')

        // Add assistant message with placeholder
        const assistantMessage: LocalMessage = {
          role: 'assistant',
          content: displayText,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Call image generation API
        try {
          const imgResponse = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.trim(), room, style }),
          })

          if (imgResponse.ok) {
            const imgData = await imgResponse.json()
            const imageUrl = imgData.public_url
            // Update the message to include the generated image
            const finalText = fullText.replace(fullTag, `\n\n![Generated rendering of ${room}](${imageUrl})\n\n*AI-generated rendering saved to your Gallery.*`)
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: finalText,
                image_urls: [imageUrl],
              }
              return updated
            })
          } else {
            const finalText = fullText.replace(fullTag, '\n\n*Image generation failed. Please try again.*')
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: finalText,
              }
              return updated
            })
          }
        } catch (imgError) {
          console.error('Image generation error:', imgError)
        }
      } else {
        // Add assistant message normally
        const assistantMessage: LocalMessage = {
          role: 'assistant',
          content: fullText,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Chat error:', error)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, there was an error processing your request. Please try again.',
            created_at: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setIsStreaming(false)
      setStreamingMessage('')
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    if (streamingMessage) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: streamingMessage,
          created_at: new Date().toISOString(),
        },
      ])
    }
    setIsStreaming(false)
    setStreamingMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full gap-0 rounded-lg border bg-card overflow-hidden">
        <div className="w-60 border-r p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full rounded-lg border bg-card overflow-hidden">
      {/* Sessions sidebar */}
      <div className="w-60 border-r flex flex-col bg-muted/30">
        <div className="p-3">
          <Button onClick={createNewSession} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id)
                  setMessages([])
                }}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
                  activeSessionId === session.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{session.title || 'Untitled'}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Design Assistant</h3>
                <p className="text-sm mt-1 text-center max-w-md">
                  I&apos;m your interior design consultant for 53 Thurston Road.
                  Ask me about colors, materials, layouts, or attach photos for feedback.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {isStreaming && streamingMessage && (
              <MessageBubble
                message={{
                  role: 'assistant',
                  content: streamingMessage,
                }}
              />
            )}

            {isStreaming && !streamingMessage && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            {/* Attached images preview */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {attachedImages.map((url, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Attached ${i + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      onClick={() =>
                        setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPhotoPickerOpen(true)}
                disabled={isStreaming}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>

              <Textarea
                placeholder="Ask about design, colors, materials..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[40px] max-h-[120px] resize-none"
                disabled={isStreaming}
              />

              {isStreaming ? (
                <Button variant="destructive" size="icon" onClick={handleStop}>
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || !activeSessionId}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PhotoAttachment
        isOpen={photoPickerOpen}
        onClose={() => setPhotoPickerOpen(false)}
        onSelect={(urls) => setAttachedImages((prev) => [...prev, ...urls])}
      />
    </div>
  )
}
