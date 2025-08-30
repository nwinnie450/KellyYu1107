'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Save, Trash2, ExternalLink } from 'lucide-react'

interface ManualPost {
  id?: string
  platform: 'weibo' | 'douyin' | 'instagram' | 'red' | 'sohu'
  text: string
  media: string[]
  originalUrl: string
  publishedAt: string
  likes?: number
  comments?: number
  shares?: number
}

const platformOptions = [
  { value: 'weibo', label: 'Weibo 微博', icon: '📱' },
  { value: 'douyin', label: 'Douyin 抖音', icon: '🎵' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'red', label: 'RED 小红书', icon: '🌹' },
  { value: 'sohu', label: 'Sohu 搜狐', icon: '📺' },
]

export default function AdminPage() {
  const [posts, setPosts] = useState<ManualPost[]>([])
  const [newPost, setNewPost] = useState<ManualPost>({
    platform: 'weibo',
    text: '',
    media: [],
    originalUrl: '',
    publishedAt: new Date().toISOString().slice(0, 16),
    likes: 0,
    comments: 0,
    shares: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts/manual')
      const data = await response.json()
      if (data.success) {
        setPosts(data.data)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const handleAddPost = async () => {
    if (!newPost.text.trim() || !newPost.originalUrl.trim()) {
      alert('Please fill in text and original URL')
      return
    }

    setLoading(true)
    try {
      const postData = {
        ...newPost,
        id: `manual_${Date.now()}`,
        publishedAt: new Date(newPost.publishedAt).toISOString()
      }

      const response = await fetch('/api/posts/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      if (response.ok) {
        // Reset form
        setNewPost({
          platform: 'weibo',
          text: '',
          media: [],
          originalUrl: '',
          publishedAt: new Date().toISOString().slice(0, 16),
          likes: 0,
          comments: 0,
          shares: 0
        })
        
        // Refresh posts
        fetchPosts()
        alert('Post added successfully!')
      } else {
        alert('Failed to add post')
      }
    } catch (error) {
      console.error('Error adding post:', error)
      alert('Error adding post')
    } finally {
      setLoading(false)
    }
  }

  const handleMediaAdd = () => {
    const mediaUrl = prompt('Enter image/video URL:')
    if (mediaUrl) {
      setNewPost(prev => ({
        ...prev,
        media: [...prev.media, mediaUrl]
      }))
    }
  }

  const handleMediaRemove = (index: number) => {
    setNewPost(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📝 Kelly Updates - Admin Panel
          </h1>
          <p className="text-gray-600">
            Manually add Kelly Yu Wenwen's latest posts from her social media platforms
          </p>
        </div>

        {/* Add New Post Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Plus size={20} className="mr-2" />
            Add New Post
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={newPost.platform}
                onChange={(e) => setNewPost(prev => ({ 
                  ...prev, 
                  platform: e.target.value as ManualPost['platform'] 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {platformOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Published Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Published Date & Time
              </label>
              <input
                type="datetime-local"
                value={newPost.publishedAt}
                onChange={(e) => setNewPost(prev => ({ 
                  ...prev, 
                  publishedAt: e.target.value 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Post Text */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Content (Chinese/English)
            </label>
            <textarea
              value={newPost.text}
              onChange={(e) => setNewPost(prev => ({ 
                ...prev, 
                text: e.target.value 
              }))}
              placeholder="Paste Kelly's original post content here..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Original URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Post URL
            </label>
            <input
              type="url"
              value={newPost.originalUrl}
              onChange={(e) => setNewPost(prev => ({ 
                ...prev, 
                originalUrl: e.target.value 
              }))}
              placeholder="https://weibo.com/u/6465429977/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Media URLs */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media (Images/Videos)
            </label>
            <div className="space-y-2">
              {newPost.media.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={url}
                    readOnly
                    className="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-50"
                  />
                  <button
                    onClick={() => handleMediaRemove(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleMediaAdd}
                className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add Media URL
              </button>
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Likes ❤️
              </label>
              <input
                type="number"
                value={newPost.likes}
                onChange={(e) => setNewPost(prev => ({ 
                  ...prev, 
                  likes: parseInt(e.target.value) || 0 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments 💬
              </label>
              <input
                type="number"
                value={newPost.comments}
                onChange={(e) => setNewPost(prev => ({ 
                  ...prev, 
                  comments: parseInt(e.target.value) || 0 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shares 🔄
              </label>
              <input
                type="number"
                value={newPost.shares}
                onChange={(e) => setNewPost(prev => ({ 
                  ...prev, 
                  shares: parseInt(e.target.value) || 0 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddPost}
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
          >
            <Save size={16} className="mr-2" />
            {loading ? 'Adding Post...' : 'Add Post'}
          </button>
        </motion.div>

        {/* Current Posts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Posts ({posts.length})</h2>
          
          {posts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No manual posts added yet. Add Kelly's latest posts above!
            </p>
          ) : (
            <div className="space-y-4">
              {posts.slice(0, 5).map((post, index) => (
                <div key={post.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {platformOptions.find(p => p.value === post.platform)?.icon}
                      </span>
                      <span className="font-medium text-sm text-gray-700">
                        {platformOptions.find(p => p.value === post.platform)?.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(post.publishedAt).toLocaleString()}
                      </span>
                    </div>
                    <a
                      href={post.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  
                  <p className="text-gray-800 mb-2 line-clamp-3">
                    {post.text}
                  </p>
                  
                  {post.media.length > 0 && (
                    <p className="text-sm text-gray-500 mb-2">
                      📎 {post.media.length} media file(s)
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>❤️ {post.likes?.toLocaleString()}</span>
                    <span>💬 {post.comments?.toLocaleString()}</span>
                    <span>🔄 {post.shares?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">📋 How to Use</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>1. Visit Kelly's Weibo: <a href="https://weibo.com/u/6465429977" target="_blank" className="underline">weibo.com/u/6465429977</a></li>
            <li>2. Copy her latest post content and paste above</li>
            <li>3. Add the direct link to her original post</li>
            <li>4. Include any image/video URLs from the post</li>
            <li>5. Enter engagement numbers (likes, comments, shares)</li>
            <li>6. Posts will appear immediately on the main site!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}