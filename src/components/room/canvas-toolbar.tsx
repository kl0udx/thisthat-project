'use client'

import { Button } from '@/components/ui/button'
import { Pencil, Move, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import type { InfiniteCanvasRef } from './infinite-canvas'

interface CanvasToolbarProps {
  canvasRef: React.RefObject<InfiniteCanvasRef | null>
}

export function CanvasToolbar({ canvasRef }: CanvasToolbarProps) {
  const activeTool = useRef('draw')

  const handleToolChange = (tool: string) => {
    activeTool.current = tool
    canvasRef.current?.setActiveTool(tool)
  }

  const handleClear = () => {
    canvasRef.current?.clearCanvas()
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
      <Button
        variant={activeTool.current === 'draw' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => handleToolChange('draw')}
        title="Draw"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool.current === 'pan' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => handleToolChange('pan')}
        title="Pan"
      >
        <Move className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClear}
        title="Clear Canvas"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
} 