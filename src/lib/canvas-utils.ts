export interface Point {
  x: number
  y: number
}

export interface Line {
  points: Point[]
  color: string
  width: number
  id: string
}

export interface CanvasState {
  scale: number
  panOffset: Point
  isPanning: boolean
  lastPanPoint: Point
}

export interface DrawingState {
  isDrawing: boolean
  currentPath: Point[]
  paths: Line[]
  lastPoint: Point | null
}

export const CANVAS_SIZE = 25000
export const GRID_SIZE = 100

export function getMousePos(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  scale: number,
  panOffset: Point
): Point {
  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.left - canvas.width / 2) / scale + canvas.width / 2 - panOffset.x
  const y = (e.clientY - rect.top - canvas.height / 2) / scale + canvas.height / 2 - panOffset.y
  
  // Clamp to canvas bounds
  return {
    x: Math.max(0, Math.min(CANVAS_SIZE, x / scale)),
    y: Math.max(0, Math.min(CANVAS_SIZE, y / scale))
  }
}

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  scale: number,
  panOffset: Point,
  canvas: HTMLCanvasElement
) => {
  const gridSize = GRID_SIZE * scale
  const width = canvas.width
  const height = canvas.height

  // Calculate the visible area in canvas coordinates
  const visibleLeft = -panOffset.x
  const visibleTop = -panOffset.y
  const visibleRight = visibleLeft + width / scale
  const visibleBottom = visibleTop + height / scale

  // Calculate grid line positions
  const startX = Math.floor(visibleLeft / gridSize) * gridSize
  const startY = Math.floor(visibleTop / gridSize) * gridSize
  const endX = Math.ceil(visibleRight / gridSize) * gridSize
  const endY = Math.ceil(visibleBottom / gridSize) * gridSize

  // Draw vertical lines
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.lineWidth = 1 / scale // Scale line width to maintain visibility
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, visibleTop)
    ctx.lineTo(x, visibleBottom)
  }

  // Draw horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(visibleLeft, y)
    ctx.lineTo(visibleRight, y)
  }
  ctx.stroke()

  // Draw coordinate numbers
  ctx.font = `${12 / scale}px monospace`
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // Draw X coordinates
  for (let x = startX; x <= endX; x += gridSize) {
    if (x % (gridSize * 5) === 0) { // Show numbers every 5 grid lines
      ctx.fillText(x.toString(), x + 2 / scale, visibleTop + 2 / scale)
    }
  }

  // Draw Y coordinates
  for (let y = startY; y <= endY; y += gridSize) {
    if (y % (gridSize * 5) === 0) { // Show numbers every 5 grid lines
      ctx.fillText(y.toString(), visibleLeft + 2 / scale, y + 2 / scale)
    }
  }
}

export function drawPaths(
  ctx: CanvasRenderingContext2D,
  paths: Line[],
  currentPath: Point[],
  scale: number
): void {
  // Draw all paths
  paths.forEach(path => {
    if (path.points.length < 2) return
    
    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width / scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)
    
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }
    
    ctx.stroke()
  })
  
  // Draw current path
  if (currentPath.length > 0) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2 / scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(currentPath[0].x, currentPath[0].y)
    
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y)
    }
    
    ctx.stroke()
  }
}

export const drawPositionIndicator = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scale: number,
  panOffset: Point,
  isPanning: boolean
) => {
  const centerX = Math.round(-panOffset.x)
  const centerY = Math.round(-panOffset.y)

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  
  // Draw pan mode overlay if active
  if (isPanning) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)' // Light blue overlay
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = '#3b82f6'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('Pan Mode (Shift+Drag)', canvas.width / 2 - 60, 30)
  }
  
  // Draw position indicator
  ctx.font = '12px monospace'
  ctx.fillStyle = '#666'
  ctx.fillText(
    `Position: ${centerX}, ${centerY} | Zoom: ${Math.round(scale * 100)}% | Canvas: 25,000 × 25,000px | Shift+Wheel: Zoom, Shift+Drag: Pan`,
    10,
    canvas.height - 10
  )
  ctx.restore()
}

export function createGridPattern(ctx: CanvasRenderingContext2D, size: number = 20, color: string = '#e0e0e0'): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5

  for (let i = 0; i < ctx.canvas.width; i += size) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, ctx.canvas.height)
    ctx.stroke()
  }

  for (let i = 0; i < ctx.canvas.height; i += size) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(ctx.canvas.width, i)
    ctx.stroke()
  }
}

export function handleWheel(
  e: WheelEvent,
  canvasState: CanvasState,
  setCanvasState: (state: CanvasState) => void
): void {
  e.preventDefault()
  const delta = e.deltaY
  const scale = canvasState.scale * (delta > 0 ? 0.9 : 1.1)
  setCanvasState({ ...canvasState, scale })
}

export function handleDragStart(
  e: MouseEvent,
  canvasState: CanvasState,
  setCanvasState: (state: CanvasState) => void
): void {
  setCanvasState({
    ...canvasState,
    isDragging: true,
    lastX: e.clientX,
    lastY: e.clientY
  })
}

export function handleDragMove(
  e: MouseEvent,
  canvasState: CanvasState,
  setCanvasState: (state: CanvasState) => void
): void {
  if (!canvasState.isDragging) return

  const dx = e.clientX - canvasState.lastX
  const dy = e.clientY - canvasState.lastY

  setCanvasState({
    ...canvasState,
    offsetX: canvasState.offsetX + dx,
    offsetY: canvasState.offsetY + dy,
    lastX: e.clientX,
    lastY: e.clientY
  })
}

export function handleDragEnd(
  canvasState: CanvasState,
  setCanvasState: (state: CanvasState) => void
): void {
  setCanvasState({ ...canvasState, isDragging: false })
}

export function handleMouseDown(
  e: MouseEvent,
  drawingState: DrawingState,
  setDrawingState: (state: DrawingState) => void,
  canvasState: CanvasState
): void {
  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
  const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale
  const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale

  setDrawingState({
    isDrawing: true,
    lastX: x,
    lastY: y,
    currentPath: [x, y]
  })
}

export function handleMouseMove(
  e: MouseEvent,
  drawingState: DrawingState,
  setDrawingState: (state: DrawingState) => void,
  canvasState: CanvasState,
  ctx: CanvasRenderingContext2D
): void {
  if (!drawingState.isDrawing) return

  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
  const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale
  const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale

  ctx.beginPath()
  ctx.moveTo(drawingState.lastX, drawingState.lastY)
  ctx.lineTo(x, y)
  ctx.stroke()

  setDrawingState({
    ...drawingState,
    lastX: x,
    lastY: y,
    currentPath: [...drawingState.currentPath, x, y]
  })
}

export function handleMouseUp(
  drawingState: DrawingState,
  setDrawingState: (state: DrawingState) => void
): void {
  setDrawingState({ ...drawingState, isDrawing: false })
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  createGridPattern(ctx)
} 