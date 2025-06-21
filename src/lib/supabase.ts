import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase credentials
const supabaseUrl = 'https://lhhcekxyambgxdpjosrz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaGNla3h5YW1iZ3hkcGpvc3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NzQyNjUsImV4cCI6MjA2NTU1MDI2NX0.nTY-fTWvyzolEj6Am_VyfbAJzu5vEM8feAiMd59FYFk';

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