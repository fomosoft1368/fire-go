import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  count?: number
}

export default function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  showCount = false,
  count,
}: RatingStarsProps) {
  const sizeClass = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[size]

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
          }`}
        />
      ))}
      {showCount && count !== undefined && (
        <span className="text-sm text-slate-500 ml-1">({count.toLocaleString()})</span>
      )}
    </div>
  )
}
