'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, X, GripVertical, Code2, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AIResponseCardProps {
  id: string
  content: string
  prompt: string
  provider: string
  executedBy: string
  position: { x: number; y: number }
  size?: { width: number; height: number }
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onMove: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
}

export function AIResponseCard({
  id,
  content,
  prompt,
  provider,
  executedBy,
  position,
  size = { width: 450, height: 400 },
  onMove,
  onRemove,
  onResize,
  isSelected = false,
  onSelect
}: AIResponseCardProps) {
  // Add validation
  console.log('AIResponseCard props:', { id, content, prompt, provider })
  if (!content) {
    console.error('AIResponseCard received undefined content!')
    return null
  }

  const validSize = {
    width: typeof size?.width === 'number' && !isNaN(size.width) ? size.width : 450,
    height: typeof size?.height === 'number' && !isNaN(size.height) ? size.height : 400
  }
  
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cardSize, setCardSize] = useState(validSize)
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

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = cardSize.width
    const startHeight = cardSize.height
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      // Allow more freedom in sizing
      const newWidth = Math.max(250, startWidth + deltaX)  // Min 250px, no max
      const newHeight = Math.max(200, startHeight + deltaY)  // Min 200px, no max
      
      setCardSize({ width: newWidth, height: newHeight })
      if (onResize) {
        onResize(id, newWidth, newHeight)
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    // Could add toast notification here
  }

  const getProviderInfo = () => {
    switch (provider) {
      case 'anthropic':
        return { name: 'Claude', color: 'bg-purple-500', logo: '/logos/claude.png' }
      case 'openai':
        return { name: 'ChatGPT', color: 'bg-green-500', logo: '/logos/openai.png' }
      case 'google':
        return { name: 'Gemini', color: 'bg-blue-500', logo: '/logos/gemini.png' }
      default:
        return { name: provider, color: 'bg-gray-500', logo: '' }
    }
  }

  const providerInfo = getProviderInfo()

  const detectCode = (text: string) => {
    // Only consider it code if it has actual code blocks with ```
    return text.includes('```')
  }

  const extractCode = (text: string) => {
    try {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const matches = [...text.matchAll(codeBlockRegex)]
      if (matches && matches.length > 0 && matches[0]) {
        // Extract just the code blocks
        const codeBlocks = matches.map(match => ({
          language: match[1] || 'javascript',
          code: match[2]?.trim() || ''
        }))
        return {
          hasCode: true,
          codeBlocks,
          fullText: text
        }
      }
    } catch (error) {
      console.error('Error extracting code:', error)
    }
    return {
      hasCode: false,
      codeBlocks: [],
      fullText: text
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute"
      style={{ 
        left: position.x, 
        top: position.y,
        width: cardSize.width,
        height: cardSize.height
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging && onSelect) {
          onSelect(e)
        }
      }}
    >
      <Card className={cn(
        "shadow-2xl relative h-full flex flex-col",
        "bg-white dark:bg-gray-900",
        "border-2",
        isDragging && "opacity-90",
        isResizing && "opacity-90 select-none",
        isSelected ? "ring-4 ring-blue-500" : "ring-2 ring-transparent hover:ring-gray-300",
        "transition-all duration-200"
      )}>
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 drag-handle cursor-grab">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-white"
              )}>
                {providerInfo.logo ? (
                  <img src={providerInfo.logo} alt={providerInfo.name + ' logo'} className="w-8 h-8 object-contain" />
                ) : (
                  <span>{providerInfo.name[0]}</span>
                )}
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
        
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {(() => {
            const codeInfo = extractCode(content)
            if (codeInfo.hasCode) {
              return (
                <Tabs defaultValue="code" className="flex-1 flex flex-col">
                  <TabsList className="flex-shrink-0 grid w-full grid-cols-2">
                    <TabsTrigger value="code">
                      <Code2 className="w-4 h-4 mr-2" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="full">
                      <Eye className="w-4 h-4 mr-2" />
                      Full Response
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="code" className="flex-1 overflow-hidden mt-4">
                    <div className="h-full rounded-md bg-gray-900 p-4 overflow-auto">
                      {codeInfo.codeBlocks.map((block, index) => (
                        <div key={index}>
                          {codeInfo.codeBlocks.length > 1 && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Code block {index + 1} ({block.language})
                            </p>
                          )}
                          <pre className="text-sm text-gray-100">
                            <code>{block.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="full" className="flex-1 overflow-hidden mt-4">
                    <div className="h-full overflow-y-auto prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">{content}</p>
                    </div>
                  </TabsContent>
                </Tabs>
              )
            }
            return (
              <div className="flex-1 overflow-y-auto prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm">{content}</p>
              </div>
            )
          })()}
        </CardContent>

        <div
          className={cn(
            "absolute bottom-0 right-0 w-6 h-6 cursor-se-resize",
            "hover:bg-blue-500/10 transition-colors",
            "flex items-end justify-end p-1"
          )}
          onMouseDown={handleResizeMouseDown}
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 17.414l4.414-4.414v4.414h-4.414zM13.586 12.586l6.414-6.414v6.414h-6.414z"/>
          </svg>
        </div>
      </Card>
    </motion.div>
  )
} 