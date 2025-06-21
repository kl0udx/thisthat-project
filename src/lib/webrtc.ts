import { supabase } from './supabase'
import { toast } from 'sonner'

interface Peer {
  id: string
  userId: string
  nickname?: string
  avatarColor?: string
  dataChannel?: RTCDataChannel
  connection?: RTCPeerConnection
}

export class P2PConnection {
  private peers: Map<string, Peer> = new Map()
  private roomId: string
  private userId: string
  private onMessage: (data: any) => void
  private onPeerJoined?: (peer: Peer) => void
  private onPeerLeft?: (peerId: string) => void
  private channel: any // Supabase channel for signaling

  constructor(
    roomId: string,
    userId: string,
    onMessage: (data: any) => void,
    onPeerJoined?: (peer: Peer) => void,
    onPeerLeft?: (peerId: string) => void
  ) {
    console.log('🔌 WebRTC initialized with:', {
      roomId,
      userId,
      timestamp: new Date().toISOString()
    })
    this.roomId = roomId
    this.userId = userId
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
        console.log('🔍 handleSignalingMessage called with rtc-signal:', payload)
        
        // Don't process our own messages
        if (payload.from === this.userId) {
          console.log('❌ Ignoring message from self:', payload.type)
          return
        }
        
        switch (payload.type) {
          case 'offer':
            console.log('📡 Processing offer from:', payload.from, 'targeting:', payload.to)
            console.log('🔍 My userId:', this.userId, 'Target userId:', payload.to)
            
            if (payload.to === this.userId) {
              console.log('✅ Offer is for me! Processing...')
              let peer = this.peers.get(payload.from)
              
              // If we don't have a peer connection yet, create one
              if (!peer) {
                console.log('🔌 Creating peer connection for incoming offer from:', payload.from)
                peer = {
                  id: payload.from,
                  userId: payload.from,
                  connection: new RTCPeerConnection({
                    iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                  })
                }
                
                // Set up the peer connection
                peer.connection!.onconnectionstatechange = () => {
                  console.log('🔌 Connection state:', peer!.connection!.connectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.oniceconnectionstatechange = () => {
                  console.log('🧊 ICE connection state:', peer!.connection!.iceConnectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.onicegatheringstatechange = () => {
                  console.log('🧊 ICE gathering state:', peer!.connection!.iceGatheringState, 'for peer:', payload.from)
                }
                
                // Handle incoming data channels
                peer.connection!.ondatachannel = (event) => {
                  console.log('📡 Received data channel from peer:', payload.from, 'channel:', event.channel.label)
                  peer!.dataChannel = event.channel
                  this.setupDataChannel(peer!.dataChannel)
                }
                
                // Handle ICE candidates
                peer.connection!.onicecandidate = (event) => {
                  if (event.candidate) {
                    console.log('🧊 Sending ICE candidate to:', payload.from, 'candidate:', event.candidate.candidate)
                    const iceMessage = {
                      type: 'broadcast',
                      event: 'rtc-signal',
                      payload: {
                        type: 'ice-candidate',
                        from: this.userId,
                        to: payload.from,
                        candidate: event.candidate
                      }
                    }
                    console.log('📤 Broadcasting ICE candidate via Supabase:', iceMessage)
                    this.channel.send(iceMessage)
                  } else {
                    console.log('🧊 ICE candidate gathering complete for peer:', payload.from)
                  }
                }
                
                // Add peer to our map
                this.peers.set(payload.from, peer)
                this.onPeerJoined?.(peer)
                console.log('🔌 Peer added to peers map for incoming offer:', payload.from)
              }
              
              if (peer?.connection) {
                console.log('🔌 handleOffer called for peer:', payload.from)
                try {
                  console.log('📡 Setting remote description (offer) for peer:', payload.from)
                  await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.offer))
                  console.log('📡 Creating answer for peer:', payload.from)
                  const answer = await peer.connection.createAnswer()
                  console.log('📡 Setting local description (answer) for peer:', payload.from)
                  await peer.connection.setLocalDescription(answer)
                  console.log('📡 Sending answer to peer:', payload.from)
                  const answerMessage = {
                    type: 'broadcast',
                    event: 'rtc-signal',
                    payload: {
                      type: 'answer',
                      from: this.userId,
                      to: payload.from,
                      answer
                    }
                  }
                  console.log('📤 Broadcasting answer via Supabase:', answerMessage)
                  this.channel.send(answerMessage)
                  console.log('✅ Answer created and sent back!')
                } catch (error) {
                  console.error('❌ Error handling offer:', error)
                }
              } else {
                console.log('❌ No peer connection found for offer from:', payload.from)
                console.log('🔍 Available peers:', Array.from(this.peers.keys()))
              }
            } else {
              console.log('❌ Offer not for me. My ID:', this.userId, 'Target:', payload.to)
            }
            break
            
          case 'answer':
            console.log('📡 Processing answer from:', payload.from, 'targeting:', payload.to)
            console.log('🔍 My userId:', this.userId, 'Target userId:', payload.to)
            
            if (payload.to === this.userId) {
              console.log('✅ Answer is for me! Processing...')
              let peer = this.peers.get(payload.from)
              
              // If we don't have a peer connection yet, create one
              if (!peer) {
                console.log('🔌 Creating peer connection for incoming answer from:', payload.from)
                peer = {
                  id: payload.from,
                  userId: payload.from,
                  connection: new RTCPeerConnection({
                    iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                  })
                }
                
                // Set up the peer connection
                peer.connection!.onconnectionstatechange = () => {
                  console.log('🔌 Connection state:', peer!.connection!.connectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.oniceconnectionstatechange = () => {
                  console.log('🧊 ICE connection state:', peer!.connection!.iceConnectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.onicegatheringstatechange = () => {
                  console.log('🧊 ICE gathering state:', peer!.connection!.iceGatheringState, 'for peer:', payload.from)
                }
                
                // Handle incoming data channels
                peer.connection!.ondatachannel = (event) => {
                  console.log('📡 Received data channel from peer:', payload.from, 'channel:', event.channel.label)
                  peer!.dataChannel = event.channel
                  this.setupDataChannel(peer!.dataChannel)
                }
                
                // Handle ICE candidates
                peer.connection!.onicecandidate = (event) => {
                  if (event.candidate) {
                    console.log('🧊 Sending ICE candidate to:', payload.from, 'candidate:', event.candidate.candidate)
                    const iceMessage = {
                      type: 'broadcast',
                      event: 'rtc-signal',
                      payload: {
                        type: 'ice-candidate',
                        from: this.userId,
                        to: payload.from,
                        candidate: event.candidate
                      }
                    }
                    console.log('📤 Broadcasting ICE candidate via Supabase:', iceMessage)
                    this.channel.send(iceMessage)
                  } else {
                    console.log('🧊 ICE candidate gathering complete for peer:', payload.from)
                  }
                }
                
                // Add peer to our map
                this.peers.set(payload.from, peer)
                this.onPeerJoined?.(peer)
                console.log('🔌 Peer added to peers map for incoming answer:', payload.from)
              }
              
              if (peer?.connection) {
                // CHECK THE CONNECTION STATE FIRST
                const state = peer.connection.signalingState
                console.log('📡 Current signaling state:', state)
                
                if (state === 'have-local-offer') {
                  // Only set remote description if we're expecting an answer
                  try {
                    await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.answer))
                    console.log('✅ Answer processed successfully')
                  } catch (error) {
                    console.error('❌ Error setting answer:', error)
                  }
                } else {
                  console.log('⚠️ Ignoring answer - connection in wrong state:', state)
                }
              } else {
                console.log('❌ No peer connection found for answer from:', payload.from)
                console.log('🔍 Available peers:', Array.from(this.peers.keys()))
              }
            } else {
              console.log('❌ Answer not for me. My ID:', this.userId, 'Target:', payload.to)
            }
            break
            
          case 'ice-candidate':
            console.log('🧊 Received ICE candidate from:', payload.from, 'targeting:', payload.to)
            console.log('🔍 My userId:', this.userId, 'Target userId:', payload.to)
            
            if (payload.to === this.userId) {
              console.log('✅ ICE candidate is for me! Processing...')
              console.log('🧊 Processing ICE candidate from:', payload.from, 'candidate:', payload.candidate.candidate)
              let peer = this.peers.get(payload.from)
              
              // If we don't have a peer connection yet, create one
              if (!peer) {
                console.log('🔌 Creating peer connection for incoming ICE candidate from:', payload.from)
                peer = {
                  id: payload.from,
                  userId: payload.from,
                  connection: new RTCPeerConnection({
                    iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                  })
                }
                
                // Set up the peer connection
                peer.connection!.onconnectionstatechange = () => {
                  console.log('🔌 Connection state:', peer!.connection!.connectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.oniceconnectionstatechange = () => {
                  console.log('🧊 ICE connection state:', peer!.connection!.iceConnectionState, 'for peer:', payload.from)
                }
                
                peer.connection!.onicegatheringstatechange = () => {
                  console.log('🧊 ICE gathering state:', peer!.connection!.iceGatheringState, 'for peer:', payload.from)
                }
                
                // Handle incoming data channels
                peer.connection!.ondatachannel = (event) => {
                  console.log('📡 Received data channel from peer:', payload.from, 'channel:', event.channel.label)
                  peer!.dataChannel = event.channel
                  this.setupDataChannel(peer!.dataChannel)
                }
                
                // Handle ICE candidates
                peer.connection!.onicecandidate = (event) => {
                  if (event.candidate) {
                    console.log('🧊 Sending ICE candidate to:', payload.from, 'candidate:', event.candidate.candidate)
                    const iceMessage = {
                      type: 'broadcast',
                      event: 'rtc-signal',
                      payload: {
                        type: 'ice-candidate',
                        from: this.userId,
                        to: payload.from,
                        candidate: event.candidate
                      }
                    }
                    console.log('📤 Broadcasting ICE candidate via Supabase:', iceMessage)
                    this.channel.send(iceMessage)
                  } else {
                    console.log('🧊 ICE candidate gathering complete for peer:', payload.from)
                  }
                }
                
                // Add peer to our map
                this.peers.set(payload.from, peer)
                this.onPeerJoined?.(peer)
                console.log('🔌 Peer added to peers map for incoming ICE candidate:', payload.from)
              }
              
              if (peer?.connection) {
                console.log('🧊 Adding ICE candidate for peer:', payload.from)
                try {
                  await peer.connection.addIceCandidate(new RTCIceCandidate(payload.candidate))
                  console.log('✅ ICE candidate added successfully!')
                } catch (error) {
                  console.error('❌ Error adding ICE candidate:', error)
                }
              } else {
                console.log('❌ No peer connection found for ICE candidate from:', payload.from)
                console.log('🔍 Available peers:', Array.from(this.peers.keys()))
              }
            } else {
              console.log('❌ ICE candidate not for me. My ID:', this.userId, 'Target:', payload.to)
            }
            break
            
          default:
            console.log('❌ Unknown rtc-signal type:', payload.type)
        }
      })

    // Handle presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        console.log('👥 Presence sync triggered')
        const presenceState = this.channel.presenceState()
        this.handlePresenceSync(presenceState)
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
    console.log('🔌 Connecting to peer with their actual userId:', peerId)
    
    // Double-check we're not connecting to ourselves
    if (peerId === this.userId) {
      console.log('❌ Attempted to connect to self, skipping:', peerId)
      return
    }
    
    // Check if we already have a connection
    const existingPeer = this.peers.get(peerId)
    if (existingPeer?.connection) {
      const state = existingPeer.connection.connectionState
      if (state === 'connected' || state === 'connecting') {
        console.log('⚠️ Already connected/connecting to peer:', peerId, 'state:', state)
        return
      }
    }
    
    // Check if we already have a connection to this peer
    if (this.peers.has(peerId)) {
      console.log('❌ Already connected to peer, skipping:', peerId)
      return
    }
    
    // Create peer with their actual userId
    const peer: Peer = {
      id: peerId,
      userId: peerId,  // These should be the same!
      connection: new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
    }

    console.log('🔌 Created RTCPeerConnection for peer:', peerId)

    // Set up connection state monitoring
    peer.connection!.onconnectionstatechange = () => {
      console.log('🔌 Connection state changed for peer:', peerId, 'new state:', peer.connection!.connectionState)
      console.log('🔌 Signaling state:', peer.connection!.signalingState)
      console.log('🔌 ICE connection state:', peer.connection!.iceConnectionState)
    }

    peer.connection!.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed for peer:', peerId, 'new state:', peer.connection!.iceConnectionState)
    }

    peer.connection!.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state changed for peer:', peerId, 'new state:', peer.connection!.iceGatheringState)
    }

    // Handle incoming data channels
    peer.connection!.ondatachannel = (event) => {
      console.log('📡 Received data channel from peer:', peerId, 'channel:', event.channel.label)
      peer.dataChannel = event.channel
      this.setupDataChannel(peer.dataChannel)
    }

    // Set up data channel (only for outgoing connections - the initiator)
    peer.dataChannel = peer.connection!.createDataChannel('data', {
      ordered: true
    })
    console.log('📡 DataChannel created, initial state:', peer.dataChannel.readyState, 'for peer:', peerId)
    this.setupDataChannel(peer.dataChannel)

    // Handle ICE candidates
    peer.connection!.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to:', peerId, 'candidate:', event.candidate.candidate)
        const iceMessage = {
          type: 'broadcast',
          event: 'rtc-signal',
          payload: {
            type: 'ice-candidate',
            from: this.userId,
            to: peerId,
            candidate: event.candidate
          }
        }
        console.log('📤 Broadcasting ICE candidate via Supabase:', iceMessage)
        this.channel.send(iceMessage)
      } else {
        console.log('🧊 ICE candidate gathering complete for peer:', peerId)
      }
    }

    // Create and send offer
    console.log('🔌 Creating offer for peer:', peerId)
    try {
      const offer = await peer.connection!.createOffer()
      console.log('🔌 Offer created successfully:', offer.type, 'for peer:', peerId)
      console.log('🔌 Offer details:', {
        type: offer.type,
        sdp: offer.sdp?.substring(0, 100) + '...' // Log first 100 chars of SDP
      })
      
      await peer.connection!.setLocalDescription(offer)
      console.log('🔌 Local description set successfully for peer:', peerId)
      
      const offerMessage = {
        type: 'broadcast',
        event: 'rtc-signal',
        payload: {
          type: 'offer',
          from: this.userId,
          to: peerId,
          offer
        }
      }
      console.log('📤 Broadcasting offer via Supabase:', {
        type: offerMessage.type,
        event: offerMessage.event,
        from: offerMessage.payload.from,
        to: offerMessage.payload.to,
        offerType: offerMessage.payload.offer.type
      })
      this.channel.send(offerMessage)
      console.log('🔌 Offer sent via signaling for peer:', peerId)
    } catch (error) {
      console.error('❌ Error creating/sending offer for peer:', peerId, error)
    }

    this.peers.set(peerId, peer)
    this.onPeerJoined?.(peer)
    console.log('🔌 Peer added to peers map:', peerId)
  }

  private setupDataChannel(channel: RTCDataChannel) {
    console.log('📡 Setting up data channel, current state:', channel.readyState)
    
    channel.onmessage = (event) => {
      console.log('📡 Raw message received in WebRTC:', event.data)
      try {
        const data = JSON.parse(event.data)
        console.log('📡 Parsed message:', data)
        this.onMessage(data)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }

    channel.onopen = () => {
      console.log('📡 Data channel opened')
      
      // Now that channel is open, request their info
      console.log('📡 Requesting info from peer')
      channel.send(JSON.stringify({
        type: 'request-info',
        from: this.userId
      }))
    }

    channel.onclose = () => {
      console.log('📡 Data channel closed')
    }

    channel.onerror = (error) => {
      console.error('📡 Data channel error:', error)
      toast.error('Connection error occurred')
    }
  }

  private disconnectPeer(peerId: string) {
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.dataChannel?.close()
      peer.connection?.close()
      this.peers.delete(peerId)
      this.onPeerLeft?.(peerId)
    }
  }

  broadcast(data: any) {
    console.log('📡 Broadcasting message to all peers:', data)
    const message = JSON.stringify(data)
    let pendingPeers: string[] = []
    
    this.peers.forEach(peer => {
      if (peer.dataChannel?.readyState === 'open') {
        console.log('📡 Sending to peer:', peer.id)
        peer.dataChannel.send(message)
      } else {
        console.log('📡 Peer data channel not ready:', peer.id, peer.dataChannel?.readyState)
        pendingPeers.push(peer.id)
      }
    })
    
    // Retry for pending peers after delay
    if (pendingPeers.length > 0) {
      console.log('📡 Scheduling retry for pending peers:', pendingPeers)
      setTimeout(() => {
        pendingPeers.forEach(peerId => {
          const peer = this.peers.get(peerId)
          if (peer?.dataChannel?.readyState === 'open') {
            console.log('📡 Retry sending to peer:', peerId)
            peer.dataChannel.send(message)
          } else {
            console.log('📡 Peer still not ready for retry:', peerId, peer?.dataChannel?.readyState)
          }
        })
      }, 1000)
    }
  }

  sendTo(peerId: string, data: any) {
    console.log('📡 Sending message to specific peer:', peerId, data)
    const peer = this.peers.get(peerId)
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data))
    } else {
      console.log('📡 Peer data channel not ready for sendTo:', peerId, peer?.dataChannel?.readyState)
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