import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface RoomHeaderProps {
  roomCode: string
  peers: { id: string; nickname: string; avatarColor: string }[]
  currentUserId: string
  isHost: boolean
  onShare: () => void
}

export function RoomHeader({
  roomCode,
  peers,
  currentUserId,
  isHost,
  onShare
}: RoomHeaderProps) {
  return (
    <div className="h-16 border-b bg-white px-6 flex items-center justify-between">
      {/* Left side - avatars */}
      <div className="flex -space-x-2">
        {peers.map((peer) => (
          <Avatar 
            key={peer.id} 
            className={cn(
              "h-8 w-8 border-2 border-white",
              peer.id === currentUserId && "ring-2 ring-primary"
            )}
          >
            <AvatarFallback 
              className="text-xs font-medium text-white"
              style={{ backgroundColor: peer.avatarColor }}
            >
              {peer.nickname
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      {/* Right side - share button */}
      <Button onClick={onShare} variant="outline" size="sm">
        Share
      </Button>
    </div>
  )
} 