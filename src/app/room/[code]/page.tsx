'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { RoomHeader } from '@/components/room/room-header'
import InfiniteCanvas, { type InfiniteCanvasRef } from '@/components/room/infinite-canvas'
import { CanvasToolbar } from '@/components/room/canvas-toolbar'
import { ConnectionStatus } from '@/components/room/connection-status'
import { ShareModal } from '@/components/room/share-modal'
import { ChatPanel } from '@/components/room/chat-panel'
import { AIProviderButton } from '@/components/room/ai-provider-button'
import { AIResponseCard } from '@/components/room/ai-response-card'
import { NicknameModal } from '@/components/room/nickname-modal'
import { useP2PConnection } from '@/hooks/useP2PConnection'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { generateNickname, getAvatarColor } from '@/lib/utils'

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  
  // All useState hooks at the top level
  const [mounted, setMounted] = useState(false)
  const [nickname, setNickname] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(true)
  const [suggestedNickname] = useState(() => generateNickname())
  const [userId] = useState(() => `user-${Date.now()}`)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [providers, setProviders] = useState<Map<string, { userId: string; nickname: string; type: string }>>(new Map())
  const [localProviders, setLocalProviders] = useState<Set<string>>(new Set())
  const [canvasObjects, setCanvasObjects] = useState<any[]>([])
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

  // Handler functions
  const handleSetNickname = useCallback(() => {
    const finalNickname = nickname || suggestedNickname
    if (typeof window !== 'undefined') {
      localStorage.setItem('nickname', finalNickname)
    }
    setNickname(finalNickname)
    setShowNicknameModal(false)
  }, [nickname, suggestedNickname])

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
    <>
      <NicknameModal
        isOpen={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onSubmit={handleSetNickname}
        suggestedNickname={suggestedNickname}
      />

      <div className="min-h-screen bg-background">
        <RoomHeader
          roomCode={code}
          peers={peers}
          currentUserId={userId}
          isHost={true}
        />

        <main className="pt-16">
          <div className="relative">
            <InfiniteCanvas
              ref={canvasRef}
              onShapeAdd={handleShapeAdd}
              onAIResponseAdd={handleCanvasAdd}
            />
            <CanvasToolbar canvasRef={canvasRef} />
          </div>

          {/* AI Response Cards */}
          {canvasObjects.map(obj => (
            <AIResponseCard
              key={obj.id}
              id={obj.id}
              content={obj.content}
              prompt={obj.prompt}
              provider={obj.provider}
              executedBy={obj.executedBy}
              position={obj.position}
              onMove={handleObjectMove}
              onRemove={handleObjectRemove}
            />
          ))}

          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
            <ConnectionStatus
              state={connectionState}
              peerCount={peers.length}
            />
            <AIProviderButton
              providerCount={providers.size}
              onClick={() => setShowProviderModal(true)}
            />
          </div>

          <ChatPanel
            userId={userId}
            nickname={nickname}
            connection={connection}
            broadcast={broadcast}
            sendTo={sendTo}
            providers={providers}
            onCanvasAdd={handleCanvasAdd}
          />
        </main>
      </div>

      <ShareModal
        roomCode={code}
        open={showShareModal}
        onOpenChange={setShowShareModal}
      />
    </>
  )
} 