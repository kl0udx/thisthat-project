import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Upload, X } from 'lucide-react'

interface RecordingPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string | null
  videoBlob: Blob | null
  onUpload: () => void
  isUploading: boolean
  onGalleryUpload: () => void
}

export function RecordingPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  videoBlob,
  onUpload,
  isUploading,
  onGalleryUpload
}: RecordingPreviewModalProps) {
  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = `thisthat-recording-${new Date().toISOString()}.webm`
      a.click()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recording Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg bg-black"
              autoPlay
            />
          )}
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!videoUrl}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={onGalleryUpload}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Share to Gallery (+10 min)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 