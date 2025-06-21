import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

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
}

export function RoomHeader({
  roomCode,
  peers,
  currentUserId,
  isHost,
  onShare
}: RoomHeaderProps) {
  console.log('Peers in RoomHeader:', JSON.stringify(peers, null, 2))
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
      
      {/* Right side - share button */}
      <Button onClick={onShare} variant="outline" size="sm">
        Share
      </Button>
    </div>
  )
} 