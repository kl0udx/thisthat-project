import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BoltBadge } from '@/components/ui/bolt-badge'
import { PlayCircle } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-2xl space-y-12 text-center">
        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            ThisThat
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Real-time AI collaboration with ChatGPT, Claude, and Gemini. 
            Create, share, and build together in a seamless P2P environment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
          <Link href="/create" className="flex-1">
            <Button className="w-full h-16 text-lg" size="lg">
              Create Room
            </Button>
          </Link>
          <Link href="/join" className="flex-1">
            <Button variant="outline" className="w-full h-16 text-lg" size="lg">
              Join Room
            </Button>
          </Link>
        </div>

        {/* Gallery Link */}
        <div className="flex justify-center">
          <Link href="/gallery">
            <Button variant="outline" size="lg">
              <PlayCircle className="mr-2 h-4 w-4" />
              Browse Gallery
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">🤖 Multi-AI Support</h3>
            <p>ChatGPT, Claude, and Gemini all in one place</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">🔗 P2P Connection</h3>
            <p>Direct peer-to-peer, no server storage</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">⚡ Real-time</h3>
            <p>Instant collaboration with live updates</p>
          </div>
        </div>
      </div>
      
      <BoltBadge size="large" />
    </main>
  )
}
