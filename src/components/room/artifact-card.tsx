'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Code2, 
  Globe, 
  FileText, 
  Copy, 
  Check,
  X,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/lib/artifact-store'

interface ArtifactCardProps {
  id: string
  artifact?: Artifact
  position: { x: number; y: number }
  size: { width: number; height: number }
  isSelected?: boolean
  onSelect?: () => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onRemove: (id: string) => void
}

export function ArtifactCard({
  id,
  artifact,
  position,
  size,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onRemove
}: ArtifactCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(artifact?.type === 'html')
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!artifact) return null
  
  const getIcon = () => {
    switch (artifact.type) {
      case 'code': return <Code2 className="h-4 w-4" />
      case 'html': return <Globe className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        width: isExpanded ? Math.min(size.width * 1.5, 900) : size.width,
        height: isExpanded ? Math.min(size.height * 1.5, 600) : size.height
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 border-b cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-sm">{artifact.title}</span>
          <Badge variant="secondary" className="text-xs">
            {artifact.type}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {artifact.type === 'html' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 
                <EyeOff className="h-3.5 w-3.5" /> : 
                <Eye className="h-3.5 w-3.5" />
              }
            </Button>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setIsExpanded(!isExpanded)
              if (!isExpanded) {
                onResize(id, size.width * 1.5, size.height * 1.5)
              } else {
                onResize(id, size.width / 1.5, size.height / 1.5)
              }
            }}
          >
            {isExpanded ? 
              <Minimize2 className="h-3.5 w-3.5" /> : 
              <Maximize2 className="h-3.5 w-3.5" />
            }
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? 
              <Check className="h-3.5 w-3.5 text-green-600" /> : 
              <Copy className="h-3.5 w-3.5" />
            }
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onRemove(id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="overflow-auto" style={{ height: 'calc(100% - 48px)' }}>
        {artifact.type === 'html' && showPreview ? (
          <iframe
            srcDoc={artifact.content}
            className="w-full h-full bg-white"
            sandbox="allow-scripts"
            title={artifact.title}
          />
        ) : (
          <pre className="p-4 text-sm">
            <code>{artifact.content}</code>
          </pre>
        )}
      </div>
      
      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-gray-200"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, #e5e7eb 50%)'
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          
          const startX = e.clientX
          const startY = e.clientY
          const startWidth = size.width
          const startHeight = size.height
          
          const handleResize = (e: MouseEvent) => {
            const newWidth = Math.max(300, Math.min(1200, startWidth + e.clientX - startX))
            const newHeight = Math.max(200, Math.min(800, startHeight + e.clientY - startY))
            onResize(id, newWidth, newHeight)
          }
          
          const stopResize = () => {
            document.removeEventListener('mousemove', handleResize)
            document.removeEventListener('mouseup', stopResize)
          }
          
          document.addEventListener('mousemove', handleResize)
          document.addEventListener('mouseup', stopResize)
        }}
      />
    </Card>
  )
} 