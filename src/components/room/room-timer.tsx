import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle } from 'lucide-react'

interface RoomTimerProps {
  timeRemaining: number
  isTimerStarted: boolean
  userCount: number
  onClick: () => void
}

export function RoomTimer({ timeRemaining, isTimerStarted, userCount, onClick }: RoomTimerProps) {
  // Format time as H:MM:SS or MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  // Get color and content based on state
  const getTimerState = () => {
    // Waiting for others
    if (userCount < 2 || !isTimerStarted) {
      return {
        content: 'Waiting for others...',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: <Clock className="w-3 h-3 mr-1" />
      }
    }
    
    // Time's up
    if (timeRemaining <= 0) {
      return {
        content: 'Time\'s Up - Read Only',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <AlertCircle className="w-3 h-3 mr-1" />
      }
    }
    
    // Countdown timer with color based on time remaining
    let color = ''
    if (timeRemaining > 1800) {
      color = 'bg-green-100 text-green-700 border-green-200' // Green: 30+ min
    } else if (timeRemaining > 900) {
      color = 'bg-yellow-100 text-yellow-700 border-yellow-200' // Yellow: 15-30 min
    } else if (timeRemaining > 300) {
      color = 'bg-orange-100 text-orange-700 border-orange-200' // Orange: 5-15 min
    } else {
      color = 'bg-red-100 text-red-700 border-red-200 animate-pulse' // Red: < 5 min with pulse
    }
    
    return {
      content: formatTime(timeRemaining),
      color,
      icon: <Clock className="w-3 h-3 mr-1" />
    }
  }

  const timerState = getTimerState()

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 text-sm font-medium border rounded-md transition-all duration-200 hover:scale-105 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        timerState.color
      )}
    >
      {timerState.icon}
      {timerState.content}
    </button>
  )
} 