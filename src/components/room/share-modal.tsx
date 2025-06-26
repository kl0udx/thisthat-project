'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Link as LinkIcon, Share2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ShareModalProps {
  roomCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareModal({ roomCode, open, onOpenChange }: ShareModalProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const roomUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomCode}`
    : `http://localhost:3001/room/${roomCode}`

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      
      if (type === 'code') {
        setCopiedCode(true)
        toast.success('Room code copied to clipboard!')
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        setCopiedLink(true)
        toast.success('Room link copied to clipboard!')
        setTimeout(() => setCopiedLink(false), 2000)
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my collaborative room',
          text: `Join my room: ${roomCode}`,
          url: roomUrl
        })
      } catch (err) {
        // Removed for production: console.log('Share cancelled or failed')
      }
    } else {
      // Fallback to copying link
      copyToClipboard(roomUrl, 'link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Share2 className="w-5 h-5" />
            Share Room
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Room Code Display */}
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="p-6 text-center">
              <div className="text-sm text-muted-foreground mb-2">Room Code</div>
              <div className="font-mono text-3xl font-bold tracking-wider text-gray-900 bg-white px-4 py-3 rounded-lg border shadow-sm">
                {roomCode}
              </div>
              <Button
                onClick={() => copyToClipboard(roomCode, 'code')}
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={copiedCode}
              >
                <AnimatePresence mode="wait">
                  {copiedCode ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                      Copied!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Copy Full Link */}
            <Button
              onClick={() => copyToClipboard(roomUrl, 'link')}
              variant="outline"
              className="w-full justify-start"
              disabled={copiedLink}
            >
              <AnimatePresence mode="wait">
                {copiedLink ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-green-600" />
                    Link Copied!
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Copy Full Link
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Native Share */}
            <Button
              onClick={shareNative}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          </div>

          {/* Simple QR Code (Text-based for MVP) */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-3">Quick Join</div>
              <div className="font-mono text-xs bg-gray-100 p-3 rounded border text-gray-600 break-all">
                {roomUrl}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Scan or type this URL on mobile
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Share the room code or link with others to collaborate</p>
            <p>They'll need to enter a nickname when joining</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 