import { Copy, Check, Clock, Heart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useState } from 'react'

interface TimerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomCode: string
}

export function TimerModal({ open, onOpenChange, roomCode }: TimerModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      toast.success('Room code copied!')
      
      // Reset copy button after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      toast.error('Failed to copy room code')
    }
  }

  const handleBMC = () => {
    window.open('https://coff.ee/ThisThat', '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ☕
            Add Time to Your Room
          </DialogTitle>
          <DialogDescription>
            Support the project and get more time for your collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Code Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Room Code</label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 font-mono text-sm">{roomCode}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="font-medium">How to add time:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">1</span>
                <span>Copy your room code above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">2</span>
                <span>Click the "Buy Me a Coffee" button below</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">3</span>
                <span>Paste your room code in the comment field</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">4</span>
                <span>Complete your payment</span>
              </li>
            </ol>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Packages
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Badge variant="outline" className="flex flex-col items-center justify-center py-4 px-2 h-20">
                <span className="text-sm font-medium mb-1">1x ☕</span>
                <span className="text-xs">1 Coffee</span>
                <span className="text-xs font-medium">30 min</span>
              </Badge>
              <Badge variant="outline" className="flex flex-col items-center justify-center py-4 px-2 h-20">
                <span className="text-sm font-medium mb-1">3x ☕</span>
                <span className="text-xs">3 Coffees</span>
                <span className="text-xs font-medium">2 hours</span>
              </Badge>
              <Badge variant="outline" className="flex flex-col items-center justify-center py-4 px-2 h-20">
                <span className="text-sm font-medium mb-1">5x ☕</span>
                <span className="text-xs">5 Coffees</span>
                <span className="text-xs font-medium">4 hours</span>
              </Badge>
            </div>
          </div>

          {/* BMC Button */}
          <Button 
            onClick={handleBMC}
            className="w-full bg-[#9474e8] hover:bg-[#8a6fd8] text-white"
            size="lg"
          >
            ☕
            <span className="ml-2">Buy Me a Coffee</span>
          </Button>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p className="flex items-center justify-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-500" /> by ThisThat
            </p>
            <p>Time will be added automatically after payment</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 