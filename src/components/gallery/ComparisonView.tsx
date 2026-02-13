'use client'

import { useState } from 'react'
import { FileRecord } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

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

interface ComparisonViewProps {
  files: FileRecord[]
}

export function ComparisonView({ files }: ComparisonViewProps) {
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  const currentStateFiles = files.filter((f) => f.category === 'current_state')
  const inspirationFiles = files.filter(
    (f) => f.category === 'inspiration' || f.category === 'rendering'
  )

  const leftFile = currentStateFiles.find((f) => f.id === leftId)
  const rightFile = inspirationFiles.find((f) => f.id === rightId)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Current State */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Current State</Label>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a current state photo" />
            </SelectTrigger>
            <SelectContent>
              {currentStateFiles.map((file) => (
                <SelectItem key={file.id} value={file.id}>
                  {file.filename}
                  {file.room ? ` (${roomLabels[file.room] || file.room})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="aspect-[4/3] rounded-lg border bg-muted overflow-hidden">
            {leftFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getImageUrl(leftFile)}
                alt={leftFile.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a photo
              </div>
            )}
          </div>
          {leftFile?.notes && (
            <p className="text-sm text-muted-foreground">{leftFile.notes}</p>
          )}
        </div>

        {/* Right: Inspiration */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Inspiration / Rendering</Label>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an inspiration photo" />
            </SelectTrigger>
            <SelectContent>
              {inspirationFiles.map((file) => (
                <SelectItem key={file.id} value={file.id}>
                  {file.filename}
                  {file.room ? ` (${roomLabels[file.room] || file.room})` : ''}
                  {file.ai_generated ? ' [AI]' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="aspect-[4/3] rounded-lg border bg-muted overflow-hidden">
            {rightFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getImageUrl(rightFile)}
                alt={rightFile.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a photo
              </div>
            )}
          </div>
          {rightFile?.notes && (
            <p className="text-sm text-muted-foreground">{rightFile.notes}</p>
          )}
        </div>
      </div>

      {currentStateFiles.length === 0 && inspirationFiles.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Upload current state and inspiration photos to use the comparison view
        </p>
      )}
    </div>
  )
}
