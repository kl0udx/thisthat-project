'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function JoinRoom() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')

  const handleJoinRoom = () => {
    if (!roomCode) return
    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">Join a Room</h1>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              placeholder="Enter 8-character room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center tracking-widest text-lg"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleJoinRoom}
            disabled={roomCode.length !== 8}
          >
            Join Room
          </Button>
        </div>
      </div>
    </main>
  )
} 