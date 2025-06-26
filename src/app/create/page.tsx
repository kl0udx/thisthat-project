'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateRoomCode, generateNickname } from '@/lib/utils'

export default function CreateRoom() {
  const router = useRouter()

  const handleCreateRoom = () => {
    // Generate room code
    const roomCode = generateRoomCode()
    
    // Generate and store avatar name if not already set
    if (typeof window !== 'undefined') {
      const existingNickname = localStorage.getItem('nickname')
      if (!existingNickname) {
        const avatarName = generateNickname()
        localStorage.setItem('nickname', avatarName)
      }
    }
    
    // Navigate to room
    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Create A Room</h1>
          <p className="text-lg text-[#2d63d8]">
            Start collaborating with AI in real-time
          </p>
        </div>
        
        <Button 
          className="w-full h-16 text-lg bg-[#323783] hover:bg-[#252d5f] text-white" 
          onClick={handleCreateRoom}
          size="lg"
        >
          Create Room
        </Button>
      </div>
    </main>
  )
} 