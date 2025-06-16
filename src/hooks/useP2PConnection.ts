import { useEffect, useState, useRef, useCallback } from 'react'
import { P2PConnection } from '@/lib/webrtc'

export function useP2PConnection(roomCode: string | null, userId: string, nickname: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState<any[]>([])
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const connectionRef = useRef<P2PConnection | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const currentRoomRef = useRef<string | null>(null)

  useEffect(() => {
    // Skip if no required params
    if (!roomCode || !userId || !nickname) {
      return
    }

    // Skip if already have a connection for this room
    if (connectionRef.current && currentRoomRef.current === roomCode) {
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
        if (data.type === 'peer-connected' || data.type === 'peer-disconnected') {
          setPeers(connection.getPeers())
        }
      },
      (peer) => {
        setPeers(prev => [...prev, peer])
      },
      (peerId) => {
        setPeers(prev => prev.filter(p => p.id !== peerId))
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
    }

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [roomCode, userId, nickname])

  const broadcast = useCallback((data: any) => {
    connectionRef.current?.broadcast(data)
  }, [])

  const sendTo = useCallback((peerId: string, data: any) => {
    connectionRef.current?.sendTo(peerId, data)
  }, [])

  return {
    isConnected,
    peers,
    connectionState,
    broadcast,
    sendTo,
    connection: connectionRef.current
  }
} 