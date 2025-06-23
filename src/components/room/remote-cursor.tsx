interface RemoteCursorProps {
  x: number
  y: number
  nickname: string
  color: string
}

export function RemoteCursor({ x, y, nickname, color }: RemoteCursorProps) {
  return (
    <div
      className="absolute pointer-events-none z-[200] transition-transform duration-100 ease-out"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        style={{ marginLeft: '-2px', marginTop: '-2px' }}
      >
        <path
          d="M0 0L0 16L4.5 12.5L7 18L9 17L6.5 11.5L12 11.5L0 0Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-1 rounded text-xs text-white whitespace-nowrap select-none"
        style={{ backgroundColor: color }}
      >
        {nickname}
      </div>
    </div>
  )
} 