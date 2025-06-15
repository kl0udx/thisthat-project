import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase credentials
const supabaseUrl = 'https://lhhcekxyambgxdpjosrz.supabase.co';
const supabaseAnonKey = 'your-anon-key';

// Comment out environment variable check for now
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error(
//     'Missing Supabase environment variables. Please check your .env.local file.'
//   );
// }

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getRoomChannel(roomCode: string): RealtimeChannel {
  return supabase.channel(`room:${roomCode}`);
} 