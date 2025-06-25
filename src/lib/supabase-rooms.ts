import { supabase } from './supabase'

export interface RoomSession {
  room_code: string
  created_at: string
  timer_started_at: string | null
  time_remaining_seconds: number
  is_readonly: boolean
  is_active: boolean
  host_user_id: string
  user_count: number
  total_time_added: number
  payment_count: number
}

// Create new room session when room is created
export async function createRoomSession(roomCode: string, hostUserId: string) {
  const { data, error } = await supabase
    .from('room_sessions')
    .insert({
      room_code: roomCode,
      host_user_id: hostUserId,
      time_remaining_seconds: 3600, // 1 hour default
    })
    .select()
    .single()

  if (error) console.error('Error creating room session:', error)
  return { data, error }
}

// Get existing room session
export async function getRoomSession(roomCode: string): Promise<{ data: RoomSession | null, error: any }> {
  const { data, error } = await supabase
    .from('room_sessions')
    .select('*')
    .eq('room_code', roomCode)
    .maybeSingle()

  if (error) {
    console.error('Error fetching room session:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Start timer when 2nd person joins
export async function startRoomTimer(roomCode: string) {
  const { data, error } = await supabase
    .from('room_sessions')
    .update({
      timer_started_at: new Date().toISOString(),
      user_count: 2
    })
    .eq('room_code', roomCode)
    .select()
    .single()

  if (error) console.error('Error starting timer:', error)
  return { data, error }
}

// Add time from payment
export async function addTimeToRoom(roomCode: string, secondsToAdd: number) {
  // First get current time
  const { data: current } = await getRoomSession(roomCode)
  if (!current) return { data: null, error: 'Room not found' }

  const newTime = current.time_remaining_seconds + secondsToAdd

  const { data, error } = await supabase
    .from('room_sessions')
    .update({
      time_remaining_seconds: newTime,
      total_time_added: (current.total_time_added || 0) + secondsToAdd,
      payment_count: (current.payment_count || 0) + 1,
      last_activity: new Date().toISOString()
    })
    .eq('room_code', roomCode)
    .select()
    .single()

  if (error) console.error('Error adding time:', error)
  return { data, error }
}

// Update timer periodically (called by host)
export async function updateRoomTimer(roomCode: string, remainingSeconds: number) {
  const { data, error } = await supabase
    .from('room_sessions')
    .update({
      time_remaining_seconds: Math.max(0, remainingSeconds),
      is_readonly: remainingSeconds <= 0,
      last_activity: new Date().toISOString()
    })
    .eq('room_code', roomCode)

  return { data, error }
}

// Subscribe to room changes (for real-time updates)
export function subscribeToRoomSession(roomCode: string, callback: (session: RoomSession) => void) {
  const channel = supabase
    .channel(`room-session-${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_sessions',
        filter: `room_code=eq.${roomCode}`
      },
      (payload) => {
        callback(payload.new as RoomSession)
      }
    )
    .subscribe()

  return channel
} 