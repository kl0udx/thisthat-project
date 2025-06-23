'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/lib/artifact-store'

interface ImageArtifactCardProps {
  id: string
  artifact?: Artifact
  preview: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isSelected?: boolean
  onSelect?: () => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onRemove: (id: string) => void
  onRequestFull: () => void
}

export function ImageArtifactCard({
  id,
  artifact,
  preview,
  position,
  size,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onRemove,
  onRequestFull
}: ImageArtifactCardProps) {
  const [showFull, setShowFull] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const loadFullImage = () => {
    if (!artifact && !loading) {
      setLoading(true)
      onRequestFull()
      // Set timeout to stop loading if no response
      setTimeout(() => setLoading(false), 5000)
    } else if (artifact) {
      setShowFull(true)
    }
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    onSelect?.()
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    onMove(id, e.clientX - dragStart.x, e.clientY - dragStart.y)
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])
  
  return (
    <Card
      className={cn(
        "absolute shadow-lg overflow-hidden",
        isSelected && "ring-2 ring-blue-500",
        isDragging && "cursor-move opacity-90"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
    >
      <div className="relative w-full h-full">
        <img 
          src={showFull && artifact ? artifact.content : preview}
          alt="Canvas image"
          className="w-full h-full object-contain"
          style={{ 
            filter: !showFull ? 'blur(1px)' : 'none',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
        
        {/* Quality indicator */}
        <Badge 
          className="absolute top-2 left-2"
          variant={showFull ? "default" : "secondary"}
        >
          {showFull ? 'Full Quality' : 'Preview'}
        </Badge>
        
        {/* Load full button */}
        {!showFull && (
          <Button
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            onClick={loadFullImage}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load Full Quality'
            )}
          </Button>
        )}
        
        {/* Controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => onRemove(id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
} 