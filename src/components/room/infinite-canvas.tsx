'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { AIResponseCard } from './ai-response-card'

interface Point {
  x: number
  y: number
}

interface Line {
  points: Point[]
  color: string
  width: number
  id: string
}

interface AIResponse {
  id: string
  content: string
  prompt: string
  provider: string
  executedBy: string
  position: { x: number; y: number }
}

export interface InfiniteCanvasRef {
  setActiveTool: (tool: string) => void
  clearCanvas: () => void
  addAIResponse: (response: AIResponse) => void
}

interface InfiniteCanvasProps {
  onShapeAdd?: (shape: Line) => void
  onAIResponseAdd?: (response: AIResponse) => void
}

const InfiniteCanvas = forwardRef<InfiniteCanvasRef, InfiniteCanvasProps>(({ onShapeAdd, onAIResponseAdd }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<Line[]>([])
  const [camera, setCamera] = useState({ x: 12500, y: 12500 }) // Camera position in world space
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [activeTool, setActiveTool] = useState('draw')
  const [aiResponses, setAIResponses] = useState<AIResponse[]>([])

  // Canvas dimensions
  const WORLD_SIZE = 25000
  const GRID_SIZE = 100

  useImperativeHandle(ref, () => ({
    setActiveTool: (tool: string) => setActiveTool(tool),
    clearCanvas: () => {
      setPaths([])
    },
    addAIResponse
  }))

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    return {
      x: (screenX - canvas.width / 2) / scale + camera.x,
      y: (screenY - canvas.height / 2) / scale + camera.y
    }
  }, [camera, scale])

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    return {
      x: (worldX - camera.x) * scale + canvas.width / 2,
      y: (worldY - camera.y) * scale + canvas.height / 2
    }
  }, [camera, scale])

  // Optimized draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with background
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Calculate visible world bounds
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)
    
    // Draw grid (only visible portion)
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    
    // Calculate grid range with padding
    const gridStartX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE
    const gridEndX = Math.ceil(bottomRight.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE
    const gridStartY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE
    const gridEndY = Math.ceil(bottomRight.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE
    
    // Clamp to world bounds
    const startX = Math.max(-GRID_SIZE, gridStartX)
    const endX = Math.min(WORLD_SIZE + GRID_SIZE, gridEndX)
    const startY = Math.max(-GRID_SIZE, gridStartY)
    const endY = Math.min(WORLD_SIZE + GRID_SIZE, gridEndY)
    
    ctx.beginPath()
    
    // Vertical lines
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      const screenX = worldToScreen(x, 0).x
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, canvas.height)
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      const screenY = worldToScreen(0, y).y
      ctx.moveTo(0, screenY)
      ctx.lineTo(canvas.width, screenY)
    }
    
    ctx.stroke()
    
    // Draw world bounds
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 3
    const boundsTopLeft = worldToScreen(0, 0)
    const boundsBottomRight = worldToScreen(WORLD_SIZE, WORLD_SIZE)
    
    ctx.strokeRect(
      boundsTopLeft.x,
      boundsTopLeft.y,
      boundsBottomRight.x - boundsTopLeft.x,
      boundsBottomRight.y - boundsTopLeft.y
    )
    
    // Draw origin marker
    if (topLeft.x <= 0 && bottomRight.x >= 0 && topLeft.y <= 0 && bottomRight.y >= 0) {
      const origin = worldToScreen(0, 0)
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw all paths
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    paths.forEach(path => {
      if (path.points.length < 2) return
      
      // Check if path is visible
      const minX = Math.min(...path.points.map(p => p.x))
      const maxX = Math.max(...path.points.map(p => p.x))
      const minY = Math.min(...path.points.map(p => p.y))
      const maxY = Math.max(...path.points.map(p => p.y))
      
      if (maxX < topLeft.x || minX > bottomRight.x || maxY < topLeft.y || minY > bottomRight.y) {
        return // Skip invisible paths
      }
      
      ctx.strokeStyle = path.color
      ctx.lineWidth = path.width * scale
      
      ctx.beginPath()
      const firstPoint = worldToScreen(path.points[0].x, path.points[0].y)
      ctx.moveTo(firstPoint.x, firstPoint.y)
      
      for (let i = 1; i < path.points.length; i++) {
        const point = worldToScreen(path.points[i].x, path.points[i].y)
        ctx.lineTo(point.x, point.y)
      }
      
      ctx.stroke()
    })
    
    // Draw current path
    if (currentPath.length > 0) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2 * scale
      
      ctx.beginPath()
      const firstPoint = worldToScreen(currentPath[0].x, currentPath[0].y)
      ctx.moveTo(firstPoint.x, firstPoint.y)
      
      for (let i = 1; i < currentPath.length; i++) {
        const point = worldToScreen(currentPath[i].x, currentPath[i].y)
        ctx.lineTo(point.x, point.y)
      }
      
      ctx.stroke()
    }
    
    // Draw HUD
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30)
    ctx.fillStyle = '#374151'
    ctx.font = '12px monospace'
    ctx.fillText(
      `Pos: ${Math.round(camera.x)}, ${Math.round(camera.y)} | Zoom: ${Math.round(scale * 100)}% | Canvas: 25,000×25,000px | Shift+Wheel: Zoom, Shift+Drag: Pan`, 
      10, 
      canvas.height - 10
    )
    
    // Pan mode indicator
    if (isPanning) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
      ctx.fillRect(canvas.width / 2 - 60, 10, 120, 30)
      ctx.fillStyle = 'white'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('PAN MODE', canvas.width / 2, 30)
      ctx.textAlign = 'left'
    }
  }, [camera, scale, paths, currentPath, isPanning, screenToWorld, worldToScreen])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (e.shiftKey || activeTool === 'pan') {
      setIsPanning(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
    } else {
      setIsDrawing(true)
      const worldPos = screenToWorld(x, y)
      
      // Clamp to world bounds
      worldPos.x = Math.max(0, Math.min(WORLD_SIZE, worldPos.x))
      worldPos.y = Math.max(0, Math.min(WORLD_SIZE, worldPos.y))
      
      setCurrentPath([worldPos])
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && e.buttons === 1) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      
      // Pan in screen space
      setCamera({
        x: camera.x - dx / scale,
        y: camera.y - dy / scale
      })
      
      setLastMousePos({ x: e.clientX, y: e.clientY })
    } else if (isDrawing) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const worldPos = screenToWorld(x, y)
      
      // Clamp to world bounds
      worldPos.x = Math.max(0, Math.min(WORLD_SIZE, worldPos.x))
      worldPos.y = Math.max(0, Math.min(WORLD_SIZE, worldPos.y))
      
      setCurrentPath([...currentPath, worldPos])
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && currentPath.length > 0) {
      const newPath: Line = {
        points: [...currentPath],
        color: '#000000',
        width: 2,
        id: `path-${Date.now()}`
      }
      setPaths(prev => [...prev, newPath])
      onShapeAdd?.(newPath)
    }
    setIsDrawing(false)
    setCurrentPath([])
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = e.shiftKey || activeTool === 'pan' ? 'grab' : 'crosshair'
    }
  }

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.repeat) {
        setIsPanning(true)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grab'
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) {
        setIsPanning(false)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
        }
      }
    }

    const handleBlur = () => {
      setIsPanning(false)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [activeTool])

  // Wheel handler
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) return
    
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Get world position before zoom
    const worldPos = screenToWorld(x, y)
    
    // Calculate new scale
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(10, scale * scaleFactor))
    
    // Update scale
    setScale(newScale)
    
    // Adjust camera to zoom towards mouse position
    const newScreenPos = {
      x: (worldPos.x - camera.x) * newScale + canvas.width / 2,
      y: (worldPos.y - camera.y) * newScale + canvas.height / 2
    }
    
    setCamera({
      x: camera.x + (x - newScreenPos.x) / newScale,
      y: camera.y + (y - newScreenPos.y) / newScale
    })
  }

  // Canvas setup and animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight - 64
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    // Animation loop for smooth rendering
    let animationId: number
    const animate = () => {
      draw()
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [draw])

  // Handle AI response card movement
  const handleCardMove = (id: string, x: number, y: number) => {
    setAIResponses(prev => prev.map(card => 
      card.id === id ? { ...card, position: { x, y } } : card
    ))
  }

  // Handle AI response card removal
  const handleCardRemove = (id: string) => {
    setAIResponses(prev => prev.filter(card => card.id !== id))
  }

  // Add AI response to canvas
  const addAIResponse = (data: any) => {
    const id = crypto.randomUUID()
    const response: AIResponse = {
      id,
      content: data.content,
      prompt: data.prompt,
      provider: data.provider,
      executedBy: data.executedBy,
      position: data.position === 'auto' 
        ? { x: camera.x + 100, y: camera.y + 100 }
        : data.position
    }
    
    setAIResponses(prev => [...prev, response])
    onAIResponseAdd?.(response)
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* AI Response Cards */}
      {aiResponses.map(response => (
        <AIResponseCard
          key={response.id}
          {...response}
          onMove={handleCardMove}
          onRemove={handleCardRemove}
        />
      ))}
    </div>
  )
})

InfiniteCanvas.displayName = 'InfiniteCanvas'

export default InfiniteCanvas 