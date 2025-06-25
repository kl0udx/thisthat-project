'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PlayCircle, Users, Clock, Sparkles, Zap } from "lucide-react"
import { BoltBadge } from '@/components/ui/bolt-badge'
import { getGalleryVideos, incrementVideoViews } from '@/lib/supabase-hybrid'
import { formatDistanceToNow } from 'date-fns'

interface GalleryVideo {
  id: string
  room_code: string
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  duration_seconds: number
  views: number
  created_by_user_id: string
  created_by_nickname: string
  created_at: string
}

export default function GalleryPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<GalleryVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'featured'>('recent')
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null)

  useEffect(() => {
    loadVideos(activeTab)
  }, [activeTab])

  const loadVideos = async (filter: 'recent' | 'popular' | 'featured') => {
    setLoading(true)
    const data = await getGalleryVideos(filter)
    setVideos(data)
    setLoading(false)
  }

  const handleVideoClick = async (video: GalleryVideo) => {
    setSelectedVideo(video)
    await incrementVideoViews(video.id)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Live Collaborations</h1>
            <p className="text-xl text-muted-foreground">
              See what teams are building with AI
            </p>
            <Button 
              size="lg" 
              className="animate-pulse"
              onClick={() => router.push('/')}
            >
              <Zap className="mr-2 h-4 w-4" />
              Create Your Room Now
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs 
          defaultValue="recent" 
          className="w-full"
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-6">
            <GalleryGrid 
              videos={videos} 
              loading={loading} 
              onVideoClick={handleVideoClick}
              onCreateRoom={() => router.push('/')}
            />
          </TabsContent>
          
          <TabsContent value="popular" className="mt-6">
            <GalleryGrid 
              videos={videos} 
              loading={loading} 
              onVideoClick={handleVideoClick}
              onCreateRoom={() => router.push('/')}
            />
          </TabsContent>
          
          <TabsContent value="featured" className="mt-6">
            <GalleryGrid 
              videos={videos} 
              loading={loading} 
              onVideoClick={handleVideoClick}
              onCreateRoom={() => router.push('/')}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal 
        video={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onCreateRoom={() => router.push('/')}
      />

      {/* Bolt Badge */}
      <BoltBadge size="large" />
    </div>
  )
}

// Gallery Grid Component
function GalleryGrid({ 
  videos, 
  loading, 
  onVideoClick,
  onCreateRoom 
}: { 
  videos: GalleryVideo[]
  loading: boolean
  onVideoClick: (video: GalleryVideo) => void
  onCreateRoom: () => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return <EmptyState onCreateRoom={onCreateRoom} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video, index) => (
        <VideoCard 
          key={video.id} 
          video={video} 
          onClick={() => onVideoClick(video)}
        />
      ))}
      
      {/* CTA Card Every 8 Items */}
      {videos.length >= 8 && (
        <CTACard onCreateRoom={onCreateRoom} />
      )}
    </div>
  )
}

// Individual Video Card
function VideoCard({ 
  video, 
  onClick 
}: { 
  video: GalleryVideo
  onClick: () => void 
}) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Extract AI providers from description or use placeholder
  const providers = ['Claude', 'GPT-4'] // TODO: Store this in metadata
  
  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted">
        {/* Thumbnail or placeholder */}
        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20" />
        
        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <PlayCircle className="w-12 h-12 text-white" />
        </div>
        
        {/* Duration Badge */}
        <Badge className="absolute top-2 right-2 bg-black/70">
          <Clock className="w-3 h-3 mr-1" />
          {formatDuration(video.duration_seconds)}
        </Badge>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold line-clamp-2">{video.title}</h3>
        
        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{video.views} views</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span>{providers.join(", ")}</span>
          </div>
        </div>
        
        {/* Creator & Time */}
        <p className="text-xs text-muted-foreground">
          {video.created_by_nickname} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  )

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
}

// CTA Card Mixed in Grid
function CTACard({ onCreateRoom }: { onCreateRoom: () => void }) {
  return (
    <Card className="bg-primary/5 border-primary/20 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">
          Ready to collaborate?
        </h3>
        <p className="text-sm text-muted-foreground">
          Start building with AI in seconds
        </p>
        <Button variant="default" onClick={onCreateRoom}>
          Create Room
        </Button>
      </div>
    </Card>
  )
}

// Video Player Modal
function VideoPlayerModal({ 
  video, 
  open, 
  onClose,
  onCreateRoom 
}: { 
  video: GalleryVideo | null
  open: boolean
  onClose: () => void
  onCreateRoom: () => void
}) {
  if (!video) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0">
        <div className="relative aspect-video bg-black">
          <video 
            controls 
            autoPlay
            className="w-full h-full"
            src={video.video_url}
          />
        </div>
        
        {/* Video Info */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{video.title}</h2>
            <p className="text-muted-foreground">
              {video.created_by_nickname} • {video.views} views • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>
          
          {video.description && (
            <p className="text-muted-foreground">{video.description}</p>
          )}
          
          {/* CTA After Video */}
          <div className="flex gap-4">
            <Button size="lg" className="flex-1" onClick={onCreateRoom}>
              Create Similar Room
            </Button>
            <Button size="lg" variant="outline" className="flex-1" onClick={onClose}>
              Browse More
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Empty State
function EmptyState({ onCreateRoom }: { onCreateRoom: () => void }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
        <p className="text-muted-foreground mb-4">
          Be the first to share your collaboration!
        </p>
        <Button onClick={onCreateRoom}>Create Room Now</Button>
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
function VideoCardSkeleton() {
  return (
    <Card>
      <div className="aspect-video bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
} 