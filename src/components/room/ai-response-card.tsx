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
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const matches = [...text.matchAll(codeBlockRegex)]
    if (matches.length > 0) {
      // Extract just the code blocks
      const codeBlocks = matches.map(match => ({
        language: match[1] || 'javascript',
        code: match[2].trim()
      }))
      return {
        hasCode: true,
        codeBlocks,
        fullText: text
      }
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
        
        <CardContent>
          {(() => {
            const codeInfo = extractCode(content)
            if (codeInfo.hasCode) {
              return (
                <Tabs defaultValue="code" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="code">
                      <Code2 className="w-4 h-4 mr-2" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="full">
                      <Eye className="w-4 h-4 mr-2" />
                      Full Response
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="code" className="mt-4 space-y-4">
                    {codeInfo.codeBlocks.map((block, index) => (
                      <div key={index}>
                        {codeInfo.codeBlocks.length > 1 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Code block {index + 1} ({block.language})
                          </p>
                        )}
                        <div className="rounded-md bg-gray-900 p-4 overflow-auto max-h-[300px]">
                          <pre className="text-sm text-gray-100">
                            <code>{block.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="full" className="mt-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="max-h-[400px] overflow-y-auto">
                        <p className="whitespace-pre-wrap text-sm">{content}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )
            } else {
              // No code blocks - just show as regular text
              return (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="max-h-[400px] overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{content}</p>
                  </div>
                </div>
              )
            }
          })()}
        </CardContent>
      </Card>
    </motion.div>
  )
} 