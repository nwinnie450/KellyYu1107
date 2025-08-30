'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import FeedCard from '../components/FeedCard'
import MediaLightbox from '../components/MediaLightbox'
import { Loader2, RefreshCw, Filter } from 'lucide-react'

interface MediaItem {
  type: 'image' | 'video'
  src: string
  poster?: string
  alt?: string
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

type Platform = 'all' | 'weibo' | 'douyin' | 'sohu' | 'red' | 'instagram'

const platformFilters = [
  { id: 'all' as Platform, name: 'All', icon: '🔄', count: 0 },
  { id: 'weibo' as Platform, name: 'Weibo', icon: '📱', count: 0 },
  { id: 'douyin' as Platform, name: 'Douyin', icon: '🎵', count: 0 },
  { id: 'sohu' as Platform, name: 'Sohu', icon: '📺', count: 0 },
  { id: 'red' as Platform, name: 'RED', icon: '🌹', count: 0 },
  { id: 'instagram' as Platform, name: 'IG', icon: '📷', count: 0 },
]

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all')
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [dataSource, setDataSource] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // No mock data - only real posts from Kelly's Weibo will be shown

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        
        // First priority: Real verified posts
        const realResponse = await fetch('/api/posts/real')
        const realData = await realResponse.json()
        
        let allPosts = []
        let primarySource = 'mock'
        
        if (realData.success && realData.data.length > 0) {
          // Use real posts as primary source
          allPosts = [...realData.data]
          primarySource = 'real_verified'
          setDataSource('real_verified')
          setLastUpdated(realData.lastUpdated || new Date().toISOString())
        } else {
          // Second priority: Try live RSS data
          try {
            const kellyResponse = await fetch('/api/kelly-live')
            const kellyData = await kellyResponse.json()
            
            if (kellyData.success && kellyData.data.length > 0) {
              allPosts = [...kellyData.data]
              primarySource = kellyData.source || 'live'
              setDataSource(kellyData.source || 'live')
              setLastUpdated(kellyData.lastUpdated || new Date().toISOString())
            } else {
              // No real posts and no RSS data available
              allPosts = []
              primarySource = 'empty'
              setDataSource('empty')
              setLastUpdated(new Date().toISOString())
            }
          } catch (error) {
            console.error('Error fetching live data:', error)
            allPosts = []
            primarySource = 'empty'
            setDataSource('empty')
            setLastUpdated(new Date().toISOString())
          }
        }
        
        // Sort by publishedAt descending (newest first)
        allPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        
        setPosts(allPosts)
        setFilteredPosts(allPosts)
      } catch (error) {
        console.error('Error fetching posts:', error)
        // Fallback to mock data
        setPosts(mockPosts)
        setFilteredPosts(mockPosts)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  useEffect(() => {
    // Filter posts based on selected platform
    if (selectedPlatform === 'all') {
      setFilteredPosts(posts)
    } else {
      setFilteredPosts(posts.filter(post => post.platform === selectedPlatform))
    }
  }, [posts, selectedPlatform])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // First priority: Check for real posts
      const realResponse = await fetch('/api/posts/real', { 
        cache: 'no-store' // Force fresh data
      })
      const realData = await realResponse.json()
      
      let allPosts = []
      
      if (realData.success && realData.data.length > 0) {
        allPosts = [...realData.data]
        setDataSource('real_verified')
        setLastUpdated(realData.lastUpdated || new Date().toISOString())
      } else {
        // Second priority: Try live RSS data
        const kellyResponse = await fetch('/api/kelly-live', { 
          cache: 'no-store'
        })
        const kellyData = await kellyResponse.json()
        
        if (kellyData.success && kellyData.data.length > 0) {
          allPosts = [...kellyData.data]
          setDataSource(kellyData.source || 'live')
          setLastUpdated(kellyData.lastUpdated || new Date().toISOString())
        } else {
          allPosts = []
          setDataSource('empty')
          setLastUpdated(new Date().toISOString())
        }
      }
      
      // Sort by publishedAt descending (newest first)
      allPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      
      setPosts(allPosts)
      setFilteredPosts(allPosts)
    } catch (error) {
      console.error('Error refreshing posts:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleMediaClick = (media: MediaItem[], index: number) => {
    setLightboxMedia(media)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const handleLightboxClose = () => {
    setLightboxOpen(false)
  }

  const handleLightboxNavigate = (index: number) => {
    setLightboxIndex(index)
  }

  // Update platform counts
  const updatedFilters = platformFilters.map(filter => ({
    ...filter,
    count: filter.id === 'all' ? posts.length : posts.filter(p => p.platform === filter.id).length
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                🎵 Kelly Yu Updates
              </h1>
              <p className="text-sm text-gray-600 mt-1 flex items-center space-x-2">
                <span>Global fan hub • All platforms</span>
                {dataSource && (
                  <span className={`px-2 py-1 rounded text-xs ${
                    dataSource === 'real_verified' ? 'bg-green-100 text-green-700 font-bold' :
                    dataSource === 'rsshub_live' ? 'bg-blue-100 text-blue-700' :
                    dataSource === 'curated_fallback' ? 'bg-yellow-100 text-yellow-700' :
                    dataSource === 'empty' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {dataSource === 'real_verified' ? '✅ REAL POSTS' :
                     dataSource === 'rsshub_live' ? '🔴 LIVE RSS' :
                     dataSource === 'curated_fallback' ? '📋 CURATED' :
                     dataSource === 'empty' ? '⚠️ NO POSTS' :
                     '📡 LIVE'}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <a
                href="/admin/login"
                className="flex items-center space-x-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                title="Login to add Kelly's real posts"
              >
                <span>🔐</span>
                <span className="hidden sm:inline">Admin</span>
              </a>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Platform Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-[72px] sm:top-[80px] z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
            <Filter size={16} className="text-gray-400 mr-2 flex-shrink-0" />
            {updatedFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedPlatform(filter.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedPlatform === filter.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.name}</span>
                {filter.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedPlatform === filter.id
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading Kelly's updates...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty State - No Real Posts Yet
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Real Posts Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add Kelly's actual Weibo posts to see them here with exact links!
            </p>
            <div className="space-y-3">
              <a
                href="/admin/login"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <span>✅</span>
                <span>Admin Login</span>
              </a>
              <p className="text-sm text-gray-600">
                Demo Login: <strong>admin</strong> / <strong>kelly2025</strong>
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Visit Kelly's Weibo: 
              <a 
                href="https://weibo.com/u/6465429977" 
                target="_blank" 
                className="text-blue-500 hover:underline ml-1"
              >
                weibo.com/u/6465429977
              </a>
            </p>
          </div>
        ) : (
          // Posts Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <FeedCard 
                  post={post} 
                  onMediaClick={handleMediaClick}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && filteredPosts.length > 0 && (
          <div className="text-center mt-12">
            <button className="px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Load more posts
            </button>
          </div>
        )}
      </main>

      {/* Media Lightbox */}
      <MediaLightbox
        media={lightboxMedia}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={handleLightboxClose}
        onNavigate={handleLightboxNavigate}
      />
    </div>
  )
}