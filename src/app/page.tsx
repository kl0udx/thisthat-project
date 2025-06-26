import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BoltBadge } from '@/components/ui/bolt-badge'
import { PlayCircle } from 'lucide-react'

export default function Home() {
  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-24 relative"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}
    >
      {/* Browse Gallery Button - Top Right Corner */}
      <div className="absolute top-6 right-6">
        <Link href="/gallery">
          <Button 
            className="bg-[#de2c97] hover:bg-[#c92587] text-white" 
            size="lg"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Browse Gallery
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-2xl space-y-12 text-center">
        {/* Hero Section */}
        <div className="space-y-6">
          {/* Logo container - centered above title */}
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="ThisThat Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          {/* Updated main tagline - larger and without ThisThat heading */}
          <h1 className="text-7xl font-bold mb-10">
            Draw, Build, Create <span className="text-[#2d63d8]">This</span> or <span className="text-[#de2c97]">That</span> Together
          </h1>
          {/* Updated subtitle */}
          <p className="text-2xl text-[#323783] mb-16">
            The first distributed AI collaboration tool.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto mb-32">
          <Link href="/create" className="flex-1">
            <Button 
              className="w-full h-16 text-lg bg-[#323783] text-white hover:bg-[#2a2f6e]" 
              size="lg"
            >
              Create Room
            </Button>
          </Link>
          <Link href="/join" className="flex-1">
            <Button 
              variant="outline" 
              className="w-full h-16 text-lg border-[#2d63d8] border-2" 
              size="lg"
            >
              Join Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 mb-16">
        
        {/* Distributed AI Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-xl font-semibold">Distributed AI</h3>
            <p className="text-gray-600">
              Share AI powers, not API keys. One person adds Claude, everyone gets Claude.
            </p>
          </div>
        </Card>

        {/* Context Selection Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-xl font-semibold">Context Selection</h3>
            <p className="text-gray-600">
              Select any object or AI response, then ask AI to iterate on just that part.
            </p>
          </div>
        </Card>

        {/* Live Collaboration Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="text-xl font-semibold">Live Collaboration</h3>
            <p className="text-gray-600">
              See team cursors moving in real-time. Chat while you create. True multiplayer workspace.
            </p>
          </div>
        </Card>

        {/* Smart AI Cards */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">🎨</div>
            <h3 className="text-xl font-semibold">Smart AI Cards</h3>
            <p className="text-gray-600">
              AI responses become draggable cards on your canvas. Organize ideas visually.
            </p>
          </div>
        </Card>

        {/* Infinite Canvas Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">✏️</div>
            <h3 className="text-xl font-semibold">Infinite Canvas</h3>
            <p className="text-gray-600">
              25,000 x 25,000 pixels of creative space. Your ideas have room to grow.
            </p>
          </div>
        </Card>

        {/* Coming Soon Card */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-dashed">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl mb-2">🚀</div>
            <h3 className="text-xl font-semibold">More Features Coming Soon!</h3>
            <p className="text-gray-600">
              Voice chat, mobile apps, canvas export, and more on the way.
            </p>
          </div>
        </Card>
        
      </div>
      
      <BoltBadge size="large" />
    </main>
  )
}
