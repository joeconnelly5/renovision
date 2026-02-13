'use client'

import { useState } from 'react'
import { FileRecord } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Star, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/format'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface PhotoGridProps {
  files: FileRecord[]
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
}

function getImageUrl(file: FileRecord): string {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${file.storage_path}`
}

const roomLabels: Record<string, string> = {
  kitchen: 'Kitchen',
  living_dining: 'Living/Dining',
  bedroom_1: 'Bedroom 1',
  bedroom_2: 'Bedroom 2',
  bedroom_3: 'Bedroom 3',
  upper_hall: 'Upper Hall',
  front_entry: 'Front Entry',
  rear_entry: 'Rear Entry',
  staircase: 'Staircase',
  mudroom: 'Mudroom',
  general: 'General',
}

const categoryLabels: Record<string, string> = {
  current_state: 'Current State',
  inspiration: 'Inspiration',
  rendering: 'Rendering',
  quote: 'Quote',
  contract: 'Contract',
  receipt: 'Receipt',
  spec_sheet: 'Spec Sheet',
  other: 'Other',
}

export function PhotoGrid({ files, onToggleFavorite, onDelete }: PhotoGridProps) {
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg">No photos yet</p>
        <p className="text-sm mt-1">Upload photos to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group relative rounded-lg border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          >
            <div
              className="aspect-square relative"
              onClick={() => setSelectedFile(file)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(file)}
                alt={file.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {file.ai_generated && (
                <Badge className="absolute top-2 left-2" variant="secondary">
                  AI Generated
                </Badge>
              )}
            </div>

            <div className="p-2">
              <p className="text-sm font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {file.room && (
                  <Badge variant="outline" className="text-xs">
                    {roomLabels[file.room] || file.room}
                  </Badge>
                )}
                {file.category && (
                  <Badge variant="secondary" className="text-xs">
                    {categoryLabels[file.category] || file.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(file.id)
                }}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    file.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''
                  )}
                />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm(file.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFile?.filename}</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(selectedFile)}
                alt={selectedFile.filename}
                className="w-full rounded-lg"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {selectedFile.room && (
                  <Badge variant="outline">
                    {roomLabels[selectedFile.room] || selectedFile.room}
                  </Badge>
                )}
                {selectedFile.category && (
                  <Badge variant="secondary">
                    {categoryLabels[selectedFile.category] || selectedFile.category}
                  </Badge>
                )}
                {selectedFile.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              {selectedFile.notes && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.notes}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm)
                  setDeleteConfirm(null)
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
