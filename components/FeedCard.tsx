'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Heart, MessageCircle, Share2, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import WeiboVideoPlayer from './WeiboVideoPlayer'
import DouyinVideoPlayer from './DouyinVideoPlayer'
import RedNotesPlayer from './RedNotesPlayer'

interface MediaItem {
  type: 'image' | 'video'
  src: string
  poster?: string
  alt?: string
  isIframe?: boolean
}

interface Post {
  id: string
  platform: 'weibo' | 'douyin' | 'sohu' | 'red' | 'instagram'
  author: string
  text: string
  media: MediaItem[]
  url: string
  publishedAt: string
  likes?: number
  comments?: number
  shares?: number
}

interface FeedCardProps {
  post: Post
  onMediaClick: (media: MediaItem[], index: number) => void
}

const platformConfig = {
  weibo: {
    name: '微博',
    icon: '📱',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    accentColor: '#E60012'
  },
  douyin: {
    name: '抖音',
    icon: '🎵',
    color: 'text-black',
    bgColor: 'bg-gray-50',
    accentColor: '#000000'
  },
  sohu: {
    name: '搜狐',
    icon: '📺',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    accentColor: '#0078D4'
  },
  red: {
    name: '小红书',
    icon: '🌹',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    accentColor: '#FF2442'
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-r from-pink-50 to-orange-50',
    accentColor: '#E1306C'
  }
}

export default function FeedCard({ post, onMediaClick }: FeedCardProps) {
  const [imageLoaded, setImageLoaded] = useState<{ [key: number]: boolean }>({})
  const config = platformConfig[post.platform]
  
  // Debug logging for RedNotes posts
  if (post.platform === 'red') {
    console.log('🔍 FeedCard RedNotes Debug:', {
      platform: post.platform,
      mediaCount: post.media.length,
      firstMediaType: post.media[0]?.type,
      allMediaTypes: post.media.map(m => m.type),
      hasVideoInMedia: post.media.some(m => m.type === 'video')
    })
  }
  
  const handleMediaClick = (index: number) => {
    if (post.media.length > 0) {
      onMediaClick(post.media, index)
    }
  }

  const formatText = (text: string) => {
    // Truncate long text on mobile, show full on desktop
    const maxLength = 150
    if (text.length <= maxLength) return text
    
    return (
      <div className="space-y-2">
        <div className="sm:hidden">
          {text.substring(0, maxLength)}...
        </div>
        <div className="hidden sm:block">
          {text}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      {/* Header */}
      <div className={`px-4 py-3 ${config.bgColor} flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className={`font-medium text-sm ${config.color}`}>
              {config.name}
            </p>
            <p className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <a
          href={post.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-white/50 rounded-full transition-colors"
          title="View original post"
        >
          <ExternalLink size={16} className="text-gray-600" />
        </a>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Text Content */}
        {post.text && (
          <div className="mb-4">
            <div className="text-gray-800 leading-relaxed text-sm sm:text-base">
              {formatText(post.text)}
            </div>
          </div>
        )}

        {/* Media Grid */}
        {post.media.length > 0 && (
          <div className="mb-4">
            {post.media.length === 1 ? (
              // Single media item
              <div 
                className="relative cursor-pointer group rounded-lg overflow-hidden"
                onClick={() => handleMediaClick(0)}
              >
                {post.media[0].type === 'image' ? (
                  <div className="relative">
                    {!imageLoaded[0] && (
                      <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
                    )}
                    <img
                      src={post.media[0].src ?? undefined}
                      alt={post.media[0].alt || `${post.author} post`}
                      className="w-full h-auto max-h-96 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                      onLoad={() => setImageLoaded(prev => ({ ...prev, 0: true }))}
                      style={{ display: imageLoaded[0] ? 'block' : 'none' }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg" />
                  </div>
                ) : post.media[0]?.isIframe || post.platform === 'douyin' || post.platform === 'red' ? (
                  // Use appropriate video player based on platform
                  post.platform === 'douyin' ? (
                    <DouyinVideoPlayer 
                      src={post.media[0].src ?? ''} 
                      originalUrl={post.url}
                      thumbnail={post.media[0]?.poster}
                    />
                  ) : post.platform === 'red' ? (
                    <RedNotesPlayer 
                      src={post.media[0].src ?? ''} 
                      originalUrl={post.url}
                      thumbnail={post.media[0]?.poster}
                      hasVideo={true} // Force video for RedNotes since they're primarily video content
                    />
                  ) : (
                    <WeiboVideoPlayer 
                      src={post.media[0].src ?? ''} 
                      originalUrl={post.url}
                    />
                  )
                ) : (
                  // Regular video file
                  <div className="relative">
                    <video
                      src={`/api/media-proxy?url=${encodeURIComponent(post.media[0]?.src || '')}`}
                      poster={post.media[0]?.poster}
                      className="w-full h-auto max-h-96 object-cover rounded-lg"
                      controls
                    />
                  </div>
                )}
              </div>
            ) : (
              // Multiple media items - Grid layout
              <div className={`grid gap-2 ${
                post.media.length === 2 ? 'grid-cols-2' : 
                post.media.length === 3 ? 'grid-cols-3' :
                'grid-cols-2 grid-rows-2'
              }`}>
                {post.media.slice(0, 4).map((media, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer group rounded-lg overflow-hidden ${
                      post.media.length === 4 && index === 0 ? 'col-span-2' : ''
                    }`}
                    onClick={() => handleMediaClick(index)}
                  >
                    {media.type === 'image' ? (
                      <div className="relative">
                        {!imageLoaded[index] && (
                          <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
                        )}
                        <img
                          src={media.src ?? undefined}
                          alt={media.alt || `${post.author} post ${index + 1}`}
                          className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                          onLoad={() => setImageLoaded(prev => ({ ...prev, [index]: true }))}
                          style={{ display: imageLoaded[index] ? 'block' : 'none' }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        
                        {/* Show count if more than 4 images */}
                        {index === 3 && post.media.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-medium">
                              +{post.media.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : media.isIframe ? (
                      // Iframe video thumbnail for grid view
                      <div className="relative">
                        <div className="w-full h-32 sm:h-40 bg-gray-900 flex items-center justify-center rounded overflow-hidden">
                          <div className="text-center text-white">
                            <Play size={20} className="text-white mx-auto mb-1" />
                            <p className="text-xs">Video</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Regular video file
                      <div className="relative">
                        <video
                          src={`/api/media-proxy?url=${encodeURIComponent(media.src)}`}
                          poster={media.poster}
                          className="w-full h-32 sm:h-40 object-cover"
                          controls
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Engagement Stats */}
        {(post.likes || post.comments || post.shares) && (
          <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
            {post.likes && (
              <div className="flex items-center space-x-1 text-gray-600">
                <Heart size={14} />
                <span className="text-sm">{post.likes.toLocaleString()}</span>
              </div>
            )}
            {post.comments && (
              <div className="flex items-center space-x-1 text-gray-600">
                <MessageCircle size={14} />
                <span className="text-sm">{post.comments.toLocaleString()}</span>
              </div>
            )}
            {post.shares && (
              <div className="flex items-center space-x-1 text-gray-600">
                <Share2 size={14} />
                <span className="text-sm">{post.shares.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}