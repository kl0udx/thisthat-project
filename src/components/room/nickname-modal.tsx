'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NicknameModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (nickname: string) => void
  suggestedNickname: string
}

export function NicknameModal({
  isOpen,
  onClose,
  onSubmit,
  suggestedNickname,
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
          <DialogTitle>Join Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Choose a Nickname</Label>
            <Input
              id="nickname"
              placeholder={suggestedNickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nickname.trim()) {
                  handleSubmit()
                }
              }}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!nickname.trim()}
          >
            Join Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 