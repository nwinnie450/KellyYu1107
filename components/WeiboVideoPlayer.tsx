// components/WeiboVideoPlayer.tsx
'use client'

import { useState, useEffect } from 'react'
import { Play, ExternalLink } from 'lucide-react'

interface WeiboVideoPlayerProps {
  src: string
  originalUrl?: string
}

// Convert various Weibo URLs to H5 iframe embed format
function getBestEmbedUrl(src: string): string {
  try {
    // Extract object_id from various formats
    let objectId = ''
    
    if (src.includes('object_id=')) {
      // Format: https://m.weibo.cn/s/video/show?object_id=1034%3A5205158733480074
      const match = src.match(/object_id=([^&]+)/)
      objectId = match ? decodeURIComponent(match[1]) : ''
    } else if (src.includes('/tv/show/')) {
      // Format: https://weibo.com/tv/show/1034:5205158733480074
      const match = src.match(/\/tv\/show\/([^?&]+)/)
      objectId = match ? match[1] : ''
    } else if (src.includes('/tv/player/')) {
      // Format: https://weibo.com/tv/player/1034:5205158733480074
      const match = src.match(/\/tv\/player\/([^?&]+)/)
      objectId = match ? match[1] : ''
    } else if (src.includes('/status/')) {
      // Extract from status URLs like https://weibo.com/6465429977/5205401983519324
      // This would need to be resolved to get the object_id
      return src // For now, return original and let iframe handle it
    }
    
    if (objectId) {
      // Use the H5 mobile player format for better iframe compatibility
      return `https://m.weibo.cn/s/video/show?object_id=${encodeURIComponent(objectId)}`
    }
    
    return src // Return original if we can't parse it
  } catch (e) {
    return src
  }
}

export default function WeiboVideoPlayer({ src, originalUrl }: WeiboVideoPlayerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeFailed, setIframeFailed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    // Set a timeout to show fallback if iframe doesn't load properly
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        setShowFallback(true)
      }
    }, 5000) // 5 seconds timeout for iframe loading

    return () => clearTimeout(timer)
  }, [iframeLoaded])

  if (!src) return null

  const embedUrl = getBestEmbedUrl(src)

  if (showFallback || iframeFailed) {
    // Premium fallback card
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative group">
        <a 
          href={originalUrl || src}
          target="_blank"
          rel="noopener noreferrer"
          className="h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-800 hover:via-purple-800 hover:to-blue-800"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-20 h-20 border border-white/20 rounded-full"></div>
            <div className="absolute top-8 right-6 w-16 h-16 border border-white/10 rounded-full"></div>
            <div className="absolute bottom-6 left-8 w-12 h-12 border border-white/15 rounded-full"></div>
          </div>

          <div className="text-center text-white relative z-10">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-6 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-500 shadow-lg">
              <Play size={36} className="text-white ml-1 drop-shadow-lg" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-bold tracking-wide">Kelly Yu Wenwen</h3>
              <p className="text-lg font-medium text-blue-100">Concert Video</p>
              
              <div className="flex items-center justify-center text-sm text-blue-200 group-hover:text-white transition-colors">
                <ExternalLink size={16} className="mr-2" />
                <span className="font-medium">Watch on Weibo</span>
              </div>
              
              <div className="text-xs text-blue-300/80 space-y-1">
                <p>🎥 Official content</p>
                <p>✨ HD quality available</p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </a>
      </div>
    )
  }

  // Iframe-only rendering for Weibo H5 player
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border relative bg-gray-100">
      {!iframeLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading Weibo video...</p>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        className="h-full w-full rounded-2xl"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        onLoad={() => {
          console.log('✅ Weibo H5 iframe loaded:', embedUrl)
          setIframeLoaded(true)
        }}
        onError={(e) => {
          console.log('❌ Weibo H5 iframe failed:', embedUrl, e)
          setIframeFailed(true)
        }}
      />
    </div>
  )
}