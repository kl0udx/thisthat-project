'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateNickname } from '@/lib/utils'

export default function JoinRoom() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')

  const handleJoinRoom = () => {
    if (!roomCode) return
    
    // Generate and store avatar name if not already set
    if (typeof window !== 'undefined') {
      const existingNickname = localStorage.getItem('nickname')
      if (!existingNickname) {
        const avatarName = generateNickname()
        localStorage.setItem('nickname', avatarName)
      }
    }
    
    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Join a Room</h1>
          <p className="text-lg text-muted-foreground">
            Enter the room code to start collaborating
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              placeholder="Enter 8-character room code"
              value={roomCode || ''}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center tracking-widest text-lg"
            />
          </div>
          <Button
            className="w-full h-16 text-lg"
            onClick={handleJoinRoom}
            disabled={roomCode.length !== 8}
            size="lg"
          >
            Join Room
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          You&apos;ll get a fun avatar name automatically!
        </p>
      </div>
    </main>
  )
} 