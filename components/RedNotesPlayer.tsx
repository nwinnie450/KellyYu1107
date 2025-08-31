// components/RedNotesPlayer.tsx
'use client'

import { useState } from 'react'
import { Play, ExternalLink, Heart, BookOpen } from 'lucide-react'

interface RedNotesPlayerProps {
  src: string
  originalUrl?: string
  thumbnail?: string
  hasVideo?: boolean
}

export default function RedNotesPlayer({ src, originalUrl, thumbnail, hasVideo = false }: RedNotesPlayerProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (!src && !thumbnail && !originalUrl) return null

  const handleClick = () => {
    if (!showFallback && !imageError) {
      // Try to play video directly first
      const video = document.createElement('video');
      video.src = src;
      video.muted = true;
      video.play().catch(() => {
        // If direct play fails, open external link
        window.open(originalUrl || src, '_blank');
      });
    } else {
      // Fallback - open external link
      window.open(originalUrl || src, '_blank');
    }
  }

  // If we have an error or no valid media, show the RedNotes card
  if (imageError || (!src && !thumbnail)) {
    return (
      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-red-50 via-pink-50 to-red-100 relative group cursor-pointer" onClick={handleClick}>
        {/* RedNotes-style background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-red-400/30 text-3xl">🌹</div>
          <div className="absolute top-8 right-6 text-pink-400/25 text-2xl">💄</div>
          <div className="absolute bottom-6 left-8 text-red-400/30 text-4xl">✨</div>
          <div className="absolute bottom-8 right-10 text-pink-400/25 text-3xl">💎</div>
          
          {/* Floating elements */}
          <div className="absolute top-6 right-20 w-3 h-3 bg-red-400/30 rounded-full animate-pulse"></div>
          <div className="absolute bottom-12 left-16 w-2 h-2 bg-pink-400/40 rounded-full animate-ping"></div>
          <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-red-300/20 rounded-full animate-pulse delay-300"></div>
        </div>

        <div className="text-center relative z-10 h-full flex flex-col items-center justify-center p-6">
          <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-8 mb-4 group-hover:from-red-400/30 group-hover:to-pink-400/30 group-hover:scale-105 transition-all duration-500 shadow-lg border border-red-200/30">
            <BookOpen size={42} className="text-red-600 mx-auto mb-3" />
            {hasVideo && <Play size={24} className="text-red-600 mx-auto" />}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-red-900">Kelly Yu Wenwen</h3>
            <p className="text-lg font-medium text-red-700">小红书笔记</p>
            
            <div className="flex items-center justify-center text-sm text-red-600 group-hover:text-red-800 transition-colors">
              <ExternalLink size={16} className="mr-2" />
              <span className="font-medium">在小红书查看</span>
            </div>
            
            <div className="text-xs text-red-500/80 space-y-1">
              <p>🌹 生活美学</p>
              <p>✨ 精彩内容</p>
              {hasVideo && <p>🎬 视频内容</p>}
            </div>
          </div>
        </div>

        {/* Gradient hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    )
  }

  // Show actual image/video content
  return (
    <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border relative group cursor-pointer bg-gradient-to-br from-red-50 to-pink-50" onClick={handleClick}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
          <div className="flex flex-col items-center text-red-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-3"></div>
            <p className="text-sm">加载中...</p>
          </div>
        </div>
      )}
      
      {hasVideo ? (
        // Video content - try actual video element first
        <div className="relative h-full">
          {/* Try to embed actual video first */}
          <video
            className="w-full h-full object-cover"
            poster={thumbnail || src}
            controls
            preload="metadata"
            onError={() => {
              console.log('Video failed to load, showing thumbnail');
              setImageError(true);
            }}
            onLoadedData={() => setImageLoaded(true)}
          >
            <source src={src} type="video/mp4" />
            <source src={src} type="video/webm" />
            <source src={src} type="video/ogg" />
            Your browser does not support the video tag.
          </video>
          
          {/* Fallback thumbnail if video fails */}
          {imageError && (
            <>
              <img
                src={src || thumbnail}
                alt="Kelly Yu Wenwen RedNotes video thumbnail"
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
                style={{ display: 'block' }}
              />
              
              {/* Video play overlay for thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-500/80 backdrop-blur-sm rounded-full p-6 shadow-lg group-hover:bg-red-600/80 group-hover:scale-110 transition-all duration-300">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Image content
        <img
          src={src || thumbnail}
          alt="Kelly Yu Wenwen RedNotes post"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ display: imageLoaded && !imageError ? 'block' : 'none' }}
        />
      )}

      {/* RedNotes overlay elements */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* RedNotes branding */}
      <div className="absolute bottom-4 left-4 bg-red-500/90 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs font-medium flex items-center">
        <Heart size={12} className="mr-1 fill-current" />
        小红书
      </div>

      {/* External link hint */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 text-white">
          <ExternalLink size={16} />
        </div>
      </div>

      {/* Content preview overlay on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
        <p className="text-white text-sm font-medium">Kelly Yu Wenwen 的小红书</p>
        <p className="text-white/80 text-xs mt-1">点击查看完整内容</p>
      </div>
    </div>
  )
}