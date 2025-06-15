import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  state: 'connecting' | 'connected' | 'disconnected'
  peerCount: number
}

export function ConnectionStatus({ state, peerCount }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          state === 'connected' && 'bg-green-500',
          state === 'connecting' && 'bg-yellow-500',
          state === 'disconnected' && 'bg-red-500'
        )}
      />
      <span className="text-sm text-muted-foreground">
        {state === 'connecting' && 'Connecting...'}
        {state === 'connected' && `Connected (${peerCount + 1})`}
        {state === 'disconnected' && 'Disconnected'}
      </span>
    </div>
  )
} 