# Bidirectional WebRTC Data Channel Fix - Test Plan

## What Was Fixed

The critical issue was that WebRTC creates **TWO data channels** per peer connection:
1. **Send Channel**: The channel YOU create to send messages
2. **Receive Channel**: The channel YOU receive from the other peer

Previously, we were only setting up message handlers on the send channel, which meant:
- ✅ Messages could be **sent** (send channel worked)
- ❌ Messages could **not be received** (receive channel had no handlers)

## The Complete Fix

### 1. Updated Peer Interface
```typescript
interface Peer {
  dataChannel?: RTCDataChannel    // Channel we SEND on (the one we created)
  receiveChannel?: RTCDataChannel // Channel we RECEIVE on (the one we received)
  // ... other fields
}
```

### 2. Proper Channel Setup
- **Send Channel**: Created with `pc.createDataChannel()` and stored in `peer.dataChannel`
- **Receive Channel**: Received via `pc.ondatachannel` and stored in `peer.receiveChannel`
- **Message Handlers**: Set up on BOTH channels with direction tracking

### 3. Enhanced Logging
- 🔵 **CREATED SEND CHANNEL**: When we create our outgoing channel
- 🟢 **RECEIVED CHANNEL**: When we receive an incoming channel
- 📥 **MESSAGE RECEIVED on [direction] channel**: Shows which channel received the message

## Test Steps

### 1. Open Two Browser Windows
```
http://localhost:3000/room/TEST123
```

### 2. Check Connection Logs
Look for these logs in both browsers:

**Browser A (Initiator):**
```
🔌 Connecting to peer with their actual userId: [peer-id]
🔵 CREATED SEND CHANNEL for peer: [peer-id]
🟢 RECEIVED CHANNEL from peer: [peer-id]
✅ SEND channel opened for peer: [peer-id]
✅ RECEIVE channel opened for peer: [peer-id]
```

**Browser B (Responder):**
```
🟢 RECEIVED CHANNEL (OFFER): [details]
🔵 CREATED SEND CHANNEL for peer: [peer-id]
✅ SEND channel opened for peer: [peer-id]
✅ RECEIVE channel opened for peer: [peer-id]
```

### 3. Test Message Flow
1. **Send a message** from Browser A
2. **Look for these logs**:

**Browser A (Sender):**
```
🚀 BROADCAST ATTEMPT: [details]
📤 Attempting to send to peer: [peer-id] { sendChannelReady: 'open', receiveChannelReady: 'open' }
✅ Successfully sent to peer: [peer-id]
```

**Browser B (Receiver):**
```
📥 MESSAGE RECEIVED on receive channel from [peer-id]: [details]
📨 PARSED MESSAGE: { type: [message-type], from: [peer-id], direction: 'receive' }
🔄 Calling onMessage handler with message type: [message-type]
```

### 4. Test AI Response Broadcasting
1. Open AI provider modal in Browser A
2. Send a message to an AI provider
3. Look for the AI response to appear in Browser B

### 5. Test Canvas Object Syncing
1. Add a shape or image to the canvas in Browser A
2. Verify it appears in Browser B
3. Move/resize objects and verify they sync

### 6. Test Large Message Chunking
1. Paste a large image or send a very long AI response
2. Look for chunking logs:

**Sender:**
```
📦 Sending X chunks to [peer-id]
```

**Receiver:**
```
📦 Chunk 1/X received for message [message-id]
📦 Chunk 2/X received for message [message-id]
...
✅ Message reassembled: [details]
```

## Expected Results

### ✅ Before Fix
- Messages sent but never received
- No "MESSAGE RECEIVED" logs
- AI responses only appeared locally
- Canvas objects didn't sync

### ✅ After Fix
- Messages sent AND received properly
- Clear "MESSAGE RECEIVED on receive channel" logs
- AI responses appear on all connected browsers
- Canvas objects sync between browsers
- Large messages are chunked and reassembled

## Debug Commands

In browser console:
```javascript
// Check peer connections and channels
window.p2pConnection?.getPeers().forEach(peer => {
  console.log(`Peer ${peer.id}:`, {
    sendChannel: peer.dataChannel?.readyState,
    receiveChannel: peer.receiveChannel?.readyState,
    connection: peer.connection?.connectionState
  })
})

// Test broadcast
window.p2pConnection?.broadcast({
  type: 'test',
  message: 'Hello from browser!',
  timestamp: Date.now()
})
```

## Key Indicators of Success

1. **Both channels are 'open'** for each peer
2. **"MESSAGE RECEIVED on receive channel"** logs appear
3. **Messages flow in both directions**
4. **AI responses and canvas objects sync properly**

## If Issues Persist

Check for:
- ICE connection failures
- Channel state issues (should be 'open')
- Network/firewall blocking WebRTC
- Browser WebRTC permissions

The key insight: **You must listen for messages on the channel you RECEIVE, not the one you CREATE.** 