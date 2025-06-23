'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NicknameModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (nickname: string) => void
  suggestedNickname: string
  avatarColor?: string
}

export function NicknameModal({
  isOpen,
  onClose,
  onSubmit,
  suggestedNickname,
  avatarColor = '#9CA3AF'
}: NicknameModalProps) {
  const [nickname, setNickname] = useState('')

  const handleSubmit = () => {
    if (nickname.trim()) {
      onSubmit(nickname)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose your display name</DialogTitle>
          <DialogDescription>
            Enter any name you'd like to use in this room
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: avatarColor }}
            >
              {(nickname || suggestedNickname || 'A').charAt(0).toUpperCase()}
            </div>
            <Input
              placeholder={suggestedNickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nickname) {
                  handleSubmit()
                }
              }}
              autoFocus
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            You can use any name - your real name, username, or something fun!
          </p>
          <Button
            onClick={() => handleSubmit()}
            disabled={!nickname && !suggestedNickname}
            className="w-full"
          >
            Join Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 