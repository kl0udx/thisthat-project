'use client'

import { useState, useRef, useEffect } from 'react'
import { X, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CanvasImageProps {
  id: string
  src: string
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
  const imageRef = useRef<HTMLDivElement>(null)

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || isResizing) return
    
    setIsDragging(true)
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y
    
    const handleMouseMove = (e: MouseEvent) => {
      onMove(id, e.clientX - startX, e.clientY - startY)
    }
    
    const handleMouseUp = () => {
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
      onClick={(e) => {
        if (!isDragging && onSelect) {
          onSelect(e)
        }
      }}
    >
      <div className={cn(
        "relative w-full h-full rounded-lg overflow-hidden shadow-xl",
        isSelected ? "ring-4 ring-blue-500" : "ring-2 ring-transparent hover:ring-gray-300",
        "transition-all duration-200"
      )}>
        <img 
          src={src} 
          alt="Pasted image" 
          className="w-full h-full object-contain bg-white"
          draggable={false}
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