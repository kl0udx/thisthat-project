import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link href="/create" className="w-full">
          <Button className="w-full h-16 text-lg">Create Room</Button>
        </Link>
        <Link href="/join" className="w-full">
          <Button variant="outline" className="w-full h-16 text-lg">Join Room</Button>
        </Link>
      </div>
    </main>
  )
}
