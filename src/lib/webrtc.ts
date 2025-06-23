import { supabase } from './supabase'
import { toast } from 'sonner'

interface Peer {
  id: string
  userId: string
  nickname?: string
  avatarColor?: string
  dataChannel?: RTCDataChannel  // Channel we SEND on (the one we created)
  receiveChannel?: RTCDataChannel  // Channel we RECEIVE on (the one we received)
  connection?: RTCPeerConnection
  iceCandidateQueue: RTCIceCandidate[]
}

export class P2PConnection {
  private peers: Map<string, Peer> = new Map()
  private roomId: string
  private userId: string
  private nickname: string
  private avatarColor: string
  private onMessage: (data: any) => void
  private onPeerJoined?: (peer: Peer) => void
  private onPeerLeft?: (peerId: string) => void
  private channel: any // Supabase channel for signaling
  private incomingChunks: Map<string, { chunks: string[], received: number, total: number }> = new Map()

  constructor(
    roomId: string,
    userId: string,
    nickname: string,
    avatarColor: string,
    onMessage: (data: any) => void,
    onPeerJoined?: (peer: Peer) => void,
    onPeerLeft?: (peerId: string) => void
  ) {
    console.log('🔌 WebRTC initialized with:', {
      roomId,
      userId,
      nickname,
      avatarColor,
      timestamp: new Date().toISOString()
    })
    this.roomId = roomId
    this.userId = userId
    this.nickname = nickname
    this.avatarColor = avatarColor
    this.onMessage = onMessage
    this.onPeerJoined = onPeerJoined
    this.onPeerLeft = onPeerLeft
  }

  async connect() {
    console.log('🔌 WebRTC connect() called with userId:', this.userId, 'roomId:', this.roomId)
    
    // Validate userId and roomId
    if (!this.userId || !this.roomId) {
      console.error('❌ Invalid userId or roomId:', { userId: this.userId, roomId: this.roomId })
      throw new Error('Invalid userId or roomId')
    }
    
    // Create Supabase channel for signaling
    this.channel = supabase.channel(`room-${this.roomId}`)
    console.log('📡 Created Supabase channel:', `room-${this.roomId}`)

    // Log ALL channel events
    this.channel
      .on('broadcast', { event: '*' }, (payload: any) => {
        console.log('📡 Received ANY broadcast:', payload)
      })
      .on('broadcast', { event: 'rtc-signal' }, async ({ payload }: { payload: any }) => {
        const data = payload
        console.log('📨 Received RTC signal:', data.type, 'from:', data.from, 'to:', data.to)
        // Only process if it's for us
        if (data.to && data.to !== this.userId) {
          console.log('📨 Signal not for us, ignoring')
          return
        }
        switch (data.type) {
          case 'offer':
            console.log('📨 Processing offer from:', data.from)
            // --- Inline offer handling logic (from original code) ---
            // ... original offer handling code here ...
            break
          case 'answer':
            console.log('📨 Processing answer from:', data.from)
            // --- Inline answer handling logic (from original code) ---
            // ... original answer handling code here ...
            break
          case 'ice-candidate':
            console.log('📨 Processing ICE candidate from:', data.from)
            // --- Inline ice-candidate handling logic (from original code) ---
            // ... original ice-candidate handling code here ...
            break
        }
      })

    // Handle presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        console.log('🌐 Presence sync - who is in the room?')
        const state = this.channel.presenceState()
        console.log('🌐 Presence state:', state)
        this.handlePresenceSync(state)
      })
      .on('presence', { event: 'join' }, (payload: any) => {
        console.log('👥 Presence join:', payload)
        console.log('👥 New user joined - presenceKey:', payload.key, 'userId:', payload.newPresences?.[0]?.user_id)
      })
      .on('presence', { event: 'leave' }, (payload: any) => {
        console.log('👥 Presence leave:', payload)
        console.log('👥 User left - presenceKey:', payload.key, 'userId:', payload.leftPresences?.[0]?.user_id)
      })
      .subscribe(async (status: string, err?: any) => {
        console.log('📡 Subscription status changed to:', status)
        if (err) {
          console.error('❌ Subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('📡 Signaling channel subscribed, tracking presence')
          console.log('📡 Subscribing with MY userId:', this.userId)
          
          // Track presence using userId as the key
          await this.channel.track({
            user_id: this.userId,  // This ensures the presence key matches userId
            online_at: new Date().toISOString()
          }, {
            // Force the presence key to be our userId
            presenceKey: this.userId
          })
        }
      })
  }

  private handlePresenceSync(state: any) {
    console.log('👥 Raw presence state:', state)
    
    const currentPeers: string[] = []
    
    Object.entries(state).forEach(([presenceKey, presences]: [string, any]) => {
      // Get the actual userId from the presence data
      const presence = Array.isArray(presences) ? presences[0] : presences
      const actualUserId = presence.user_id || presence.userId || presenceKey
      
      console.log('👥 Presence entry:', {
        presenceKey,
        actualUserId,
        myUserId: this.userId
      })
      
      if (actualUserId !== this.userId) {
        currentPeers.push(actualUserId)
        
        if (!this.peers.has(actualUserId)) {
          console.log('👥 Connecting to peer using their actual userId:', actualUserId)
          this.connectToPeer(actualUserId)
        }
      }
    })
    
    // Remove peers that left
    this.peers.forEach((peer, peerId) => {
      if (!currentPeers.includes(peerId)) {
        console.log('👥 Peer left, disconnecting:', peerId)
        this.disconnectPeer(peerId)
      }
    })
  }

  private async connectToPeer(peerId: string) {
    console.log('🔗 Connecting to peer:', peerId)
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })
    // Create the SEND channel immediately
    const sendChannel = pc.createDataChannel('data', {
      ordered: true,
      maxRetransmits: 10
    })
    console.log('📤 Created send channel for peer:', peerId)
    // Set up the peer
    const peer: Peer = {
      id: peerId,
      userId: peerId,
      connection: pc,
      dataChannel: sendChannel, // Store the send channel
      iceCandidateQueue: []
    }
    this.peers.set(peerId, peer)
    // Set up the send channel
    this.setupDataChannel(sendChannel, peerId, 'send')
    // Set up receive channel handler
    pc.ondatachannel = (event) => {
      console.log('📥 Received data channel from peer:', peerId)
      peer.receiveChannel = event.channel
      this.setupDataChannel(event.channel, peerId, 'receive')
    }
    // --- OFFER CREATION AND SENDING ---
    try {
      const offer = await pc.createOffer()
      console.log('📤 Created offer for peer:', peerId)
      await pc.setLocalDescription(offer)
      console.log('📤 Set local description')
      // Check Supabase channel state
      console.log('📡 Supabase channel state:', this.channel?.state)
      // Send the offer
      console.log('📤 Sending offer via Supabase')
      await this.channel.send({
        type: 'broadcast',
        event: 'rtc-signal',
        payload: {
          type: 'offer',
          from: this.userId,
          to: peerId,
          offer: pc.localDescription
        }
      })
      console.log('📤 Offer sent via Supabase')
    } catch (err) {
      console.error('❌ Error during offer creation/sending:', err)
    }
  }

  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string, direction: 'send' | 'receive') {
    console.log(`📡 Setting up ${direction} channel for peer:`, peerId, {
      label: dataChannel.label,
      id: dataChannel.id,
      readyState: dataChannel.readyState,
      timestamp: new Date().toISOString()
    })
    
    dataChannel.onopen = () => {
      console.log(`✅ ${direction.toUpperCase()} channel opened for peer:`, peerId)
      // Send initial info request
      if (direction === 'send' && dataChannel.readyState === 'open') {
        setTimeout(() => {
          console.log('📡 Sending request-info')
          dataChannel.send(JSON.stringify({
            type: 'request-info',
            from: this.userId
          }))
        }, 100)
      }
      // Detect stuck channels
      setTimeout(() => {
        if (dataChannel.readyState === 'connecting') {
          console.error('❌ Channel stuck for:', peerId)
          // Optionally retry or log the error
        }
      }, 5000)
    }
    
    dataChannel.onmessage = (event) => {
      console.log(`📥 MESSAGE RECEIVED on ${direction} channel from`, peerId, ':', {
        dataLength: event.data?.length,
        preview: event.data?.substring(0, 100),
        channelLabel: dataChannel.label,
        channelId: dataChannel.id,
        timestamp: new Date().toISOString()
      })
      
      try {
        const data = JSON.parse(event.data)
        
        // Handle info exchange
        if (data.type === 'request-info' && direction === 'receive') {
          // Reply on our SEND channel
          const peer = this.peers.get(peerId)
          if (peer?.dataChannel?.readyState === 'open') {
            console.log('📡 Sending user info to peer:', peerId)
            peer.dataChannel.send(JSON.stringify({
              type: 'user-info',
              userId: this.userId,
              nickname: this.nickname,
              avatarColor: this.avatarColor
            }))
          }
        }
        
        // Handle chunks
        if (data.type === 'chunk') {
          const { messageId, chunkIndex, totalChunks, data: chunkData } = data
          
          if (!this.incomingChunks.has(messageId)) {
            this.incomingChunks.set(messageId, {
              chunks: new Array(totalChunks),
              received: 0,
              total: totalChunks
            })
          }
          
          const chunkInfo = this.incomingChunks.get(messageId)!
          chunkInfo.chunks[chunkIndex] = chunkData
          chunkInfo.received++
          
          console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} received for message ${messageId}`)
          
          if (chunkInfo.received === chunkInfo.total) {
            // Reassemble
            const fullMessage = chunkInfo.chunks.join('')
            const reassembledData = JSON.parse(fullMessage)
            this.incomingChunks.delete(messageId)
            
            console.log('✅ Message reassembled:', {
              type: reassembledData.type,
              messageId,
              totalSize: fullMessage.length,
              from: peerId
            })
            
            // Process the full message
            this.onMessage(reassembledData)
          }
        } else {
          // Normal message
          console.log('📨 PARSED MESSAGE:', {
            type: data.type,
            from: peerId,
            direction,
            dataSize: JSON.stringify(data).length,
            channelLabel: dataChannel.label,
            timestamp: new Date().toISOString()
          })
          
          // Notify message handler
          console.log('🔄 Calling onMessage handler with message type:', data.type)
          this.onMessage(data)
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error, 'raw data:', event.data)
      }
    }

    dataChannel.onclose = () => {
      console.log(`🔴 ${direction.toUpperCase()} channel closed for peer:`, peerId, {
        label: dataChannel.label,
        id: dataChannel.id,
        timestamp: new Date().toISOString()
      })
    }

    dataChannel.onerror = (error) => {
      // Improved error handling to prevent console spam
      const errorInfo = {
        type: error?.type || 'unknown',
        error: error?.error || null,
        errorDetail: error?.error?.errorDetail || 'No error detail available'
      }
      
      console.warn(`🔴 ${direction.toUpperCase()} channel error for peer:`, peerId, {
        label: dataChannel.label,
        id: dataChannel.id,
        error: errorInfo,
        timestamp: new Date().toISOString()
      })
      
      // Only show toast for actual errors, not normal disconnections
      if (errorInfo.type !== 'close') {
        toast.error('Connection error occurred')
      }
    }
  }

  private disconnectPeer(peerId: string) {
    console.log('🔌 Disconnecting peer:', peerId)
    const peer = this.peers.get(peerId)
    if (peer) {
      try {
        if (peer.dataChannel) {
          console.log('📡 Closing send channel for peer:', peerId)
          peer.dataChannel.close()
        }
        if (peer.receiveChannel) {
          console.log('📡 Closing receive channel for peer:', peerId)
          peer.receiveChannel.close()
        }
        if (peer.connection) {
          console.log('🔌 Closing RTCPeerConnection for peer:', peerId)
          peer.connection.close()
        }
      } catch (error) {
        console.warn('⚠️ Error during peer cleanup:', peerId, error)
      } finally {
        this.peers.delete(peerId)
        this.onPeerLeft?.(peerId)
        console.log('✅ Peer cleanup completed:', peerId)
      }
    } else {
      console.log('⚠️ Peer not found for cleanup:', peerId)
    }
  }

  broadcast(data: any) {
    const message = JSON.stringify(data)
    const CHUNK_SIZE = 16000 // 16KB chunks
    
    console.log('🚀 BROADCAST ATTEMPT:', {
      type: data.type,
      dataSize: message.length,
      needsChunking: message.length > CHUNK_SIZE,
      timestamp: new Date().toISOString(),
      totalPeers: this.peers.size
    })
    
    let pendingPeers: string[] = []
    let sentCount = 0
    let failedCount = 0
    
    this.peers.forEach((peer, peerId) => {
      console.log('📤 Attempting to send to peer:', peerId, {
        sendChannelReady: peer.dataChannel?.readyState,
        receiveChannelReady: peer.receiveChannel?.readyState
      })
      
      // Use the SEND channel (the one we created)
      if (peer.dataChannel?.readyState === 'open') {
        try {
          // Check if message needs chunking
          if (message.length > CHUNK_SIZE) {
            const messageId = `${Date.now()}-${Math.random()}`
            const chunks = []
            
            // Split into chunks
            for (let i = 0; i < message.length; i += CHUNK_SIZE) {
              chunks.push(message.slice(i, i + CHUNK_SIZE))
            }
            
            console.log(`📦 Sending ${chunks.length} chunks to ${peerId}`)
            
            // Send each chunk
            chunks.forEach((chunk, index) => {
              const chunkMessage = JSON.stringify({
                type: 'chunk',
                messageId,
                chunkIndex: index,
                totalChunks: chunks.length,
                data: chunk
              })
              peer.dataChannel!.send(chunkMessage)
            })
          } else {
            // Small message, send normally
            peer.dataChannel.send(message)
          }
          console.log('✅ Successfully sent to peer:', peerId)
          sentCount++
        } catch (error) {
          console.error('❌ Failed to send to peer:', peerId, 'error:', error)
          failedCount++
          pendingPeers.push(peerId)
        }
      } else {
        console.log('⏳ Peer send channel not ready:', peerId, 'readyState:', peer.dataChannel?.readyState)
        pendingPeers.push(peerId)
        failedCount++
      }
    })
    
    console.log('📊 Broadcast summary:', {
      totalPeers: this.peers.size,
      sentCount,
      failedCount,
      pendingPeers
    })
    
    // Retry for pending peers after delay
    if (pendingPeers.length > 0) {
      console.log('🔄 Scheduling retry for pending peers:', pendingPeers)
      setTimeout(() => {
        console.log('🔄 Executing retry for peers:', pendingPeers)
        pendingPeers.forEach(peerId => {
          const peer = this.peers.get(peerId)
          if (peer?.dataChannel?.readyState === 'open') {
            try {
              if (message.length > CHUNK_SIZE) {
                // Retry chunked message
                const messageId = `${Date.now()}-${Math.random()}`
                const chunks = []
                for (let i = 0; i < message.length; i += CHUNK_SIZE) {
                  chunks.push(message.slice(i, i + CHUNK_SIZE))
                }
                chunks.forEach((chunk, index) => {
                  const chunkMessage = JSON.stringify({
                    type: 'chunk',
                    messageId,
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    data: chunk
                  })
                  peer.dataChannel!.send(chunkMessage)
                })
              } else {
                peer.dataChannel.send(message)
              }
              console.log('✅ Retry successful for peer:', peerId)
            } catch (error) {
              console.error('❌ Retry failed for peer:', peerId, 'error:', error)
            }
          } else {
            console.log('⏳ Peer still not ready for retry:', peerId, 'readyState:', peer?.dataChannel?.readyState)
          }
        })
      }, 1000)
    }
  }

  sendTo(targetUserId: string, data: any) {
    const peer = this.peers.get(targetUserId)
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data))
    } else {
      console.error('Send channel not ready:', peer?.dataChannel?.readyState)
    }
  }

  disconnect() {
    this.peers.forEach((peer, peerId) => {
      this.disconnectPeer(peerId)
    })
    this.channel?.unsubscribe()
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values())
  }
} 