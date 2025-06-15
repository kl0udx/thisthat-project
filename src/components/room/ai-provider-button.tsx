'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface AIProviderButtonProps {
  providerCount: number
  onClick: () => void
}

export function AIProviderButton({ providerCount, onClick }: AIProviderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative"
    >
      <Sparkles className="h-5 w-5" />
      {providerCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
        >
          {providerCount}
        </Badge>
      )}
    </Button>
  )
} 