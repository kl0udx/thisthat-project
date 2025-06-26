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
  clearCanvas: () => void
  deleteSelectedShapes: () => void
  addAIResponse: (response: AIResponse) => void
  hasSelection: boolean
}

interface InfiniteCanvasProps {
  onShapeAdd?: (shape: any) => void
  onAIResponseAdd?: (response: any) => void
  onShapeDelete?: (ids: string[]) => void
  onClear?: () => void
  activeTool?: 'pen' | 'select' | 'eraser'
  isReadOnly?: boolean
}

const InfiniteCanvas = forwardRef<InfiniteCanvasRef, InfiniteCanvasProps>(({ 
  onShapeAdd, 
  onAIResponseAdd,
  onShapeDelete,
  onClear,
  activeTool = 'pen',
  isReadOnly
}, ref) => {
  // Removed for production: console.log('Active tool:', activeTool)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedShapes, setSelectedShapes] = useState<Set<string>>(new Set())
  const [isDrawing, setIsDrawing] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<Line[]>([])
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null)
  const [camera, setCamera] = useState({ x: 12500, y: 12500 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 })
  const [aiResponses, setAIResponses] = useState<AIResponse[]>([])
  const [selectedShape, setSelectedShape] = useState<string | null>(null)

  // Canvas dimensions
  const WORLD_SIZE = 25000
  const GRID_SIZE = 100

  // Memoize the clearCanvas function
  const clearCanvas = useCallback(() => {
    setPaths([])
    setAIResponses([])
    onClear?.()
  }, [onClear])

  // Memoize the deleteSelectedShapes function
  const deleteSelectedShapes = useCallback(() => {
    if (selectedShapes.size > 0) {
      const selectedIds = Array.from(selectedShapes)
      setPaths(prev => prev.filter(path => !selectedIds.includes(path.id)))
      onShapeDelete?.(selectedIds)
      setSelectedShapes(new Set())
    }
  }, [selectedShapes, onShapeDelete])

  // Memoize the addAIResponse function
  const addAIResponse = useCallback((response: AIResponse) => {
    setAIResponses(prev => [...prev, response])
    onAIResponseAdd?.(response)
  }, [onAIResponseAdd])

  // Update useImperativeHandle with memoized functions
  useImperativeHandle(ref, () => ({
    clearCanvas,
    deleteSelectedShapes,
    addAIResponse,
    hasSelection: selectedShapes.size > 0
  }), [clearCanvas, deleteSelectedShapes, addAIResponse, selectedShapes])

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

  // Helper to convert React event to native event
  const getNativeEvent = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): MouseEvent => {
    return e instanceof MouseEvent ? e : e.nativeEvent
  }

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): Point => {
    const nativeEvent = getNativeEvent(e)
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: nativeEvent.clientX - rect.left,
      y: nativeEvent.clientY - rect.top
    }
  }

  // Get current mouse position
  const getCurrentMousePos = () => currentMousePos

  // Handle keyboard shortcuts
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
        setIsDrawing(false) // Also stop drawing
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'crosshair'
        }
      }
    }

    const handleBlur = () => {
      setIsPanning(false)
      setIsDrawing(false)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair'
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
  }, [])

  // Select all shapes
  const selectAll = () => {
    const allIds = new Set(paths.map(p => p.id))
    setSelectedShapes(allIds)
  }

  // Helper to find shape at point
  const findShapeAtPoint = (x: number, y: number) => {
    // Simple hit detection - check if click is near any path
    for (const path of paths) {
      for (let i = 0; i < path.points.length; i++) {
        const px = path.points[i].x
        const py = path.points[i].y
        const distance = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2))
        if (distance < 10) {
          return path
        }
      }
    }
    return null
  }

  // Handle eraser functionality
  const handleEraser = useCallback((worldX: number, worldY: number) => {
    const eraserRadius = 20 / scale // Eraser size adjusts with zoom
    
    setPaths(prev => prev.filter(path => {
      // Check if any point in the path is within eraser radius
      return !path.points.some(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - worldX, 2) + 
          Math.pow(point.y - worldY, 2)
        )
        return distance < eraserRadius
      })
    }))
  }, [scale])

  // Update mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    // Check if canvas is read-only
    if (isReadOnly) {
      return
    }

    const nativeEvent = getNativeEvent(e)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = nativeEvent.clientX - rect.left
    const y = nativeEvent.clientY - rect.top
    
    if (nativeEvent.shiftKey || isPanning) {
      // Start panning
      setLastMousePos({ x: nativeEvent.clientX, y: nativeEvent.clientY })
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
    } else if (nativeEvent.button === 0) {
      // Left click
      if (activeTool === 'eraser' && !nativeEvent.shiftKey && !isPanning) {
        // Removed for production: console.log('Starting eraser')
        setIsErasing(true)
        const worldPos = screenToWorld(x, y)
        handleEraser(worldPos.x, worldPos.y)
      } else if (activeTool === 'select') {
        // Handle selection
        const worldPos = screenToWorld(x, y)
        const clickedShape = findShapeAtPoint(worldPos.x, worldPos.y)
        if (clickedShape) {
          setSelectedShapes(new Set([clickedShape.id]))
        } else {
          setSelectedShapes(new Set())
        }
      } else if (activeTool === 'pen') {
        // Start drawing
        setIsDrawing(true)
        const worldPos = screenToWorld(x, y)
        setCurrentPath([worldPos])
      }
    }
  }, [isPanning, screenToWorld, activeTool, handleEraser, isReadOnly])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const nativeEvent = getNativeEvent(e)
    if ((nativeEvent.shiftKey || isPanning) && nativeEvent.buttons === 1) {
      // Panning
      const dx = nativeEvent.clientX - lastMousePos.x
      const dy = nativeEvent.clientY - lastMousePos.y
      setCamera({
        x: camera.x - dx / scale,
        y: camera.y - dy / scale
      })
      setLastMousePos({ x: nativeEvent.clientX, y: nativeEvent.clientY })
    } else if (isErasing && activeTool === 'eraser') {
      // Removed for production: console.log('Erasing...')
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = nativeEvent.clientX - rect.left
      const y = nativeEvent.clientY - rect.top
      const worldPos = screenToWorld(x, y)
      handleEraser(worldPos.x, worldPos.y)
    } else if (isDrawing && nativeEvent.buttons === 1) {
      // Drawing
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = nativeEvent.clientX - rect.left
      const y = nativeEvent.clientY - rect.top
      const worldPos = screenToWorld(x, y)
      setCurrentPath([...currentPath, worldPos])
    }
  }, [isPanning, isDrawing, isErasing, lastMousePos, camera, scale, currentPath, screenToWorld, activeTool, handleEraser])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (isErasing) {
      setIsErasing(false)
    } else if (isDrawing && currentPath.length > 1) {
      const newLine: Line = {
        points: currentPath,
        color: '#000000',
        width: 2,
        id: `line-${Date.now()}`
      }
      setPaths([...paths, newLine])
      onShapeAdd?.(newLine)
    }
    setIsDrawing(false)
    setCurrentPath([])
  }, [isErasing, isDrawing, currentPath, paths, onShapeAdd])

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context state
    ctx.save()

    // Apply camera transform
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(scale, scale)
    ctx.translate(-camera.x, -camera.y)

    // Draw grid
    drawGrid(ctx)

    // Draw paths
    paths.forEach(path => {
      drawPath(ctx, path)
    })

    // Draw current path
    if (currentPath.length > 0) {
      // Create a temporary path for drawing
      const tempPath: Line = {
        points: currentPath,
        color: '#000000',
        width: 2,
        id: 'temp' // Temporary ID for drawing
      }
      drawPath(ctx, tempPath)
    }

    // Restore context state
    ctx.restore()

    // Draw help text
    ctx.fillStyle = '#666'
    ctx.font = '12px monospace'
    ctx.fillText(
      `Position: ${Math.round(camera.x)}, ${Math.round(camera.y)} | Zoom: ${Math.round(scale * 100)}% | Canvas: 25,000×25,000px | Shift+Wheel: Zoom, Shift+Drag: Pan`, 
      10, 
      canvas.height - 10
    )

    // Draw read-only overlay
    if (isReadOnly) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#666'
      ctx.font = '16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(
        'READ-ONLY MODE - Time has expired. Add time to continue!',
        canvas.width / 2,
        canvas.height / 2
      )
      ctx.textAlign = 'left'
    }
  }, [camera, scale, paths, currentPath, isReadOnly])

  // Set up canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      // Removed for production: console.log('Setting up canvas')
      console.warn('Canvas ref is null during setup')
      return
    }

    // Initial resize
    const handleResize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Set cursor based on read-only state
    if (isReadOnly) {
      canvas.style.cursor = 'not-allowed'
    } else {
      canvas.style.cursor = 'crosshair'
    }

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      draw()
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    // Removed for production: console.log('Canvas setup complete')

    return () => {
      // Removed for production: console.log('Cleaning up canvas')
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
      cancelAnimationFrame(animationFrameId)
    }
  }, [draw, handleMouseDown, handleMouseMove, handleMouseUp])

  // Update cursor based on tool
  useEffect(() => {
    if (canvasRef.current) {
      if (activeTool === 'eraser') {
        canvasRef.current.style.cursor = 'crosshair'
      } else if (isPanning) {
        canvasRef.current.style.cursor = 'grab'
      } else {
        canvasRef.current.style.cursor = 'crosshair'
      }
    }
  }, [activeTool, isPanning])

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

  // Add helper functions for drawing
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    const gridSize = 20

    // Draw vertical lines
    for (let x = 0; x < WORLD_SIZE; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, WORLD_SIZE)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y < WORLD_SIZE; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(WORLD_SIZE, y)
      ctx.stroke()
    }
  }

  const drawPath = (ctx: CanvasRenderingContext2D, path: Line) => {
    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }
    ctx.stroke()
  }

  // Update the wheel event handler to use React.WheelEvent
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // Only zoom if Shift is pressed
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
  }, [camera, scale, screenToWorld])

  // Add ResizeObserver setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    // Initial resize
    handleResize()

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Update handleResize function
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    // Use the container's dimensions
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    
    // Removed for production: console.log('Canvas resized to:', canvas.width, 'x', canvas.height)
  }, [])

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: activeTool === 'eraser' ? 'crosshair' : 
                  isPanning ? 'grab' : 
                  'crosshair'
        }}
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