'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Pencil, 
  Square, 
  Eraser, 
  Trash2, 
  MousePointer,
  Circle,
  Type,
  Bot,
  Plus,
  Video,
  Camera
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AIProviderButton } from './ai-provider-button'

interface CanvasToolbarProps {
  activeTool: string
  onToolChange: (tool: string) => void
  onClearCanvas: () => void
  hasSelection: boolean
  onDeleteSelection: () => void
  onOpenAIProviders: () => void
  activeProviders: number
  isRecording?: boolean
  onStartRecording?: () => void
  onStopRecording?: () => void
}

export function CanvasToolbar({ 
  activeTool, 
  onToolChange, 
  onClearCanvas,
  hasSelection,
  onDeleteSelection,
  onOpenAIProviders,
  activeProviders,
  isRecording,
  onStartRecording,
  onStopRecording
}: CanvasToolbarProps) {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pen', icon: Pencil, label: 'Draw' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
      <Button
        variant={activeTool === 'select' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onToolChange('select')}
        title="Select (V)"
      >
        <MousePointer className="h-4 w-4" />
      </Button>
      
      <Button
        variant={activeTool === 'pen' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onToolChange('pen')}
        title="Pen (P)"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      
      <Button
        variant={activeTool === 'eraser' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onToolChange('eraser')}
        title="Eraser (E)"
      >
        <Eraser className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {hasSelection && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDeleteSelection}
          title="Delete Selection (Delete)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearCanvas}
        title="Clear Canvas"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenAIProviders}
        className="h-9 w-9 relative"
        title="Add AI Providers"
      >
        <Bot className="h-4 w-4" />
        {activeProviders > 0 ? (
          <Badge 
            className="absolute -top-1 -right-1 h-4 min-w-[16px] p-0 px-1 text-[10px]"
            variant="default"
          >
            {activeProviders}
          </Badge>
        ) : (
          <Badge 
            className="absolute -top-1 -right-1 h-4 w-4 p-0 animate-pulse"
            variant="destructive"
          >
            <Plus className="h-2 w-2" />
          </Badge>
        )}
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        onClick={() => isRecording ? onStopRecording?.() : onStartRecording?.()}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        <Camera className={cn(
          "h-5 w-5",
          isRecording && "text-red-500"
        )} />
      </Button>
    </div>
  )
} 