import { supabase } from './supabase'

// Types for our tables
export interface Message {
  id: string
  room_code: string
  user_id: string
  nickname: string
  content: string
  is_ai_request: boolean
  ai_provider?: string
  created_at: string
}

export interface AIRequest {
  id: string
  room_code: string
  message_id?: string
  provider: string
  prompt: string
  context?: any
  requested_by_user_id: string
  requested_by_nickname: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export interface AIResponse {
  id: string
  room_code: string
  request_id: string
  provider: string
  content: string
  executed_by_user_id: string
  executed_by_nickname: string
  created_at: string
}

export interface CanvasObject {
  id: string
  room_code: string
  type: 'ai-response' | 'image' | 'shape'
  content: any
  position: { x: number; y: number }
  size: { width: number; height: number }
  created_by_user_id: string
  created_by_nickname: string
  created_at: string
  updated_at: string
}

// Presence types
export interface RoomPresence {
  user_id: string
  nickname: string
  avatar_color: string
  joined_at: string
}

// Message functions
export async function sendMessage(message: Omit<Message, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getMessages(roomCode: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

// AI Request functions
export async function createAIRequest(request: Omit<AIRequest, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('ai_requests')
    .insert(request)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateAIRequestStatus(requestId: string, status: AIRequest['status']) {
  const { error } = await supabase
    .from('ai_requests')
    .update({ status })
    .eq('id', requestId)
  
  if (error) throw error
}

// AI Response functions
export async function createAIResponse(response: Omit<AIResponse, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('ai_responses')
    .insert(response)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Canvas Object functions
export async function createCanvasObject(object: Omit<CanvasObject, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('canvas_objects')
    .insert(object)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateCanvasObject(id: string, updates: Partial<CanvasObject>) {
  const { error } = await supabase
    .from('canvas_objects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteCanvasObject(id: string) {
  const { error } = await supabase
    .from('canvas_objects')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getCanvasObjects(roomCode: string) {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

// Room session functions (for timer)
export async function getRoomSession(roomCode: string) {
  const { data, error } = await supabase
    .from('room_sessions')
    .select('*')
    .eq('room_code', roomCode)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // Ignore not found
  return data
}

export async function createRoomSession(roomCode: string, hostUserId: string) {
  const { data, error } = await supabase
    .from('room_sessions')
    .insert({
      room_code: roomCode,
      host_user_id: hostUserId
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateRoomTimer(roomCode: string, secondsToAdd: number) {
  // Fetch current values
  const { data: session, error: fetchError } = await supabase
    .from('room_sessions')
    .select('time_remaining_seconds, total_time_added')
    .eq('room_code', roomCode)
    .single()

  if (fetchError) throw fetchError

  const newTimeRemaining = (session?.time_remaining_seconds || 0) + secondsToAdd
  const newTotalTimeAdded = (session?.total_time_added || 0) + secondsToAdd

  const { error } = await supabase
    .from('room_sessions')
    .update({ 
      time_remaining_seconds: newTimeRemaining,
      total_time_added: newTotalTimeAdded
    })
    .eq('room_code', roomCode)
  
  if (error) throw error
}

// Create presence channel for a room
export function createPresenceChannel(roomCode: string) {
  return supabase.channel(`presence:${roomCode}`)
}

// Get all online users from presence state
export function getOnlineUsers(channel: any): RoomPresence[] {
  const presence = channel.presenceState()
  return Object.values(presence).flat().map((user: any) => ({
    user_id: user.user_id,
    nickname: user.nickname,
    avatar_color: user.avatar_color,
    joined_at: user.joined_at
  }))
}

// Gallery functions
export async function checkRoomSharedToGallery(roomCode: string) {
  const { data, error } = await supabase
    .from('room_sessions')
    .select('shared_to_gallery')
    .eq('room_code', roomCode)
    .single()
  
  if (error) {
    console.error('Error checking gallery status:', error)
    return false
  }
  
  return data?.shared_to_gallery || false
}

export async function uploadRecordingToStorage(
  roomCode: string,
  videoBlob: Blob,
  userId: string
) {
  const fileName = `${roomCode}/${userId}-${Date.now()}.webm`
  
  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(fileName, videoBlob, {
      contentType: 'video/webm',
      upsert: false
    })
  
  if (error) throw error
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('recordings')
    .getPublicUrl(fileName)
  
  return publicUrl
}

export async function createGalleryEntry(entry: {
  room_code: string
  title?: string
  description?: string
  video_url: string
  duration_seconds?: number
  created_by_user_id: string
  created_by_nickname: string
}) {
  const { data, error } = await supabase
    .from('gallery')
    .insert(entry)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function addBonusTimeToRoom(roomCode: string, bonusMinutes: number = 10) {
  // First get current time remaining
  const { data: session, error: fetchError } = await supabase
    .from('room_sessions')
    .select('time_remaining_seconds')
    .eq('room_code', roomCode)
    .single()

  if (fetchError) throw fetchError

  const newTimeRemaining = (session?.time_remaining_seconds || 0) + (bonusMinutes * 60)

  // Add bonus time and mark as shared
  const { error } = await supabase
    .from('room_sessions')
    .update({
      time_remaining_seconds: newTimeRemaining,
      shared_to_gallery: true,
      gallery_bonus_applied_at: new Date().toISOString()
    })
    .eq('room_code', roomCode)
  
  if (error) throw error
}

// Gallery functions
export async function getGalleryVideos(
  filter: 'recent' | 'popular' | 'featured' = 'recent',
  limit = 20
) {
  let query = supabase
    .from('gallery')
    .select('*')
    .limit(limit)
  
  switch (filter) {
    case 'recent':
      query = query.order('created_at', { ascending: false })
      break
    case 'popular':
      query = query.order('views', { ascending: false })
      break
    case 'featured':
      // For now, just show most viewed. Later you can add a featured flag
      query = query.order('views', { ascending: false }).limit(8)
      break
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching gallery videos:', error)
    return []
  }
  
  return data || []
}

export async function incrementVideoViews(videoId: string) {
  const { error } = await supabase.rpc('increment_gallery_views', {
    video_id: videoId
  })
  
  if (error) console.error('Error incrementing views:', error)
} 