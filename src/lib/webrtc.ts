import { supabase } from './supabase'
import { toast } from 'sonner'

interface Peer {
  id: string
  userId: string
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
    this.roomId = roomId
    this.userId = userId
    this.onMessage = onMessage
    this.onPeerJoined = onPeerJoined
    this.onPeerLeft = onPeerLeft
  }

  async connect() {
    // Create signaling channel
    this.channel = supabase.channel(this.roomId, {
      config: {
        broadcast: { self: true }
      }
    })

    // Handle presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = this.channel.presenceState()
        const peers = Object.keys(presenceState)
        
        // Remove peers that left
        this.peers.forEach((peer, peerId) => {
          if (!peers.includes(peerId)) {
            this.disconnectPeer(peerId)
          }
        })

        // Connect to new peers
        peers.forEach(peerId => {
          if (peerId !== this.userId && !this.peers.has(peerId)) {
            this.connectToPeer(peerId)
          }
        })
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({ userId: this.userId })
        }
      })

    // Handle WebRTC signaling
    this.channel
      .on('broadcast', { event: 'offer' }, async ({ payload }: { payload: any }) => {
        if (payload.targetId === this.userId) {
          const peer = this.peers.get(payload.fromId)
          if (peer?.connection) {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.offer))
            const answer = await peer.connection.createAnswer()
            await peer.connection.setLocalDescription(answer)
            this.channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                fromId: this.userId,
                targetId: payload.fromId,
                answer
              }
            })
          }
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: any }) => {
        if (payload.targetId === this.userId) {
          const peer = this.peers.get(payload.fromId)
          if (peer?.connection) {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.answer))
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: { payload: any }) => {
        if (payload.targetId === this.userId) {
          const peer = this.peers.get(payload.fromId)
          if (peer?.connection) {
            await peer.connection.addIceCandidate(new RTCIceCandidate(payload.candidate))
          }
        }
      })
  }

  private async connectToPeer(peerId: string) {
    const peer: Peer = {
      id: peerId,
      userId: peerId,
      connection: new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
    }

    // Set up data channel
    peer.dataChannel = peer.connection.createDataChannel('data')
    this.setupDataChannel(peer.dataChannel)

    // Handle ICE candidates
    peer.connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            fromId: this.userId,
            targetId: peerId,
            candidate: event.candidate
          }
        })
      }
    }

    // Create and send offer
    const offer = await peer.connection.createOffer()
    await peer.connection.setLocalDescription(offer)
    this.channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        fromId: this.userId,
        targetId: peerId,
        offer
      }
    })

    this.peers.set(peerId, peer)
    this.onPeerJoined?.(peer)
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.onMessage(data)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }

    channel.onopen = () => {
      console.log('Data channel opened')
    }

    channel.onclose = () => {
      console.log('Data channel closed')
    }

    channel.onerror = (error) => {
      console.error('Data channel error:', error)
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

  disconnect() {
    this.peers.forEach((peer, peerId) => {
      this.disconnectPeer(peerId)
    })
    this.channel?.unsubscribe()
  }
} 