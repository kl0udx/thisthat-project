import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { REALTIME_CHANNEL_STATES } from '@supabase/supabase-js'

interface PeerConnection {
  pc: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  userId: string
  nickname: string
}

export class P2PConnection {
  private _roomCode: string
  private userId: string
  private nickname: string
  private channel: RealtimeChannel | null = null
  private peers: Map<string, PeerConnection> = new Map()
  private messageHandlers: Set<(data: any) => void> = new Set()
  private isConnected: boolean = false
  
  constructor(roomCode: string, userId: string, nickname: string) {
    this._roomCode = roomCode
    this.userId = userId
    this.nickname = nickname
  }

  async connect() {
    // Always start fresh
    if (this.channel) {
      await this.cleanup()
    }

    console.log('Connecting to room:', this._roomCode)
    
    try {
      // Create a new channel with unique name
      const channelName = `room:${this._roomCode}:${Date.now()}`
      this.channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: this.userId
          }
        }
      })
      
      // Set up handlers
      this.channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          this.handleSignal(payload)
        })
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel!.presenceState()
          this.handlePresenceSync(state)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', newPresences)
          if (newPresences && newPresences.length > 0) {
            this.handleUserJoined(key, newPresences[0])
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('User left:', key)
          this.handleUserLeft(key)
        })
      
      // Subscribe
      await this.channel.subscribe()
      
      // Wait for subscription to be ready
      await new Promise((resolve) => {
        const checkSubscription = setInterval(() => {
          if (this.channel?.state === REALTIME_CHANNEL_STATES.SUBSCRIBED) {
            clearInterval(checkSubscription)
            resolve(true)
          }
        }, 100)
      })
      
      // Track presence
      await this.channel.track({
        userId: this.userId,
        nickname: this.nickname,
        joinedAt: new Date().toISOString()
      })
      
      this.isConnected = true
      console.log('Connected successfully')
    } catch (error) {
      console.error('Failed to connect:', error)
      await this.cleanup()
      throw error
    }
  }

  private async cleanup() {
    if (this.channel) {
      try {
        if (this.channel.state === REALTIME_CHANNEL_STATES.SUBSCRIBED) {
          await this.channel.untrack()
        }
        await this.channel.unsubscribe()
        this.channel = null
      } catch (error) {
        console.error('Cleanup error:', error)
        // Force cleanup
        this.channel = null
      }
    }
  }

  async disconnect() {
    console.log('Disconnecting...')
    
    // Close all peer connections
    this.peers.forEach(peer => {
      try {
        peer.dataChannel?.close()
        peer.pc.close()
      } catch (e) {
        console.error('Error closing peer connection:', e)
      }
    })
    this.peers.clear()
    
    // Clean up channel
    await this.cleanup()
    
    this.isConnected = false
    this.messageHandlers.clear()
  }

  // Update the room code getter
  get roomCode() {
    return this._roomCode
  }

  private async handlePresenceSync(state: any) {
    // Connect to all existing peers
    Object.entries(state).forEach(([key, presences]: [string, any]) => {
      if (Array.isArray(presences) && presences.length > 0) {
        const presence = presences[0]
        if (presence.userId !== this.userId && !this.peers.has(presence.userId)) {
          this.createPeerConnection(presence.userId, presence.nickname, true)
        }
      }
    })
  }

  private async handleUserJoined(key: string, presence: any) {
    if (presence && presence.userId !== this.userId && !this.peers.has(presence.userId)) {
      this.createPeerConnection(presence.userId, presence.nickname, true)
    }
  }

  private handleUserLeft(key: string) {
    // Remove peer by key
    this.peers.forEach((peer, userId) => {
      if (key === userId) {
        this.removePeerConnection(userId)
      }
    })
  }

  private removePeerConnection(userId: string) {
    const peer = this.peers.get(userId)
    if (peer) {
      try {
        peer.dataChannel?.close()
        peer.pc.close()
      } catch (e) {
        console.error('Error closing peer connection:', e)
      }
      this.peers.delete(userId)
    }
  }

  private createPeerConnection(peerId: string, nickname: string, isPresence: boolean): PeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    })

    const dataChannel = pc.createDataChannel('chat', {
      ordered: true
    })

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.messageHandlers.forEach(handler => handler(data))
      } catch (e) {
        console.error('Error parsing message:', e)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate
        })
      }
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.messageHandlers.forEach(handler => handler(data))
        } catch (e) {
          console.error('Error parsing message:', e)
        }
      }
    }

    const peer: PeerConnection = {
      pc,
      dataChannel,
      userId: peerId,
      nickname
    }

    this.peers.set(peerId, peer)

    if (isPresence) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          this.sendSignal(peerId, {
            type: 'offer',
            sdp: pc.localDescription
          })
        })
        .catch(error => {
          console.error('Error creating offer:', error)
        })
    }

    return peer
  }

  private sendSignal(peerId: string, signal: any) {
    if (!this.channel) return

    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        from: this.userId,
        to: peerId,
        signal
      }
    })
  }

  private handleSignal(payload: any) {
    const { from, to, signal } = payload

    if (to !== this.userId) return

    let peer = this.peers.get(from)
    if (!peer) {
      peer = this.createPeerConnection(from, '', false)
    }

    const pc = peer.pc

    if (signal.type === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          this.sendSignal(from, {
            type: 'answer',
            sdp: pc.localDescription
          })
        })
        .catch(error => {
          console.error('Error handling offer:', error)
        })
    } else if (signal.type === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .catch(error => {
          console.error('Error handling answer:', error)
        })
    } else if (signal.type === 'candidate') {
      pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        .catch(error => {
          console.error('Error adding ICE candidate:', error)
        })
    }
  }

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  broadcast(data: any) {
    this.peers.forEach(peer => {
      if (peer.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(data))
      }
    })
  }

  sendTo(peerId: string, data: any) {
    const peer = this.peers.get(peerId)
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data))
    }
  }

  getPeers() {
    return Array.from(this.peers.values()).map(peer => ({
      userId: peer.userId,
      nickname: peer.nickname
    }))
  }
} 