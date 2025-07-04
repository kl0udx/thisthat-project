import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { RoomTimer } from '@/components/room/room-timer'

interface RoomHeaderProps {
  roomCode: string
  peers: Array<{
    userId: string
    nickname: string
    isHost: boolean
    avatarColor: string
  }>
  currentUserId: string
  isHost: boolean
  onShare?: () => void
  onTimer?: () => void
  timeRemaining?: number
  isTimerStarted?: boolean
}

export function RoomHeader({
  roomCode,
  peers,
  currentUserId,
  isHost,
  onShare,
  onTimer,
  timeRemaining = 0,
  isTimerStarted = false
}: RoomHeaderProps) {
  // Removed for production: console.log('Peers in RoomHeader:', JSON.stringify(peers, null, 2))
  return (
    <div className="h-16 border-b bg-white px-6 flex items-center justify-between">
      {/* Left side - avatars */}
      <div className="flex -space-x-2">
        {peers.map((peer, index) => {
          // Add safety check for nickname and avatarColor
          const nickname = peer.nickname || 'Anonymous User'
          const avatarColor = peer.avatarColor || '#9CA3AF'
          return (
            <Avatar key={`${peer.userId}-${index}`} className="h-8 w-8 border-2 border-white">
              <AvatarFallback 
                className="text-xs font-medium text-white"
                style={{ backgroundColor: avatarColor }}
              >
                {nickname
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )
        })}
      </div>
      
      {/* Center - timer */}
      <div className="flex-1 flex justify-center">
        <RoomTimer
          timeRemaining={timeRemaining}
          isTimerStarted={isTimerStarted}
          userCount={peers.length}
          onClick={onTimer || (() => {})}
        />
      </div>
      
      {/* Right side - buttons */}
      <div className="flex gap-2">
        <Button onClick={onShare} variant="outline" size="sm" className="border-2 border-[#de2c97]">
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://tally.so/r/wa199q', '_blank')}
          className="gap-2 border-2 border-[#de2c97]"
        >
          <MessageCircle className="h-4 w-4" />
          Feedback
        </Button>
      </div>
    </div>
  )
} 