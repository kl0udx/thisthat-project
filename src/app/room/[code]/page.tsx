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
import { CanvasImage } from '@/components/room/canvas-image'
import type { ParsedCommand } from '@/lib/command-parser'
import { createRoomSession, getRoomSession, startRoomTimer } from '@/lib/supabase-rooms'

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  console.log('🚨 ROOM PAGE LOADED 🚨')
  
  const { code } = use(params)
  const router = useRouter()
  
  // Add these debug logs right after getting the params
  console.log('🔍 Debug - code:', code)
  console.log('🔍 Debug - params:', params)
  
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
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set())
  const canvasRef = useRef<InfiniteCanvasRef>(null)
  
  // Add debug log for userId after state declaration
  console.log('🔍 Debug - userId (initial):', userId)
  console.log('🔍 Debug - suggestedNickname:', suggestedNickname)
  console.log('🔍 Debug - current nickname:', nickname)
  
  // Always call useP2PConnection, but pass null when we shouldn't connect
  const { isConnected, peers, connectionState, broadcast, sendTo, connection } = useP2PConnection(
    mounted && nickname && !showNicknameModal ? code : null,
    userId,
    nickname || suggestedNickname // Use suggestedNickname as fallback
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
      console.log('🔍 Received message:', data)
      
      switch (data.type) {
        case 'user-joined':
          console.log('🔍 Received user-joined from:', data.userId, data.nickname)
          
          // If this is someone else joining, send our info back to them
          if (data.userId !== userId) {
            console.log('🔍 Sending my info back to new user')
            // Send our nickname to the specific new user
            sendTo(data.userId, {
              type: 'user-info',
              userId: userId,
              nickname: nickname || suggestedNickname,
              avatarColor: getAvatarColor(nickname || suggestedNickname)
            })
          }
          break
          
        case 'user-info':
          console.log('🔍 Received user-info:', data)
          // This will be handled by the enhanced peers in use-p2p-connection
          break
          
        case 'request-info':
          console.log('🔍 Received request-info from:', data.from)
          // Send our info back to the requesting peer
          sendTo(data.from, {
            type: 'user-info',
            userId: userId,
            nickname: nickname || suggestedNickname,
            avatarColor: getAvatarColor(nickname || suggestedNickname)
          })
          break
          
        case 'test-message':
          console.log('🧪 Test message received:', data.text)
          alert('Received: ' + data.text)
          break
          
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
          
        case 'canvas-object-resize':
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === data.objectId 
              ? { ...obj, size: data.size } 
              : obj
          ))
          break
          
        // case 'timer-started':
        //   console.log('Timer started by another user')
        //   break
      }
    })

    return unsubscribe
  }, [connection, userId, nickname, suggestedNickname, sendTo])

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

  // Add effect to broadcast nickname when connection is established
  useEffect(() => {
    if (isConnected && nickname) {
      console.log('🔍 Broadcasting my nickname to all peers:', nickname)
      // Delay slightly to ensure connections are ready
      setTimeout(() => {
        broadcast({
          type: 'user-joined',
          userId: userId,
          nickname: nickname,
          avatarColor: getAvatarColor(nickname)
        })
      }, 500)
    }
  }, [isConnected, nickname, userId, broadcast])

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

  // Add room session creation effect
  useEffect(() => {
    console.log('🔍 Room Session Debug - Starting')
    console.log('🔍 Room code:', code)
    console.log('🔍 User ID:', userId)
    
    const initRoomSession = async () => {
      console.log('🔍 initRoomSession called')
      
      try {
        // Check if room session exists
        console.log('🔍 Checking for existing room session...')
        const { data: existingSession, error: getError } = await getRoomSession(code)
        console.log('🔍 getRoomSession result:', { existingSession, getError })
        
        if (!existingSession) {
          // Create new room session
          console.log('🔍 No existing session, creating new one...')
          const { data, error } = await createRoomSession(code, userId!)
          console.log('🔍 createRoomSession result:', { data, error })
          
          if (error) {
            console.error('❌ Failed to create room session:', error)
          } else {
            console.log('✅ Room session created successfully:', data)
          }
        } else {
          console.log('✅ Room session already exists:', existingSession)
        }
      } catch (err) {
        console.error('❌ Unexpected error in initRoomSession:', err)
      }
    }
    
    if (code && userId) {
      console.log('🔍 Both code and userId exist, initializing room session')
      initRoomSession()
    } else {
      console.log('🔍 Missing code or userId, skipping room session init')
      console.log('🔍 code:', code, 'userId:', userId)
    }
  }, [code, userId])

  // Add paste handler inside the component
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          
          const blob = item.getAsFile()
          if (!blob) continue
          
          // Convert to base64
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            
            // Create image object
            const img = new Image()
            img.onload = () => {
              const newImage = {
                id: crypto.randomUUID(),
                type: 'image',
                src: base64,
                position: {
                  x: window.innerWidth / 2 - 200,
                  y: window.innerHeight / 2 - 150
                },
                size: {
                  width: Math.min(400, img.width),
                  height: Math.min(300, img.height * (400 / img.width))
                },
                timestamp: Date.now()
              }
              
              setCanvasObjects(prev => [...prev, newImage])
              
              // Broadcast to others
              broadcast({
                type: 'canvas-object-add',
                object: newImage
              })
            }
            img.src = base64
          }
          reader.readAsDataURL(blob)
        }
      }
    }
    
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [broadcast])

  // Add keyboard shortcut for deselection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedObjects(new Set())
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handler functions
  const handleSetNickname = (newNickname: string) => {
    console.log('🔍 Join Room clicked')
    console.log('🔍 Nickname:', newNickname)
    console.log('🔍 Room code:', code)
    console.log('🔍 Current showNicknameModal:', showNicknameModal)
    console.log('🔍 Generated nickname for new user:', newNickname)
    console.log('🔍 Generated avatar color:', getAvatarColor(newNickname))
    
    setNickname(newNickname)
    localStorage.setItem('nickname', newNickname)
    setShowNicknameModal(false)
    toast.success('Nickname set!')
    
    console.log('🔍 Modal should now be closed')
    console.log('🔍 Nickname saved to localStorage:', newNickname)
    
    // Note: user-joined broadcast will happen automatically when connection is established
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
    console.log('handleCanvasAdd called with:', data)
    if (!data.content) {
      console.error('No content in canvas object data!')
      return
    }
    const newObject = {
      id: crypto.randomUUID(),
      type: data.type,
      content: data.content || '',  // Provide default
      prompt: data.prompt || '',
      provider: data.provider || 'unknown',
      executedBy: data.executedBy || 'unknown',
      position: findOptimalPosition(),
      size: { width: 450, height: 400 },
      timestamp: Date.now()
    }
    console.log('Creating canvas object:', newObject)
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

  const handleObjectResize = useCallback((id: string, width: number, height: number) => {
    setCanvasObjects(prev => prev.map(obj => 
      obj.id === id 
        ? { ...obj, size: { width, height } } 
        : obj
    ))
    
    broadcast({
      type: 'canvas-object-resize',
      objectId: id,
      size: { width, height }
    })
  }, [broadcast])

  // Add selection handlers after other handlers
  const handleObjectSelect = (id: string, multiSelect: boolean = false) => {
    setSelectedObjects(prev => {
      const newSelection = new Set(prev)
      
      if (multiSelect) {
        // Cmd/Ctrl click toggles selection
        if (newSelection.has(id)) {
          newSelection.delete(id)
        } else {
          newSelection.add(id)
        }
      } else {
        // Single click replaces selection
        newSelection.clear()
        newSelection.add(id)
      }
      
      return newSelection
    })
  }

  // Add handler to clear selection when clicking canvas background
  const handleCanvasBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedObjects(new Set())
    }
  }

  // Prepare peer data
  const allUsers = [
    { 
      userId, 
      nickname: nickname || suggestedNickname || 'Anonymous User',
      isHost: true,
      avatarColor: getAvatarColor(nickname || suggestedNickname) || '#9CA3AF'
    },
    ...peers.map(peer => ({
      ...peer,
      nickname: peer.nickname || 'Anonymous User',
      avatarColor: getAvatarColor(peer.nickname) || '#9CA3AF',
      isHost: false
    }))
  ]

  // Add this helper function to get the actual selected objects
  const getSelectedObjects = () => {
    return Array.from(selectedObjects)
      .map(id => canvasObjects.find(obj => obj.id === id))
      .filter(Boolean)
  }

  // Render loading state
  if (!mounted) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Join Room Modal */}
      <Dialog open={showNicknameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Room</DialogTitle>
            <DialogDescription>
              You'll join room <strong>{code}</strong> with an auto-generated nickname.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Your nickname:</p>
              <p className="text-lg font-semibold text-gray-900">{suggestedNickname}</p>
            </div>
            <Button 
              onClick={() => handleSetNickname(suggestedNickname)} 
              className="w-full"
            >
              Join Room
            </Button>
          </div>
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
            onShare={() => setShowShareModal(true)}
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
            <div 
              className="absolute inset-0 pointer-events-none"
              onClick={handleCanvasBackgroundClick}
            >
              <div className="relative w-full h-full">
                {canvasObjects.map(obj => {
                  switch (obj.type) {
                    case 'ai-response':
                      return (
                        <div key={obj.id} className="pointer-events-auto">
                          <AIResponseCard
                            id={obj.id}
                            content={obj.content}
                            prompt={obj.prompt}
                            provider={obj.provider}
                            executedBy={obj.executedBy}
                            position={obj.position}
                            size={obj.size || { width: 450, height: 400 }}
                            isSelected={selectedObjects.has(obj.id)}
                            onSelect={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleObjectSelect(obj.id, e.metaKey || e.ctrlKey)
                            }}
                            onMove={handleObjectMove}
                            onRemove={handleObjectRemove}
                            onResize={handleObjectResize}
                          />
                        </div>
                      )
                    case 'image':
                      return (
                        <div key={obj.id} className="pointer-events-auto">
                          <CanvasImage
                            id={obj.id}
                            src={obj.src}
                            position={obj.position}
                            size={obj.size}
                            isSelected={selectedObjects.has(obj.id)}
                            onSelect={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleObjectSelect(obj.id, e.metaKey || e.ctrlKey)
                            }}
                            onMove={handleObjectMove}
                            onResize={handleObjectResize}
                            onRemove={handleObjectRemove}
                          />
                        </div>
                      )
                    default:
                      return null
                  }
                })}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="fixed bottom-4 right-4 z-50">
            <ConnectionStatus
              state={connectionState}
              peerCount={allUsers.length}
            />
            
            {/* Test WebRTC Button */}
            <Button
              onClick={() => {
                console.log('🧪 Test broadcast')
                if (broadcast) {
                  broadcast({
                    type: 'test-message',
                    text: 'Hello from ' + (nickname || suggestedNickname),
                    timestamp: Date.now()
                  })
                  console.log('✅ Broadcast sent')
                } else {
                  console.log('❌ Broadcast function not available')
                }
              }}
              className="mt-2 w-full"
              variant="outline"
              size="sm"
            >
              Test WebRTC
            </Button>
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
            selectedObjects={getSelectedObjects()}
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