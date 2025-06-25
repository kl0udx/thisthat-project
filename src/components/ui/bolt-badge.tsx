import Link from 'next/link'
import Image from 'next/image'

interface BoltBadgeProps {
  size?: 'small' | 'large'
  position?: 'bottom-right' | 'bottom-left'
}

export function BoltBadge({ size = 'large', position = 'bottom-right' }: BoltBadgeProps) {
  const dimensions = size === 'large' ? 120 : 80
  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4'
  
  return (
    <Link
      href="https://bolt.new"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${positionClasses} z-50 transition-transform hover:scale-105`}
      title="Made with Bolt.new"
    >
      <Image
        src="/bolt-badge.png"
        alt="Powered by Bolt.new"
        width={dimensions}
        height={dimensions}
        className="drop-shadow-lg"
        priority
      />
    </Link>
  )
} 