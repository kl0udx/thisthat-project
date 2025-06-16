'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-react'

interface AIProviderButtonProps {
  providerCount: number
  onClick: () => void
}

export function AIProviderButton({ providerCount, onClick }: AIProviderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Bot className="h-5 w-5" />
      {providerCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
        >
          {providerCount}
        </Badge>
      )}
    </Button>
  )
} 