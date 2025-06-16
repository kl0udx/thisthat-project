'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { RoomHeader } from '@/components/room/room-header'
import InfiniteCanvas, { type InfiniteCanvasRef } from '@/components/room/infinite-canvas'
import { CanvasToolbar } from '@/components/room/canvas-toolbar'
import { ConnectionStatus } from '@/components/room/connection-status'
import { ShareModal } from '@/components/room/share-modal'
import { ChatPanel } from '@/components/room/chat-panel'
import { AIProviderModal } from '@/components/room/ai-provider-modal'
import { NicknameModal } from '@/components/room/nickname-modal'
import { useP2PConnection } from '@/hooks/useP2PConnection'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { generateNickname, getAvatarColor } from '@/lib/utils'
import { useRouter } from "next/navigation"
import { P2PConnection } from "@/lib/webrtc"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from 'sonner'
import { useConnection } from "@/hooks/use-connection"
import { useBroadcast } from "@/hooks/use-broadcast"
import { useSendTo } from "@/hooks/use-send-to"
import { useProviders } from "@/hooks/use-providers"
import { useCanvasAdd } from "@/hooks/use-canvas-add"
import { useTool } from "@/hooks/use-tool"
import { useSelection } from "@/hooks/use-selection"
import { useClearCanvas } from "@/hooks/use-clear-canvas"
import { useDeleteSelection } from "@/hooks/use-delete-selection"
import { useShapeAdd } from "@/hooks/use-shape-add"
import { useShapeDelete } from "@/hooks/use-shape-delete"
import { AIResponseCard } from '@/components/room/ai-response-card'

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()
  
  // All useState hooks at the top level
  const [mounted, setMounted] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [showNicknameModal, setShowNicknameModal] = useState(true)
  const [suggestedNickname] = useState(() => generateNickname())
  const [userId, setUserId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [providers, setProviders] = useState<Map<string, { userId: string; nickname: string; type: string }>>(new Map())
  const [localProviders, setLocalProviders] = useState<Set<string>>(new Set())
  const [canvasObjects, setCanvasObjects] = useState<any[]>([])
  const [activeTool, setActiveTool] = useState('pen')
  const [hasSelection, setHasSelection] = useState(false)
  const canvasRef = useRef<InfiniteCanvasRef>(null)
  
  // Always call useP2PConnection, but pass null when we shouldn't connect
  const { isConnected, peers, connectionState, broadcast, sendTo, connection } = useP2PConnection(
    mounted && nickname && !showNicknameModal ? code : null,
    userId,
    nickname
  )

  // First useEffect - mounting and nickname persistence
  useEffect(() => {
    setMounted(true)
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nickname')
      if (saved) {
        setNickname(saved)
        setShowNicknameModal(false)
      }
    }
  }, [])

  // Second useEffect - connection message handling
  useEffect(() => {
    if (!connection) return

    const unsubscribe = connection.onMessage((data: any) => {
      switch (data.type) {
        case 'canvas-add':
          console.log('Received shape from peer:', data.shape)
          break
          
        case 'chat-message':
          console.log('Received message:', data.message)
          break
          
        case 'provider-added':
          setProviders(prev => new Map(prev).set(data.provider, {
            userId: data.userId,
            nickname: data.nickname,
            type: data.provider
          }))
          break
          
        case 'canvas-object-add':
          setCanvasObjects(prev => [...prev, data.object])
          break
          
        case 'canvas-object-move':
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === data.objectId 
              ? { ...obj, position: data.position } 
              : obj
          ))
          break
          
        case 'canvas-object-remove':
          setCanvasObjects(prev => prev.filter(obj => obj.id !== data.objectId))
          break
      }
    })

    return unsubscribe
  }, [connection])

  // Add this effect to handle provider messages
  useEffect(() => {
    if (!connection) return

    const unsubscribe = connection.onMessage((message: any) => {
      if (message.type === 'provider-added') {
        setProviders(prev => new Map(prev).set(message.provider, {
          userId: message.userId,
          nickname: message.nickname,
          type: message.provider
        }))
      } else if (message.type === 'provider-removed') {
        setProviders(prev => {
          const next = new Map(prev)
          next.delete(message.provider)
          return next
        })
      }
    })

    return unsubscribe
  }, [connection])

  // Add this effect to handle disconnection
  useEffect(() => {
    if (!connection) return

    const unsubscribe = connection.onMessage((message: any) => {
      if (message.type === 'peer-disconnected') {
        // Remove all providers from the disconnected peer
        setProviders(prev => {
          const next = new Map(prev)
          for (const [provider, info] of next.entries()) {
            if (info.userId === message.userId) {
              next.delete(provider)
            }
          }
          return next
        })
      }
    })

    return unsubscribe
  }, [connection])

  // Add this effect to load local providers on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load local providers from localStorage
    const storedProviders = localStorage.getItem('local_providers')
    if (storedProviders) {
      setLocalProviders(new Set(JSON.parse(storedProviders)))
    }
  }, [])

  // Add this effect to save local providers when they change
  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('local_providers', JSON.stringify(Array.from(localProviders)))
  }, [localProviders])

  // Add this effect to set userId on mount, using localStorage only on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('userId')
      if (!stored) {
        stored = crypto.randomUUID()
        localStorage.setItem('userId', stored)
      }
      setUserId(stored)
    }
  }, [])

  // Handler functions
  const handleSetNickname = (newNickname: string) => {
    setNickname(newNickname)
    localStorage.setItem('nickname', newNickname)
    toast.success('Nickname set!')
  }

  const handleShapeAdd = useCallback((shape: any) => {
    broadcast({
      type: 'canvas-add',
      shape: shape
    })
  }, [broadcast])

  const findOptimalPosition = useCallback(() => {
    const baseX = 500 + (canvasObjects.length % 3) * 470
    const baseY = 200 + Math.floor(canvasObjects.length / 3) * 350
    return { x: baseX, y: baseY }
  }, [canvasObjects.length])

  const handleCanvasAdd = useCallback((data: any) => {
    const newObject = {
      id: crypto.randomUUID(),
      type: data.type,
      content: data.content,
      prompt: data.prompt,
      provider: data.provider,
      executedBy: data.executedBy,
      position: findOptimalPosition(),
      timestamp: Date.now()
    }
    
    setCanvasObjects(prev => [...prev, newObject])
    
    broadcast({
      type: 'canvas-object-add',
      object: newObject
    })
  }, [broadcast, findOptimalPosition])

  const handleObjectMove = useCallback((id: string, x: number, y: number) => {
    setCanvasObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, position: { x, y } } : obj
    ))
    
    broadcast({
      type: 'canvas-object-move',
      objectId: id,
      position: { x, y }
    })
  }, [broadcast])

  const handleObjectRemove = useCallback((id: string) => {
    setCanvasObjects(prev => prev.filter(obj => obj.id !== id))
    
    broadcast({
      type: 'canvas-object-remove',
      objectId: id
    })
  }, [broadcast])

  // Add this handler function
  const handleShapeDelete = useCallback((shapeId: string) => {
    // Broadcast deletion to peers
    broadcast({
      type: 'canvas-object-remove',
      objectId: shapeId
    })
  }, [broadcast])

  // Add handlers
  const handleToolChange = (tool: string) => {
    setActiveTool(tool)
  }

  const handleClearCanvas = useCallback(() => {
    if (window.canvasTools) {
      window.canvasTools.clearCanvas()
    }
    // Broadcast clear event
    broadcast({ type: 'canvas-clear' })
  }, [broadcast])

  const handleDeleteSelection = useCallback(() => {
    if (window.canvasTools) {
      window.canvasTools.deleteSelectedShapes()
    }
  }, [])

  const handleAddProvider = useCallback((provider: string, apiKey: string) => {
    console.log('handleAddProvider called with:', provider)
    setLocalProviders(prev => {
      const newSet = new Set(prev).add(provider)
      console.log('Updating localProviders from:', prev, 'to:', newSet)
      return newSet
    })
    console.log('Storing API key for:', provider)
    localStorage.setItem(`api_key_${provider}`, apiKey)
    broadcast({
      type: 'provider-added',
      provider,
      userId,
      nickname,
      capabilities: ['chat', 'code', 'analysis']
    })
    setProviders(prev => new Map(prev).set(provider, {
      userId,
      nickname,
      type: provider
    }))
    toast.success('Provider added!')
  }, [broadcast, userId, nickname])

  const handleRemoveProvider = useCallback((provider: string) => {
    setLocalProviders(prev => {
      const next = new Set(prev)
      next.delete(provider)
      return next
    })
    localStorage.removeItem(`api_key_${provider}`)
    broadcast({
      type: 'provider-removed',
      provider,
      userId
    })
    setProviders(prev => {
      const next = new Map(prev)
      next.delete(provider)
      return next
    })
    toast.success('Provider removed!')
  }, [broadcast, userId])

  // Prepare peer data
  const allUsers = [
    { 
      userId, 
      nickname: nickname || 'You', 
      isHost: true,
      avatarColor: getAvatarColor(nickname || 'You')
    },
    ...peers.map(peer => ({
      ...peer,
      isHost: false,
      avatarColor: getAvatarColor(peer.nickname)
    }))
  ]

  // Render loading state
  if (!mounted) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Nickname Modal */}
      <Dialog open={showNicknameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Nickname</DialogTitle>
            <DialogDescription>
              Choose a nickname to display to other users in the room.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSetNickname(nickname || suggestedNickname); }}>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full">
                Join Room
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Room UI */}
      {!showNicknameModal && (
        <>
          <RoomHeader
            roomCode={code}
            currentUserId={userId}
            peers={allUsers}
            isHost={true}
          />
          
          {/* Canvas container - flex-1 makes it fill remaining height */}
          <div className="flex-1 relative overflow-hidden">
            <InfiniteCanvas
              ref={canvasRef}
              onShapeAdd={(shape) => {
                // Broadcast shape to peers
                broadcast({
                  type: 'canvas-object-add',
                  object: shape
                })
              }}
              onShapeDelete={(ids) => {
                broadcast({ type: 'shapes-delete', shapeIds: ids })
              }}
              onClear={() => {
                broadcast({ type: 'canvas-clear' })
              }}
              activeTool={activeTool}
            />
            
            {/* Canvas toolbar - positioned over canvas */}
            <CanvasToolbar 
              activeTool={activeTool}
              onToolChange={handleToolChange}
              onClearCanvas={handleClearCanvas}
              hasSelection={hasSelection}
              onDeleteSelection={handleDeleteSelection}
              onOpenAIProviders={() => setShowProviderModal(true)}
              activeProviders={providers.size}
            />
            
            {/* AI Response Cards Layer */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full">
                {canvasObjects.map(obj => (
                  obj.type === 'ai-response' && (
                    <div key={obj.id} className="pointer-events-auto">
                      <AIResponseCard
                        {...obj}
                      />
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="fixed bottom-4 right-4 z-50">
            <ConnectionStatus
              state={connectionState}
              peerCount={allUsers.length}
            />
          </div>

          {/* Chat Panel */}
          <ChatPanel
            userId={userId}
            nickname={nickname}
            connection={connection}
            broadcast={broadcast}
            sendTo={sendTo}
            providers={providers}
            localProviders={localProviders}
            onCanvasAdd={handleCanvasAdd}
          />

          {/* Share Modal */}
          <ShareModal
            roomCode={code}
            open={showShareModal}
            onOpenChange={setShowShareModal}
          />

          {/* AI Provider Modal */}
          {showProviderModal && (
            <AIProviderModal
              isOpen={showProviderModal}
              onClose={() => setShowProviderModal(false)}
              onProviderAdded={(provider, apiKey) => {
                handleAddProvider(provider, apiKey)
              }}
              onProviderRemoved={(provider) => {
                handleRemoveProvider(provider)
              }}
              existingProviders={new Set([
                ...Array.from(localProviders || []), 
                ...Array.from(providers?.keys() || [])
              ])}
            />
          )}
        </>
      )}
    </div>
  )
} 