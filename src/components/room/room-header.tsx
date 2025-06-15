import { Crown, Share2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getInitials, getAvatarColor } from "@/lib/utils"
import { Peer } from "@/lib/webrtc"
import { ShareModal } from "./share-modal"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RoomHeaderProps {
  roomCode: string
  peers: Peer[]
  currentUserId: string
  isHost: boolean
}

export function RoomHeader({ roomCode, peers, currentUserId, isHost }: RoomHeaderProps) {
  const [showShareModal, setShowShareModal] = useState(false)

  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center -space-x-2">
          {peers.map((peer) => (
            <TooltipProvider key={peer.userId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar
                      className={peer.userId === currentUserId ? "ring-2 ring-primary" : ""}
                      style={{ backgroundColor: peer.avatarColor }}
                    >
                      <AvatarFallback className="text-sm font-medium text-white">
                        {getInitials(peer.nickname)}
                      </AvatarFallback>
                    </Avatar>
                    {peer.isHost && (
                      <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {peer.userId === currentUserId ? "You" : peer.nickname}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowShareModal(true)}
        >
          <Share2 className="h-5 w-5" />
        </Button>

        <ShareModal
          roomCode={roomCode}
          open={showShareModal}
          onOpenChange={setShowShareModal}
        />
      </div>
    </div>
  )
} 