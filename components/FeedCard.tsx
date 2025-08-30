'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Heart, MessageCircle, Share2, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
                ) : post.media[0]?.isIframe ? (
                  // Video placeholder with link to original post (Weibo blocks iframe embedding)
                  <div className="relative">
                    <a 
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="w-full h-80 bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg flex items-center justify-center group hover:from-blue-900 hover:to-blue-700 transition-all duration-300">
                        <div className="text-center text-white">
                          <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors">
                            <Play size={32} className="text-white ml-1" />
                          </div>
                          <p className="text-lg font-medium mb-2">Kelly Yu Wenwen Video</p>
                          <p className="text-sm opacity-80">Click to watch on Weibo</p>
                          <p className="text-xs opacity-60 mt-2">🎥 Original video content</p>
                        </div>
                      </div>
                    </a>
                  </div>
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
                      // Iframe video thumbnail (click to view in lightbox)
                      <div className="relative">
                        {media.poster ? (
                          <img
                            src={media.poster ?? undefined}
                            alt={`${post.author} video ${index + 1}`}
                            className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-32 sm:h-40 bg-gray-900 flex items-center justify-center">
                            <Play size={24} className="text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300">
                          <div className="bg-white/90 rounded-full p-2 group-hover:scale-110 transition-transform duration-300">
                            <Play size={16} className="text-gray-800 ml-0.5" />
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