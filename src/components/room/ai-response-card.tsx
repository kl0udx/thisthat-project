'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, X, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AIResponseCardProps {
  id: string
  content: string
  prompt: string
  provider: string
  executedBy: string
  position: { x: number; y: number }
  onMove: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}

export function AIResponseCard({
  id,
  content,
  prompt,
  provider,
  executedBy,
  position,
  onMove,
  onRemove
}: AIResponseCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the header
    if (!(e.target as HTMLElement).closest('.drag-handle')) return
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      onMove(id, e.clientX - dragStart.x, e.clientY - dragStart.y)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, id, onMove])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    // Could add toast notification here
  }

  const getProviderInfo = () => {
    switch (provider) {
      case 'anthropic':
        return { name: 'Claude', color: 'bg-purple-500', icon: '🧠' }
      case 'openai':
        return { name: 'ChatGPT', color: 'bg-green-500', icon: '🤖' }
      case 'google':
        return { name: 'Gemini', color: 'bg-blue-500', icon: '✨' }
      default:
        return { name: provider, color: 'bg-gray-500', icon: '🤖' }
    }
  }

  const providerInfo = getProviderInfo()

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute"
      style={{ 
        left: position.x, 
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className={cn(
        "w-[450px] shadow-2xl",
        "bg-white dark:bg-gray-900",
        "border-2",
        isDragging && "opacity-90"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 drag-handle cursor-grab">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                providerInfo.color
              )}>
                {providerInfo.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{providerInfo.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    via {executedBy}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  "{prompt}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                onClick={() => onRemove(id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="max-h-[400px] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm">{content}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 