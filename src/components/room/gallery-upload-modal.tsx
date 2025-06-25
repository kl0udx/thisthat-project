import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface GalleryUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string, description: string) => void
  isUploading: boolean
}

export function GalleryUploadModal({
  isOpen,
  onClose,
  onConfirm,
  isUploading
}: GalleryUploadModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  const handleSubmit = () => {
    onConfirm(
      title || 'Untitled Recording',
      description || 'A collaborative session on thisThat'
    )
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share to Gallery</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Give your recording a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you created..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🎁 Sharing to gallery adds <strong>10 minutes</strong> to your room timer!
            </p>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Share to Gallery'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 