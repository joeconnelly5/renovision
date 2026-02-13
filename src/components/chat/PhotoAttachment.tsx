'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { FileRecord } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/format'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface PhotoAttachmentProps {
  onSelect: (urls: string[]) => void
  isOpen: boolean
  onClose: () => void
}

export function PhotoAttachment({ onSelect, isOpen, onClose }: PhotoAttachmentProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    const fetchFiles = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('files')
        .select('*')
        .eq('file_type', 'image')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false })

      setFiles(data || [])
      setLoading(false)
    }

    setSelected(new Set())
    fetchFiles()
  }, [isOpen])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const urls = files
      .filter((f) => selected.has(f.id))
      .map((f) => `${SUPABASE_URL}/storage/v1/object/public/photos/${f.storage_path}`)
    onSelect(urls)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Attach Photos {selected.size > 0 && `(${selected.size} selected)`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Loading photos...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">No photos available. Upload some first.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {files.map((file) => {
                const isSelected = selected.has(file.id)
                return (
                  <div
                    key={file.id}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all',
                      isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                    )}
                    onClick={() => toggleSelect(file.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${SUPABASE_URL}/storage/v1/object/public/photos/${file.storage_path}`}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    {file.is_favorite && (
                      <Badge className="absolute bottom-1 left-1 text-[10px] px-1 py-0" variant="secondary">
                        Fav
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selected.size === 0}>
                Attach {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
