// components/DouyinVideoPlayer.tsx
'use client'

import { useState, useRef } from 'react'
import { Play, ExternalLink, Volume2 } from 'lucide-react'

interface DouyinVideoPlayerProps {
  src: string
  originalUrl?: string
  thumbnail?: string
}

export default function DouyinVideoPlayer({ src, originalUrl, thumbnail }: DouyinVideoPlayerProps) {
  const [showFallback, setShowFallback] = useState(true) // Default to fallback since Douyin URLs aren't direct video files
  const [isLoading, setIsLoading] = useState(false) // No loading needed for fallback
  const videoRef = useRef<HTMLVideoElement>(null)

  if (!src) return null

  // Check if src is a direct video file (rare for Douyin) or a Douyin page URL
  const isDirectVideo = src.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)
  const isDouyinUrl = src.includes('douyin.com') || src.includes('v.douyin.com')

  const handleVideoError = () => {
    setShowFallback(true)
    setIsLoading(false)
  }

  const handleVideoLoad = () => {
    setIsLoading(false)
  }

  const handleClick = () => {
    // For Douyin, always open in new tab since videos can't be embedded
    window.open(originalUrl || src, '_blank')
  }

  // If we should show fallback or loading failed, show the styled card
  if (showFallback) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-black via-gray-900 to-black relative group cursor-pointer" onClick={handleClick}>
        {/* Douyin-style background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-white/20 text-4xl">🎵</div>
          <div className="absolute top-8 right-6 text-white/15 text-3xl">♪</div>
          <div className="absolute bottom-6 left-8 text-white/20 text-2xl">🎶</div>
          <div className="absolute bottom-8 right-10 text-white/15 text-5xl">♫</div>
        </div>

        <div className="text-center text-white relative z-10 h-full flex items-center justify-center">
          <div>
            <div className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 backdrop-blur-sm rounded-full p-6 mb-4 group-hover:from-pink-400/40 group-hover:to-purple-400/40 group-hover:scale-110 transition-all duration-500 shadow-lg border border-white/20">
              <Play size={36} className="text-white ml-1 drop-shadow-lg" />
            </div>
            
            <h3 className="text-lg font-bold tracking-wide">Kelly Yu Wenwen</h3>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-white text-xs font-medium">🎵 抖音</span>
              </div>
              <div className="bg-pink-500/20 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 group-hover:bg-pink-400/30 transition-colors">
                <ExternalLink size={12} className="text-pink-200" />
                <span className="text-pink-100 text-xs font-medium">Watch Original</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    )
  }

  // Only try to show actual video if we have a direct video file URL (rare for Douyin)
  if (isDirectVideo && !isDouyinUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border relative group cursor-pointer bg-black">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-3"></div>
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={thumbnail}
          preload="metadata"
          onError={handleVideoError}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoLoad}
          onClick={handleClick}
          muted
        >
          <source src={src} type="video/mp4" />
          <source src={`${src}#t=0.1`} type="video/mp4" />
        </video>

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
          <div className="bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm rounded-full p-4 shadow-lg">
            <Play size={32} className="text-white ml-1" />
          </div>
        </div>

        {/* Douyin branding overlay */}
        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs flex items-center">
          <Volume2 size={12} className="mr-1" />
          Douyin
        </div>

        {/* External link hint on hover */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 text-white">
            <ExternalLink size={16} />
          </div>
        </div>
      </div>
    )
  }

  // For most Douyin URLs (page URLs, not direct video files), show the stylized fallback
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-black via-gray-900 to-black relative group cursor-pointer" onClick={handleClick}>
      {/* Show thumbnail if available */}
      {thumbnail && (
        <div className="absolute inset-0">
          <img
            src={thumbnail}
            alt="Douyin video thumbnail"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        </div>
      )}

      {/* Douyin-style background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4 text-white/20 text-4xl">🎵</div>
        <div className="absolute top-8 right-6 text-white/15 text-3xl">♪</div>
        <div className="absolute bottom-6 left-8 text-white/20 text-2xl">🎶</div>
        <div className="absolute bottom-8 right-10 text-white/15 text-5xl">♫</div>
      </div>

      <div className="text-center text-white relative z-10 h-full flex items-center justify-center">
        <div>
          <div className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 backdrop-blur-sm rounded-full p-6 mb-4 group-hover:from-pink-400/40 group-hover:to-purple-400/40 group-hover:scale-110 transition-all duration-500 shadow-lg border border-white/20">
            <Play size={36} className="text-white ml-1 drop-shadow-lg" />
          </div>
          
          <h3 className="text-lg font-bold tracking-wide">Kelly Yu Wenwen</h3>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-white text-xs font-medium">🎵 抖音</span>
            </div>
            <div className="bg-pink-500/20 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 group-hover:bg-pink-400/30 transition-colors">
              <ExternalLink size={12} className="text-pink-200" />
              <span className="text-pink-100 text-xs font-medium">Watch Original</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  )
}