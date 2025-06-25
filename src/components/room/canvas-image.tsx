'use client'

import { useState, useRef, useEffect } from 'react'
import { X, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CanvasImageProps {
  id: string
  src: string
  tempSrc?: string // Temporary local preview
  position: { x: number; y: number }
  size: { width: number; height: number }
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onRemove: (id: string) => void
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
}

export function CanvasImage({
  id,
  src,
  tempSrc,
  position,
  size,
  onMove,
  onResize,
  onRemove,
  isSelected = false,
  onSelect
}: CanvasImageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const imageRef = useRef<HTMLDivElement>(null)

  // Use tempSrc for immediate display, fallback to src
  const displaySrc = tempSrc || src

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || isResizing) return
    
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y
    const clickX = e.clientX
    const clickY = e.clientY
    let moved = false
    
    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse moved more than 5 pixels
      const distance = Math.sqrt(
        Math.pow(e.clientX - clickX, 2) + 
        Math.pow(e.clientY - clickY, 2)
      )
      
      if (distance > 5) {
        moved = true
        if (!isDragging) {
          setIsDragging(true)
        }
        onMove(id, e.clientX - startX, e.clientY - startY)
      }
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!moved && onSelect) {
        // It was a click, not a drag
        onSelect(e as any)
      }
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Resize logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = size.width
    const startHeight = size.height
    const aspectRatio = startWidth / startHeight
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      // Use larger delta to maintain aspect ratio
      const delta = Math.max(deltaX, deltaY)
      
      const newWidth = Math.max(100, startWidth + delta)
      const newHeight = newWidth / aspectRatio
      
      onResize(id, newWidth, newHeight)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <motion.div
      ref={imageRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn(
        "absolute group",
        isDragging && "cursor-grabbing",
        !isDragging && "cursor-grab"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        "relative w-full h-full rounded-lg overflow-hidden shadow-xl",
        isSelected ? "ring-4 ring-blue-500" : "ring-2 ring-transparent hover:ring-gray-300",
        "transition-all duration-200"
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        <img 
          src={imageError ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEN0Q5REIiLz4KPHBhdGggZD0iTTM1IDM1SDY1VjY1SDM1VjM1WiIgZmlsbD0iI0M3Q0FDQyIvPgo8L3N2Zz4K' : displaySrc}
          alt="Canvas image" 
          className={cn(
            "w-full h-full object-contain bg-white",
            isLoading && "opacity-0"
          )}
          draggable={false}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true)
            setIsLoading(false)
            console.error('Failed to load image:', src)
          }}
        />
        
        {/* Controls on hover */}
        <div className={cn(
          "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
          (isDragging || isResizing) && "opacity-100"
        )}>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(id)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-blue-500/20 flex items-end justify-end p-1"
          onMouseDown={handleResizeMouseDown}
        >
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 17.414l4.414-4.414v4.414h-4.414zM13.586 12.586l6.414-6.414v6.414h-6.414z"/>
          </svg>
        </div>
      </div>
    </motion.div>
  )
} 