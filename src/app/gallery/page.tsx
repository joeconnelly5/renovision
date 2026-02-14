'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { FileRecord } from '@/types'
import { PhotoGrid } from '@/components/gallery/PhotoGrid'
import UploadDropzone from '@/components/gallery/UploadDropzone'
import { ComparisonView } from '@/components/gallery/ComparisonView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Star, Search } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const rooms = [
  { value: 'all', label: 'All Rooms' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'living_dining', label: 'Living/Dining' },
  { value: 'bedroom_1', label: 'Bedroom 1' },
  { value: 'bedroom_2', label: 'Bedroom 2' },
  { value: 'bedroom_3', label: 'Bedroom 3' },
  { value: 'upper_hall', label: 'Upper Hall' },
  { value: 'front_entry', label: 'Front Entry' },
  { value: 'rear_entry', label: 'Rear Entry' },
  { value: 'staircase', label: 'Staircase' },
  { value: 'mudroom', label: 'Mudroom' },
]

export default function GalleryPage() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [roomFilter, setRoomFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const { toast } = useToast()

  const fetchFiles = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load photos:', error)
      } else {
        const imageFiles = (data || []).filter((f: FileRecord) => f.file_type?.startsWith('image/'))
        setFiles(imageFiles)
      }
    } catch (err) {
      console.error('Failed to load photos:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleToggleFavorite = async (id: string) => {
    const file = files.find((f) => f.id === id)
    if (!file) return

    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('files')
      .update({ is_favorite: !file.is_favorite })
      .eq('id', id)

    if (error) {
      toast({ title: 'Error', description: 'Failed to update favorite', variant: 'destructive' })
    } else {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_favorite: !f.is_favorite } : f))
      )
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('files').delete().eq('id', id)

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete photo', variant: 'destructive' })
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== id))
      toast({ title: 'Deleted', description: 'Photo removed' })
    }
  }

  const filterFiles = (category?: string) => {
    let filtered = files

    if (category) {
      filtered = filtered.filter((f) => f.category === category)
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter((f) => f.room === roomFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.filename.toLowerCase().includes(s) ||
          f.notes?.toLowerCase().includes(s) ||
          f.tags?.some((t) => t.toLowerCase().includes(s))
      )
    }
    if (showFavorites) {
      filtered = filtered.filter((f) => f.is_favorite)
    }

    return filtered
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-60" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Photos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Photos</DialogTitle>
            </DialogHeader>
            <UploadDropzone
              onUploadComplete={() => {
                setUploadOpen(false)
                fetchFiles()
              }}
            />
          </DialogContent>
        </Dialog>

        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search photos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-60"
          />
        </div>

        <Button
          variant={showFavorites ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFavorites(!showFavorites)}
        >
          <Star className={showFavorites ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
        </Button>

        <span className="text-sm text-muted-foreground ml-auto">
          {files.length} photo{files.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Photos</TabsTrigger>
          <TabsTrigger value="current_state">Current State</TabsTrigger>
          <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
          <TabsTrigger value="rendering">Renderings</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PhotoGrid
            files={filterFiles()}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="current_state" className="mt-4">
          <PhotoGrid
            files={filterFiles('current_state')}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="inspiration" className="mt-4">
          <PhotoGrid
            files={filterFiles('inspiration')}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="rendering" className="mt-4">
          <PhotoGrid
            files={filterFiles('rendering')}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <ComparisonView files={files} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
