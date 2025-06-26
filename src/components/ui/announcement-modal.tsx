import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"

interface AnnouncementModalProps {
  onClose?: () => void
  // Allow custom content to be passed in
  children?: React.ReactNode
  title?: string
  description?: string
  version?: string // For different announcements
}

export function AnnouncementModal({ 
  onClose, 
  children,
  title = "Welcome to ThisThat! 🎨",
  description = "Here's how to make the most of your collaborative workspace",
  version = "v1"
}: AnnouncementModalProps) {
  const [open, setOpen] = useState(false)
  
  useEffect(() => {
    const storageKey = `hasSeenAnnouncement-${version}`
    const hasSeenAnnouncement = localStorage.getItem(storageKey)
    if (!hasSeenAnnouncement) {
      setOpen(true)
    }
  }, [version])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem(`hasSeenAnnouncement-${version}`, 'true')
    onClose?.()
  }

  // Default content if no children provided
  const defaultContent = (
    <div className="space-y-4">
      {/* AI Commands Section */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-2xl">🤖</span> Using AI Commands
        </h3>
        <p className="text-base text-gray-600">
          Type @ followed by the AI provider:
        </p>
        <div className="bg-gray-50 p-3 rounded-md space-y-1 text-base">
          <div><code className="font-mono">@claude</code> - Advanced analysis</div>
          <div><code className="font-mono">@gpt</code> - General tasks</div>
          <div><code className="font-mono">@gemini</code> - Google's AI</div>
        </div>
      </div>

      {/* Canvas Selection */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-2xl">🎯</span> Smart Selection
        </h3>
        <p className="text-base text-gray-600">
          Select any item on canvas and ask AI to iterate on it!
        </p>
      </div>

      {/* Free Time */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-2xl">🎬</span> Get Free Time
        </h3>
        <p className="text-base text-gray-600">
          Record & share to gallery = <strong>+10 minutes free!</strong>
        </p>
      </div>

      {/* Example with image */}
      {/* <img 
        src="/demo.gif" 
        alt="Demo" 
        className="rounded-md w-full mt-4"
      /> */}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {children || defaultContent}
        </ScrollArea>

        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleClose} 
            className="bg-[#323783] hover:bg-[#252d5f]"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 