'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Maximize2, X, Code, Eye, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  // Detect if content is code
  const isCode = content.includes('```') || content.includes('function') || content.includes('const')
  
  // Extract code if present
  const extractCode = (text: string) => {
    const codeMatch = text.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      return {
        code: codeMatch[1].trim(),
        language: text.match(/```(\w+)/)?.[1] || 'javascript'
      }
    }
    return { code: text, language: 'javascript' }
  }

  const { code, language } = isCode ? extractCode(content) : { code: content, language: 'text' }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    
    setIsDragging(true)
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      onMove(id, newX, newY)
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
  }, [isDragging, dragOffset, id, onMove])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    // Could add toast notification here
  }

  const getProviderIcon = () => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '✨'
      default: return '🤖'
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <Card className={`w-[450px] shadow-xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getProviderIcon()}</span>
              <div>
                <h3 className="font-semibold text-sm">{provider.charAt(0).toUpperCase() + provider.slice(1)}</h3>
                <p className="text-xs text-muted-foreground">via {executedBy}</p>
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
                className="h-8 w-8"
                onClick={() => onRemove(id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Prompt: "{prompt.slice(0, 50)}..."</p>
          </div>
        </CardHeader>
        
        <CardContent>
          {isCode ? (
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="code" className="mt-2">
                <div className="relative">
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      maxHeight: '300px'
                    }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-md p-4 min-h-[200px] bg-white">
                  <p className="text-xs text-muted-foreground text-center">
                    Preview coming soon...
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 