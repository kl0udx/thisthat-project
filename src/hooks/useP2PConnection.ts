import { useEffect, useState, useRef, useCallback } from 'react'
import { P2PConnection } from '@/lib/webrtc'
import { getAvatarColor } from '@/lib/utils'

export function useP2PConnection(roomCode: string | null, userId: string, nickname: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState<any[]>([])
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const connectionRef = useRef<P2PConnection | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const currentRoomRef = useRef<string | null>(null)
  
  // Add a local state to track peer info including nicknames
  const [peerInfo, setPeerInfo] = useState<Map<string, { nickname: string, avatarColor: string }>>(new Map())

  useEffect(() => {
    // Skip if no required params
    if (!roomCode || !userId || !nickname) {
      console.log('🔍 P2P Connection skipped - missing params:', { roomCode, userId, nickname })
      return
    }

    console.log('🔍 P2P Connection starting with:', { roomCode, userId, nickname })

    // Skip if already have a connection for this room
    if (connectionRef.current && currentRoomRef.current === roomCode) {
      console.log('🔍 P2P Connection already exists for room:', roomCode)
      return
    }

    // Clean up any existing connection
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    // Create new connection
    const connection = new P2PConnection(
      roomCode,
      userId,
      (data) => {
        console.log('🔍 P2P Message received:', data)
        
        // Handle user-joined messages to store peer nickname info
        if (data.type === 'user-joined') {
          console.log('🔍 Received user-joined:', data)
          setPeerInfo(prev => new Map(prev).set(data.userId, {
            nickname: data.nickname,
            avatarColor: data.avatarColor
          }))
        }
        
        // Handle user-info messages (response to user-joined)
        if (data.type === 'user-info') {
          console.log('🔍 Received user-info:', data)
          setPeerInfo(prev => new Map(prev).set(data.userId, {
            nickname: data.nickname,
            avatarColor: data.avatarColor
          }))
        }
        
        // Handle request-info messages
        if (data.type === 'request-info') {
          console.log('🔍 Received request-info from:', data.from)
          // Send our info back to the requesting peer
          connection.sendTo(data.from, {
            type: 'user-info',
            userId: userId,
            nickname: nickname,
            avatarColor: getAvatarColor(nickname)
          })
        }
        
        if (data.type === 'peer-connected' || data.type === 'peer-disconnected') {
          setPeers(connection.getPeers())
        }
      },
      (peer) => {
        console.log('🔍 Peer joined:', peer)
        console.log('🔍 Total peers after join:', connection.getPeers().length + 1)
        setPeers(prev => [...prev, peer])
      },
      (peerId) => {
        console.log('🔍 Peer left:', peerId)
        setPeers(prev => prev.filter(p => p.id !== peerId))
        // Remove peer info when they leave
        setPeerInfo(prev => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
      }
    )
    connectionRef.current = connection
    currentRoomRef.current = roomCode

    setConnectionState('connecting')

    // Connect
    const setupConnection = async () => {
      try {
        await connection.connect()
        setIsConnected(true)
        setConnectionState('connected')
        setPeers(connection.getPeers())
        console.log('🔍 P2P Connection established successfully')

        // Broadcast our presence to all peers
        console.log('🔍 Broadcasting user-joined to all peers')
        console.log('🔍 Current peers count:', connection.getPeers().length)
        // Wait for data channels to be ready
        setTimeout(() => {
          connection.broadcast({
            type: 'user-joined',
            userId: userId,
            nickname: nickname,
            avatarColor: getAvatarColor(nickname)
          })
        }, 2000) // Wait 2 seconds for channels to establish
      } catch (error) {
        console.error('Failed to connect:', error)
        setConnectionState('disconnected')
        setIsConnected(false)
      }
    }

    setupConnection()

    // Update peers periodically
    const interval = setInterval(() => {
      if (connectionRef.current) {
        setPeers(connectionRef.current.getPeers())
      }
    }, 1000)

    // Store cleanup function
    cleanupRef.current = () => {
      clearInterval(interval)
      connection.disconnect()
      connectionRef.current = null
      currentRoomRef.current = null
      setIsConnected(false)
      setConnectionState('disconnected')
      setPeers([])
      setPeerInfo(new Map())
    }

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [roomCode, userId, nickname])

  // Broadcast user info when connection establishes
  useEffect(() => {
    if (isConnected && nickname && connectionRef.current) {
      console.log('🔍 Broadcasting user-joined on connection:', { userId, nickname })
      // Wait longer for data channels to be ready
      const timer = setTimeout(() => {
        console.log('📤 Broadcasting user-joined (delayed)')
        // Broadcast our info to all existing peers
        connectionRef.current!.broadcast({
          type: 'user-joined',
          userId: userId,
          nickname: nickname,
          avatarColor: getAvatarColor(nickname)
        })
      }, 2000) // Wait 2 seconds for channels to establish
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, nickname, userId])

  const broadcast = useCallback((data: any) => {
    connectionRef.current?.broadcast(data)
  }, [])

  const sendTo = useCallback((peerId: string, data: any) => {
    connectionRef.current?.sendTo(peerId, data)
  }, [])

  // Enhance peers with nickname info before returning
  const enhancedPeers = peers.map(peer => ({
    ...peer,
    nickname: peerInfo.get(peer.userId)?.nickname || 'Anonymous User',
    avatarColor: peerInfo.get(peer.userId)?.avatarColor || '#9CA3AF'
  }))

  return {
    isConnected,
    peers: enhancedPeers,
    connectionState,
    broadcast,
    sendTo,
    connection: connectionRef.current
  }
} 