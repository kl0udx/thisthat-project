# WebRTC Message Reception Fix - Test Plan

## What Was Fixed

The critical issue was that WebRTC data channels were only set up for **outgoing** connections, but not for **incoming** connections. This meant:

- ✅ Messages could be **sent** (outgoing channels worked)
- ❌ Messages could **not be received** (incoming channels had no message handlers)

## The Fix Applied

1. **Enhanced `ondatachannel` handler**: Now properly sets up message reception on incoming data channels
2. **Added peerId tracking**: Messages now show which peer they came from
3. **Improved logging**: Better visibility into message flow

## Test Steps

### 1. Open Two Browser Windows
- Open `http://localhost:3000/room/TEST123` in two different browser windows
- Or use two different browsers (Chrome + Firefox)

### 2. Check Connection Logs
Look for these logs in both browsers:

**Browser A (Initiator):**
```
🔌 Connecting to peer with their actual userId: [peer-id]
🔴 DATACHANNEL CREATED (CONNECT): [details]
🔴 ONDATACHANNEL EVENT from peer: [peer-id]
🔴 Stored received channel for peer: [peer-id]
✅ DataChannel OPENED with peer: [peer-id]
```

**Browser B (Receiver):**
```
🔴 ONDATACHANNEL EVENT from peer: [peer-id]
🔴 Stored received channel for peer: [peer-id]
✅ DataChannel OPENED with peer: [peer-id]
```

### 3. Test AI Response Broadcasting
1. In Browser A, open the AI provider modal and send a message
2. Look for these logs:

**Browser A (Sender):**
```
🚀 BROADCAST ATTEMPT: [details]
📤 Attempting to send to peer: [peer-id]
✅ Successfully sent to peer: [peer-id]
```

**Browser B (Receiver):**
```
📥 MESSAGE RECEIVED from [peer-id]: [details]
📨 PARSED MESSAGE: [details]
🔄 Calling onMessage handler with message type: ai-response
```

### 4. Test Canvas Object Syncing
1. In Browser A, add a shape or image to the canvas
2. Look for similar broadcast/receive logs
3. The object should appear in Browser B

### 5. Test Large Message Chunking
1. In Browser A, paste a large image or send a very long AI response
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

✅ **Before Fix**: Messages sent but never received
✅ **After Fix**: Messages sent AND received properly

## Key Indicators of Success

1. **"ONDATACHANNEL EVENT" logs** appear in both browsers
2. **"MESSAGE RECEIVED" logs** appear when messages are sent
3. **AI responses appear** on all connected browsers
4. **Canvas objects sync** between browsers
5. **Large messages are chunked and reassembled** correctly

## If Issues Persist

Check for:
- ICE connection failures (look for "ICE connection failed" logs)
- Data channel state issues (should be "open")
- Network/firewall blocking WebRTC traffic
- Browser WebRTC permissions

## Debug Commands

In browser console, you can check:
```javascript
// Check peer connections
window.p2pConnection?.getPeers()

// Check data channel states
window.p2pConnection?.peers.forEach((peer, id) => {
  console.log(`Peer ${id}:`, peer.dataChannel?.readyState)
})
``` 