'use client'

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
import { generateNickname, getAvatarColor, generateRandomAvatarColor } from '@/lib/utils'
import { useRouter } from "next/navigation"
import { P2PConnection } from "@/lib/webrtc"
import { toast } from 'sonner'
import { AIResponseCard } from '@/components/room/ai-response-card'
import { CanvasImage } from '@/components/room/canvas-image'
import { ArtifactCard } from '@/components/room/artifact-card'
import { ImageArtifactCard } from '@/components/room/image-artifact-card'
import { RemoteCursor } from '@/components/room/remote-cursor'
import type { ParsedCommand } from '@/lib/command-parser'
import { createRoomSession, getRoomSession, startRoomTimer } from '@/lib/supabase-rooms'
import { artifactStore, type Artifact } from '@/lib/artifact-store'
import { Loader2 } from 'lucide-react'
import { getMessages, Message, createCanvasObject, updateCanvasObject, deleteCanvasObject, getCanvasObjects, createPresenceChannel, getOnlineUsers, type RoomPresence } from '@/lib/supabase-hybrid'
import { supabase } from '@/lib/supabase'

// Add this type above the component
interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system' | 'search' | 'command'
  user: string
  content: string
  timestamp: number
  provider?: string
  requestId?: string
  isLoading?: boolean
  command?: string
}

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
  const [avatarColor, setAvatarColor] = useState<string | null>(null)
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Presence tracking
  const [presenceChannel, setPresenceChannel] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<RoomPresence[]>([])
  
  // Cursor tracking
  const [remoteCursors, setRemoteCursors] = useState<Map<string, {
    x: number
    y: number
    nickname: string
    color: string
  }>>(new Map())
  
  // Add state for the input field
  const [nicknameInput, setNicknameInput] = useState('')
  
  // Add debug log for userId after state declaration
  console.log('🔍 Debug - userId (initial):', userId)
  console.log('🔍 Debug - suggestedNickname:', suggestedNickname)
  console.log('🔍 Debug - current nickname:', nickname)
  
  // Always call useP2PConnection, but pass null when we shouldn't connect
  const { isConnected, peers, connectionState, broadcast, sendTo, connection } = useP2PConnection(
    mounted && nickname && !showNicknameModal ? code : null,
    userId,
    nickname || suggestedNickname || '' // Use suggestedNickname as fallback
  )

  // First useEffect - mounting and nickname persistence
  useEffect(() => {
    setMounted(true)
    
    if (typeof window !== 'undefined') {
      console.log('🔍 Checking localStorage for nickname...')
      const savedNickname = localStorage.getItem('nickname')
      const savedAvatarColor = localStorage.getItem('avatarColor')
      console.log('🔍 Found saved nickname:', savedNickname)
      console.log('🔍 Found saved avatar color:', savedAvatarColor)
      
      if (savedNickname && savedAvatarColor) {
        console.log('🔍 Loading saved nickname:', savedNickname)
        setNickname(savedNickname)
        setAvatarColor(savedAvatarColor)
        setShowNicknameModal(false)
        console.log('🔍 Nickname loaded, modal hidden')
      } else {
        console.log('🔍 No saved nickname found, will show modal')
        // Generate new avatar color for new users
        setAvatarColor(generateRandomAvatarColor())
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
              nickname: nickname || suggestedNickname || '',
              avatarColor: getAvatarColor(nickname || suggestedNickname || '')
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
            nickname: nickname || suggestedNickname || '',
            avatarColor: getAvatarColor(nickname || suggestedNickname || '')
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
          console.log('📦 Remote add received:', {
            objectId: data.object?.id,
            objectType: data.object?.type,
            objectSize: JSON.stringify(data.object).length,
            currentCanvasObjectsCount: canvasObjects.length
          })
          setCanvasObjects(prev => {
            const newState = [...prev, data.object]
            console.log('📦 Canvas objects updated:', {
              previousCount: prev.length,
              newCount: newState.length,
              addedObject: data.object
            })
            return newState
          })
          break
          
        case 'canvas-object-move':
          console.log('📦 Remote move received:', {
            objectId: data.objectId,
            newPosition: data.position,
            currentCanvasObjectsCount: canvasObjects.length
          })
          setCanvasObjects(prev => {
            const newState = prev.map(obj => 
              obj.id === data.objectId 
                ? { ...obj, position: data.position } 
                : obj
            )
            console.log('📦 Canvas objects updated for move:', {
              previousCount: prev.length,
              newCount: newState.length,
              movedObject: data.objectId
            })
            return newState
          })
          break
          
        case 'canvas-object-remove':
          console.log('📦 Remote remove received:', {
            objectId: data.objectId,
            currentCanvasObjectsCount: canvasObjects.length
          })
          setCanvasObjects(prev => {
            const newState = prev.filter(obj => obj.id !== data.objectId)
            console.log('📦 Canvas objects updated for remove:', {
              previousCount: prev.length,
              newCount: newState.length,
              removedObject: data.objectId
            })
            return newState
          })
          break
          
        case 'canvas-object-resize':
          console.log('📦 Remote resize received:', {
            objectId: data.objectId,
            newSize: data.size,
            currentCanvasObjectsCount: canvasObjects.length
          })
          setCanvasObjects(prev => {
            const newState = prev.map(obj => 
              obj.id === data.objectId 
                ? { ...obj, size: data.size } 
                : obj
            )
            console.log('📦 Canvas objects updated for resize:', {
              previousCount: prev.length,
              newCount: newState.length,
              resizedObject: data.objectId
            })
            return newState
          })
          break
          
        case 'request-artifact':
          console.log('📦 Artifact requested:', data.artifactId)
          const requestedArtifact = artifactStore.getArtifact(data.artifactId)
          
          if (requestedArtifact) {
            sendTo(data.from, {
              type: 'artifact-content',
              artifact: requestedArtifact
            })
          }
          break

        case 'artifact-content':
          console.log('📦 Received artifact content:', data.artifact.id)
          artifactStore.addArtifact(data.artifact)
          
          // Force re-render of canvas objects
          setCanvasObjects(prev => [...prev])
          break
          
        case 'ai-response':
          // REMOVED: Let Supabase subscription handle AI responses instead of WebRTC
          // This prevents double-adding of AI response cards
          console.log('🤖 AI response received via WebRTC - skipping to prevent duplicates')
          break
          
        // case 'timer-started':
        //   console.log('Timer started by another user')
        //   break
      }
    })

    return unsubscribe
  }, [connection, userId, nickname, suggestedNickname, sendTo, canvasObjects.length])

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
          avatarColor: getAvatarColor(nickname || '')
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
          console.log('📋 Image paste detected:', { type: item.type })
          
          const blob = item.getAsFile()
          if (!blob) continue
          
          // Convert to base64
          const reader = new FileReader()
          reader.onload = async (event) => {
            const base64String = event.target?.result as string
            console.log('📋 Image converted to base64, length:', base64String.length)
            
            // Create image object
            const img = new Image()
            img.onload = async () => {
              // Check if image should be an artifact
              if (base64String.length > 50000) { // 50KB threshold
                console.log('📋 Large image detected, creating artifact')
                
                // Compress for preview
                const preview = await compressImage(base64String, 400)
                
                // Create image artifact
                const artifact: Artifact = {
                  id: crypto.randomUUID(),
                  type: 'image',
                  title: 'Pasted Image',
                  content: base64String, // Full quality
                  metadata: {
                    size: base64String.length,
                    dimensions: { width: img.width, height: img.height }
                  },
                  createdBy: userId || 'unknown',
                  createdAt: Date.now()
                }
                
                artifactStore.addArtifact(artifact)
                
                // Create canvas object with preview
                const imageArtifact = {
                  id: artifact.id,
                  type: 'image-artifact',
                  preview: preview, // Small preview for display
                  originalSize: artifact.metadata?.size,
                  position: {
                    x: window.innerWidth / 2 - 200,
                    y: window.innerHeight / 2 - 150
                  },
                  size: {
                    width: Math.min(400, img.width),
                    height: Math.min(300, img.height * (400 / img.width))
                  },
                  timestamp: Date.now(),
                  createdBy: userId || 'unknown'
                }
                
                console.log('📋 Creating image artifact object:', {
                  objectId: imageArtifact.id,
                  objectSize: JSON.stringify(imageArtifact).length,
                  currentCanvasObjectsCount: canvasObjects.length
                })
                
                // Use handleCanvasAdd instead of direct state update
                handleCanvasAdd({
                  type: 'image-artifact',
                  preview: preview,
                  originalSize: artifact.metadata?.size,
                  position: {
                    x: window.innerWidth / 2 - 200,
                    y: window.innerHeight / 2 - 150
                  },
                  size: {
                    width: Math.min(400, img.width),
                    height: Math.min(300, img.height * (400 / img.width))
                  },
                  createdBy: userId || 'unknown'
                })
                
                console.log('✅ Image artifact added via handleCanvasAdd')
              } else {
                // Small image, handle normally
                const newImage = {
                  id: crypto.randomUUID(),
                  type: 'image',
                  src: base64String,
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
                
                console.log('📋 Creating regular image object:', {
                  objectId: newImage.id,
                  objectSize: JSON.stringify(newImage).length,
                  currentCanvasObjectsCount: canvasObjects.length
                })
                
                // Use handleCanvasAdd instead of direct state update
                handleCanvasAdd({
                  type: 'image',
                  src: base64String,
                  position: {
                    x: window.innerWidth / 2 - 200,
                    y: window.innerHeight / 2 - 150
                  },
                  size: {
                    width: Math.min(400, img.width),
                    height: Math.min(300, img.height * (400 / img.width))
                  }
                })
                
                console.log('✅ Regular image added via handleCanvasAdd')
              }
            }
            img.src = base64String
          }
          reader.readAsDataURL(blob)
        }
      }
    }
    
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [broadcast, canvasObjects.length])

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

  // Set up presence when nickname is available
  useEffect(() => {
    if (!nickname || !userId) return
    
    console.log('Setting up presence for:', nickname)
    
    // Create presence channel
    const channel = createPresenceChannel(code)
    
    // Listen for presence updates
    channel
      .on('presence', { event: 'sync' }, () => {
        const users = getOnlineUsers(channel)
        console.log('Presence sync - online users:', users)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          const presenceData = {
            user_id: userId,
            nickname: nickname,
            avatar_color: avatarColor || '#9CA3AF',
            joined_at: new Date().toISOString()
          }
          console.log('Tracking presence:', presenceData)
          await channel.track(presenceData)
        }
      })
    
    setPresenceChannel(channel)
    
    // Cleanup
    return () => {
      console.log('Cleaning up presence')
      channel.unsubscribe()
    }
  }, [nickname, userId, code, avatarColor])

  // Handler functions
  const handleSetNickname = async (newNickname: string) => {
    console.log('🔍 Join Room clicked')
    console.log('🔍 Nickname:', newNickname)
    console.log('🔍 Room code:', code)
    console.log('🔍 Current showNicknameModal:', showNicknameModal)
    console.log('🔍 Generated nickname for new user:', newNickname)
    
    // If no avatar color yet, generate one
    const color = avatarColor || generateRandomAvatarColor()
    console.log('🔍 Generated avatar color:', color)
    
    console.log('🔍 About to save nickname to localStorage:', newNickname)
    setNickname(newNickname)
    setAvatarColor(color)
    localStorage.setItem('nickname', newNickname)
    localStorage.setItem('avatarColor', color)
    console.log('🔍 Nickname saved to localStorage:', newNickname)
    setShowNicknameModal(false)
    setNicknameInput('') // Clear input for next time
    toast.success('Nickname set!')
    
    console.log('🔍 Modal should now be closed')
    console.log('🔍 Nickname saved to localStorage:', newNickname)
    
    // Update presence with new nickname
    if (presenceChannel) {
      console.log('Updating presence with new nickname:', newNickname)
      await presenceChannel.track({
        user_id: userId,
        nickname: newNickname,
        avatar_color: color,
        joined_at: new Date().toISOString()
      })
    }
    
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

  const handleCanvasAdd = async (obj: any) => {
    console.log('📦 handleCanvasAdd called with:', obj.type)
    
    // Check if this AI response already exists
    if (obj.type === 'ai-response' && obj.responseId) {
      console.log('📦 Checking for existing AI response:', obj.responseId)
      const exists = canvasObjects.some(existingObj => 
        existingObj.type === 'ai-response' && 
        existingObj.responseId === obj.responseId
      )
      
      if (exists) {
        console.log('📦 AI response already on canvas, skipping')
        return
      }
    } else if (obj.type === 'ai-response') {
      console.log('⚠️ Warning: AI response without responseId - cannot deduplicate')
    }

    const id = crypto.randomUUID()
    const timestamp = Date.now()
    // Remove 'id' from content before saving to Supabase
    const { id: _omit, ...contentForSupabase } = obj
    const newObject = {
      id,
      timestamp,
      ...contentForSupabase,
    }
    
    console.log('📦 Adding new canvas object:', {
      id: newObject.id,
      type: newObject.type,
      responseId: newObject.responseId
    })
    
    setCanvasObjects(prev => [...prev, newObject])
    if (broadcast) {
      broadcast({
        type: 'canvas-object-add',
        object: newObject,
      })
    }
    try {
      await createCanvasObject({
        id,
        room_code: code ?? '',
        type: obj.type,
        content: contentForSupabase,
        position: obj.position || { x: 500, y: 300 },
        size: obj.size || { width: 400, height: 300 },
        created_by_user_id: userId ?? '',
        created_by_nickname: nickname ?? 'Anonymous'
      })
      console.log('📦 Canvas object saved to Supabase')
    } catch (error) {
      console.error('❌ Failed to save canvas object:', error)
    }
  }

  const handleObjectMove = async (id: string, x: number, y: number) => {
    setCanvasObjects(prev =>
      prev.map(obj =>
        obj.id === id ? { ...obj, position: { x, y } } : obj
      )
    )
    if (broadcast) {
      broadcast({
        type: 'canvas-object-move',
        id,
        position: { x, y },
      })
    }
    try {
      await updateCanvasObject(id, {
        position: { x, y },
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to update position in Supabase:', error)
    }
  }

  const handleObjectRemove = async (id: string) => {
    setCanvasObjects(prev => prev.filter(obj => obj.id !== id))
    if (broadcast) {
      broadcast({
        type: 'canvas-object-remove',
        id,
      })
    }
    try {
      await deleteCanvasObject(id)
      console.log('Canvas object deleted from Supabase')
    } catch (error) {
      console.error('Failed to delete from Supabase:', error)
    }
  }

  // Add this handler function
  const handleShapeDelete = useCallback((shapeId: string) => {
    console.log('🗑️ handleShapeDelete called:', { shapeId })
    // Broadcast deletion to peers
    console.log('🚀 About to broadcast canvas-object-remove for shape:', {
      type: 'canvas-object-remove',
      objectId: shapeId,
      broadcastFunction: !!broadcast
    })
    
    broadcast({
      type: 'canvas-object-remove',
      objectId: shapeId
    })
    
    console.log('✅ Broadcast sent for shape delete')
  }, [broadcast])

  // Add handlers
  const handleToolChange = (tool: string) => {
    setActiveTool(tool)
  }

  const handleClearCanvas = useCallback(() => {
    if ((window as any).canvasTools) {
      (window as any).canvasTools.clearCanvas()
    }
    // Broadcast clear event
    broadcast({ type: 'canvas-clear' })
  }, [broadcast])

  const handleDeleteSelection = useCallback(() => {
    if ((window as any).canvasTools) {
      (window as any).canvasTools.deleteSelectedShapes()
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

  const handleObjectResize = async (id: string, width: number, height: number) => {
    setCanvasObjects(prev =>
      prev.map(obj =>
        obj.id === id ? { ...obj, size: { width, height } } : obj
      )
    )
    if (broadcast) {
      broadcast({
        type: 'canvas-object-resize',
        id,
        size: { width, height },
      })
    }
    try {
      await updateCanvasObject(id, {
        size: { width, height },
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to update size in Supabase:', error)
    }
  }

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
  const allUsers = useMemo(() => {
    const usersMap = new Map()
    
    // Add self first
    usersMap.set(userId, {
      userId,
      nickname: nickname || suggestedNickname || 'Anonymous User',
      isHost: true,
      avatarColor: avatarColor || '#9CA3AF'
    })
    
    // Add online users from Supabase presence
    onlineUsers.forEach(user => {
      if (user.user_id !== userId) {
        usersMap.set(user.user_id, {
          userId: user.user_id,
          nickname: user.nickname,
          isHost: false,
          avatarColor: user.avatar_color
        })
      }
    })
    
    // Add WebRTC peers (fallback for any not in presence yet)
    peers.forEach(peer => {
      if (!usersMap.has(peer.userId)) {
        usersMap.set(peer.userId, {
          userId: peer.userId,
          nickname: peer.nickname || 'Anonymous User',
          isHost: false,
          avatarColor: getAvatarColor(peer.nickname) || '#9CA3AF'
        })
      }
    })
    
    return Array.from(usersMap.values())
  }, [userId, nickname, suggestedNickname, avatarColor, onlineUsers, peers])

  // Add this helper function to get the actual selected objects
  const getSelectedObjects = () => {
    return Array.from(selectedObjects)
      .map(id => canvasObjects.find(obj => obj.id === id))
      .filter(Boolean)
  }

  // Add connection status logging
  useEffect(() => {
    console.log('🔗 Connection status changed:', {
      isConnected,
      peerCount: peers.length,
      connectionState,
      broadcastFunction: !!broadcast,
      timestamp: new Date().toISOString()
    })
  }, [isConnected, peers.length, connectionState, broadcast])

  // Helper function to detect if content should be an artifact
  const shouldCreateArtifact = (content: string, type: string = 'text'): boolean => {
    if (type === 'image') return content.length > 50000 // Images over 50KB
    
    const hasCode = content.includes('```') || content.includes('function') || content.includes('const')
    const hasHTML = content.includes('<!DOCTYPE') || content.includes('<html')
    const lineCount = content.split('\n').length
    
    return (hasCode && lineCount > 50) || 
           (hasHTML && content.length > 2000) || 
           content.length > 5000
  }

  // Add image compression helper
  const compressImage = async (base64: string, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = base64
    })
  }

  // Add debug function to window for manual testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugWebRTC = () => {
        console.log('🔍 WEBRTC DEBUG INFO:')
        console.log('Connection exists:', !!connection)
        console.log('Broadcast function exists:', !!broadcast)
        console.log('Is connected:', isConnected)
        console.log('Connection state:', connectionState)
        console.log('Peer count:', peers.length)
        
        if (connection) {
          const allPeers = connection.getPeers()
          console.log('All peers:', allPeers)
          
          allPeers.forEach((peer: any, index: number) => {
            console.log(`Peer ${index}:`, {
              id: peer.id,
              userId: peer.userId,
              dataChannel: peer.dataChannel,
              dataChannelReadyState: peer.dataChannel?.readyState,
              dataChannelLabel: peer.dataChannel?.label,
              dataChannelId: peer.dataChannel?.id,
              connection: peer.connection,
              connectionState: peer.connection?.connectionState,
              signalingState: peer.connection?.signalingState,
              iceConnectionState: peer.connection?.iceConnectionState
            })
          })
        }
        
        return {
          connection: !!connection,
          broadcast: !!broadcast,
          isConnected,
          connectionState,
          peerCount: peers.length,
          peers: connection?.getPeers() || []
        }
      }
      
      // Add localStorage debug function
      (window as any).debugLocalStorage = () => {
        console.log('🔍 LOCALSTORAGE DEBUG INFO:')
        console.log('All localStorage keys:')
        Object.keys(localStorage).forEach(key => {
          console.log(`  ${key}:`, localStorage.getItem(key))
        })
        
        console.log('🔍 NICKNAME DEBUG:')
        console.log('Stored nickname:', localStorage.getItem('nickname'))
        console.log('Current nickname state:', nickname)
        console.log('Suggested nickname:', suggestedNickname)
        console.log('Show nickname modal:', showNicknameModal)
        
        return {
          storedNickname: localStorage.getItem('nickname'),
          currentNickname: nickname,
          suggestedNickname,
          showModal: showNicknameModal
        }
      }
      
      // Add clear localStorage function
      (window as any).clearLocalStorage = () => {
        console.log('🧹 Clearing all localStorage...')
        localStorage.clear()
        console.log('✅ localStorage cleared!')
        console.log('🔄 Refreshing page...')
        location.reload()
      }
      
      console.log('🔍 Debug functions added:')
      console.log('  - window.debugWebRTC()')
      console.log('  - window.debugLocalStorage()')
      console.log('  - window.clearLocalStorage()')
    }
  }, [connection, broadcast, isConnected, connectionState, peers.length, nickname, suggestedNickname, showNicknameModal])

  // Replace the polling useEffect with real-time subscription
  useEffect(() => {
    if (!code) return;
    // First, load existing messages once
    const loadInitialMessages = async () => {
      try {
        const existingMessages = await getMessages(code ?? '')
        // Normalize all messages to ChatMessage
        const normalized: ChatMessage[] = (existingMessages || []).map((dbMessage: any) => ({
          id: dbMessage.id,
          user: dbMessage.nickname,
          content: dbMessage.content,
          timestamp: new Date(dbMessage.created_at).getTime(),
          type: dbMessage.is_ai_request ? 'ai' as const : 'user' as const,
          provider: dbMessage.ai_provider
        }))
        setMessages(normalized)
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
    loadInitialMessages()

    // Then subscribe to new messages
    const channel = supabase
      .channel(`room-messages-${code ?? ''}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_code=eq.${code ?? ''}`
        },
        (payload) => {
          const dbMessage = payload.new
          const normalizedMessage: ChatMessage = {
            id: dbMessage.id,
            user: dbMessage.nickname,
            content: dbMessage.content,
            timestamp: new Date(dbMessage.created_at).getTime(),
            type: dbMessage.is_ai_request ? 'ai' : 'user',
            provider: dbMessage.ai_provider
          }
          setMessages((prev: ChatMessage[]) => [...prev, normalizedMessage])
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Unsubscribing from messages')
      channel.unsubscribe()
    }
  }, [code])

  // Load existing canvas objects on room join
  useEffect(() => {
    const loadCanvasObjects = async () => {
      try {
        const objects = await getCanvasObjects(code ?? '')
        if (objects.length > 0) {
          console.log(`Loading ${objects.length} canvas objects from Supabase`)
          const transformedObjects = objects.map(obj => ({
            id: obj.id,
            type: obj.type,
            position: obj.position,
            size: obj.size,
            timestamp: new Date(obj.created_at).getTime(),
            ...obj.content
          }))
          setCanvasObjects(transformedObjects)
        }
      } catch (error) {
        console.error('Failed to load canvas objects:', error)
      }
    }
    if (code) {
      loadCanvasObjects()
    }
  }, [code])

  // Subscribe to new canvas objects
  useEffect(() => {
    const channel = supabase
      .channel(`canvas-objects-${code}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_objects',
          filter: `room_code=eq.${code}`
        },
        (payload) => {
          const newObject = payload.new
          console.log('New canvas object from Supabase:', newObject)
          
          // Transform Supabase object to local format
          const transformedObject = {
            id: newObject.id,
            type: newObject.type,
            position: newObject.position,
            size: newObject.size,
            timestamp: new Date(newObject.created_at).getTime(),
            ...newObject.content
          }
          
          // Check if we already have this object (from WebRTC)
          setCanvasObjects(prev => {
            const exists = prev.some(obj => obj.id === newObject.id)
            if (exists) {
              console.log('Object already exists from WebRTC, skipping')
              return prev
            }
            return [...prev, transformedObject]
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [code])

  // Cursor tracking with Supabase broadcast
  useEffect(() => {
    if (!userId || !nickname || !avatarColor || !code) return

    console.log('Setting up cursor broadcast channel')
    
    // Create cursor channel
    const cursorChannel = supabase.channel(`cursor:${code}`)
    
    // Subscribe to cursor events
    cursorChannel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        // Update other users' cursors
        if (payload.userId !== userId) {
          setRemoteCursors(prev => {
            const next = new Map(prev)
            next.set(payload.userId, {
              x: payload.x,
              y: payload.y,
              nickname: payload.nickname,
              color: payload.color
            })
            return next
          })
        }
      })
      .on('broadcast', { event: 'cursor-leave' }, ({ payload }) => {
        // Remove cursor when user leaves
        setRemoteCursors(prev => {
          const next = new Map(prev)
          next.delete(payload.userId)
          return next
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Cursor channel subscribed')
          
          // Set up mouse tracking for canvas only
          const handleCanvasMouseMove = (e: MouseEvent) => {
            const canvas = document.querySelector('canvas')
            if (!canvas || !e.target || e.target !== canvas) return
            
            // Don't track cursor while panning (shift key held)
            if (e.shiftKey) return
            
            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            
            // Send cursor position
            cursorChannel.send({
              type: 'broadcast',
              event: 'cursor',
              payload: {
                userId,
                x,
                y,
                nickname: nickname || 'Anonymous',
                color: avatarColor || '#9CA3AF'
              }
            })
          }
          
          // Throttle the mouse events
          let lastMove = 0
          const throttledMove = (e: MouseEvent) => {
            const now = Date.now()
            if (now - lastMove > 16) { // Changed from 50 to 16 (60fps)
              lastMove = now
              handleCanvasMouseMove(e)
            }
          }
          
          // Listen to mouse events
          document.addEventListener('mousemove', throttledMove)
          
          // Cleanup
          return () => {
            document.removeEventListener('mousemove', throttledMove)
            
            // Send leave event
            cursorChannel.send({
              type: 'broadcast',
              event: 'cursor-leave',
              payload: { userId }
            })
            
            supabase.removeChannel(cursorChannel)
          }
        }
      })
      
  }, [code, userId, nickname, avatarColor]) // Stable dependencies

  // Render loading state
  if (!mounted) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }

  // When using code, userId, or nickname, always use fallback values:
  const safeCode = code ?? ''
  const safeUserId = userId ?? ''
  const safeNickname = nickname ?? 'Anonymous'

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Join Room Modal */}
      <Dialog open={showNicknameModal} onOpenChange={setShowNicknameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Room</DialogTitle>
            <DialogDescription>
              You'll join room <span className="font-mono font-bold">{code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Your display name</Label>
              <Input
                id="nickname"
                placeholder={suggestedNickname || "Enter your name"}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nicknameInput.trim()) {
                    handleSetNickname(nicknameInput.trim())
                  }
                }}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Choose any name you'd like - your real name, username, or something creative!
              </p>
            </div>
            
            {/* Show avatar preview if you want */}
            {nicknameInput && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>You'll appear as:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: avatarColor || '#9CA3AF' }}
                  />
                  <span className="font-medium">{nicknameInput}</span>
                </div>
              </div>
            )}
            
            <Button
              onClick={() => handleSetNickname(nicknameInput.trim() || suggestedNickname)}
              className="w-full"
              disabled={!nicknameInput.trim() && !suggestedNickname}
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
            roomCode={safeCode}
            currentUserId={safeUserId}
            peers={allUsers}
            isHost={true}
            onShare={() => setShowShareModal(true)}
          />
          
          {/* Canvas container - flex-1 makes it fill remaining height */}
          <div className="flex-1 relative overflow-hidden">
            <InfiniteCanvas
              ref={canvasRef}
              onShapeAdd={(shape) => {
                console.log('🎨 Shape add from InfiniteCanvas:', {
                  shapeId: shape.id,
                  shapeType: shape.type,
                  shapeSize: JSON.stringify(shape).length
                })
                // Broadcast shape to peers
                console.log('🚀 About to broadcast shape add:', {
                  type: 'canvas-object-add',
                  object: shape,
                  broadcastFunction: !!broadcast
                })
                broadcast({
                  type: 'canvas-object-add',
                  object: shape
                })
                console.log('✅ Broadcast sent for shape add')
              }}
              onShapeDelete={(ids) => {
                console.log('🎨 Shape delete from InfiniteCanvas:', { shapeIds: ids })
                console.log('🚀 About to broadcast shape delete:', {
                  type: 'shapes-delete',
                  shapeIds: ids,
                  broadcastFunction: !!broadcast
                })
                broadcast({ type: 'shapes-delete', shapeIds: ids })
                console.log('✅ Broadcast sent for shape delete')
              }}
              onClear={() => {
                console.log('🎨 Canvas clear from InfiniteCanvas')
                console.log('🚀 About to broadcast canvas clear:', {
                  type: 'canvas-clear',
                  broadcastFunction: !!broadcast
                })
                broadcast({ type: 'canvas-clear' })
                console.log('✅ Broadcast sent for canvas clear')
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
                    case 'artifact':
                      const artifact = artifactStore.getArtifact(obj.id)
                      
                      if (!artifact && obj.createdBy !== safeUserId) {
                        // Request artifact from creator
                        sendTo(obj.createdBy, {
                          type: 'request-artifact',
                          artifactId: obj.id,
                          from: safeUserId
                        })
                        
                        // Show loading placeholder
                        return (
                          <div
                            key={obj.id}
                            className="absolute bg-gray-100 rounded-lg shadow-lg p-8 flex items-center gap-3 pointer-events-auto"
                            style={{ 
                              left: obj.position.x, 
                              top: obj.position.y,
                              width: obj.size.width,
                              height: obj.size.height
                            }}
                          >
                            <Loader2 className="animate-spin" />
                            <span>Loading {obj.artifactType}...</span>
                          </div>
                        )
                      }
                      
                      return (
                        <div key={obj.id} className="pointer-events-auto">
                          <ArtifactCard
                            id={obj.id}
                            artifact={artifact}
                            position={obj.position}
                            size={obj.size}
                            isSelected={selectedObjects.has(obj.id)}
                            onSelect={() => handleObjectSelect(obj.id)}
                            onMove={handleObjectMove}
                            onResize={handleObjectResize}
                            onRemove={handleObjectRemove}
                          />
                        </div>
                      )

                    case 'image-artifact':
                      const imageArtifact = artifactStore.getArtifact(obj.id)
                      
                      return (
                        <div key={obj.id} className="pointer-events-auto">
                          <ImageArtifactCard
                            id={obj.id}
                            artifact={imageArtifact}
                            preview={obj.preview}
                            position={obj.position}
                            size={obj.size}
                            isSelected={selectedObjects.has(obj.id)}
                            onSelect={() => handleObjectSelect(obj.id)}
                            onMove={handleObjectMove}
                            onResize={handleObjectResize}
                            onRemove={handleObjectRemove}
                            onRequestFull={() => {
                              if (!imageArtifact && obj.createdBy !== safeUserId) {
                                sendTo(obj.createdBy, {
                                  type: 'request-artifact',
                                  artifactId: obj.id,
                                  from: safeUserId
                                })
                              }
                            }}
                          />
                        </div>
                      )
                  }
                })}
              </div>
            </div>
            
            {/* Cursor layer on top */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from(remoteCursors.entries()).map(([uid, cursor]) => (
                <RemoteCursor
                  key={uid}
                  x={cursor.x}
                  y={cursor.y}
                  nickname={cursor.nickname}
                  color={cursor.color}
                />
              ))}
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
                console.log('🧪 Current connection state:', {
                  isConnected,
                  connectionState,
                  peerCount: peers.length,
                  broadcastFunction: !!broadcast
                })
                
                if (broadcast) {
                  // First, run debug info
                  if ((window as any).debugWebRTC) {
                    (window as any).debugWebRTC()
                  }
                  
                  // Then send test message
                  broadcast({
                    type: 'test-message',
                    text: 'Hello from ' + (nickname || suggestedNickname || ''),
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
            roomCode={safeCode}
            userId={safeUserId}
            nickname={safeNickname}
            messages={messages}
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
            roomCode={safeCode}
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

          {/* Nickname Modal */}
          <NicknameModal
            isOpen={showNicknameModal}
            onClose={() => setShowNicknameModal(false)}
            onSubmit={handleSetNickname}
            suggestedNickname={suggestedNickname}
            avatarColor={avatarColor || '#9CA3AF'}
          />
        </>
      )}
    </div>
  )
} 