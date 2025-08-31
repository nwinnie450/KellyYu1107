import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '../../../../lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

// Kelly Yu Wenwen's REAL posts database
// This will store her actual Weibo posts as they're posted

interface RealKellyPost {
  id: string
  weiboId?: string
  platform: 'weibo' | 'douyin' | 'instagram' | 'red' | 'sohu'
  text: string
  originalText?: string // For Chinese original
  media: Array<{
    type: 'image' | 'video'
    src: string
    originalSrc?: string
    alt?: string
  }>
  url: string
  publishedAt: string // Exact time from Weibo
  engagement: {
    likes: number
    comments: number
    shares: number
    lastUpdated: string
  }
  verified: boolean // Indicates this is confirmed real content
  source: 'manual_verified' | 'auto_verified'
  addedAt: string
}

// File path for persistent storage
const POSTS_FILE_PATH = path.join(process.cwd(), 'data', 'real-posts.json')

// In-memory storage for REAL posts only (in production, use database)
// THIS STARTS EMPTY - only real posts from Kelly's Weibo will be added via admin panel
let realPosts: RealKellyPost[] = []

// Load posts from file on startup
async function loadPostsFromFile() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(POSTS_FILE_PATH)
    await fs.mkdir(dataDir, { recursive: true })
    
    // Try to read existing posts
    const fileContent = await fs.readFile(POSTS_FILE_PATH, 'utf-8')
    realPosts = JSON.parse(fileContent)
    console.log(`📚 Loaded ${realPosts.length} posts from persistent storage`)
  } catch (error) {
    console.log('📚 No existing posts file found, starting with empty posts array')
    realPosts = []
  }
}

// Save posts to file
async function savePostsToFile() {
  try {
    await fs.writeFile(POSTS_FILE_PATH, JSON.stringify(realPosts, null, 2))
    console.log(`💾 Saved ${realPosts.length} posts to persistent storage`)
  } catch (error) {
    console.error('❌ Failed to save posts to file:', error)
  }
}

// Initialize posts on module load
loadPostsFromFile()

export async function GET(request: NextRequest) {
  try {
    // Ensure posts are loaded from file before proceeding
    await loadPostsFromFile()
    
    // Sort by published date (newest first)
    const sortedPosts = realPosts
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map(post => ({
        id: post.id,
        platform: post.platform,
        author: 'Kelly Yu Wenwen',
        text: post.text,
        media: post.media.map(m => ({
          type: m.type,
          src: m.isIframe ? m.src : (m.originalSrc ? `/api/media-proxy?url=${encodeURIComponent(m.originalSrc)}` : m.src),
          alt: m.alt || 'Kelly Yu Wenwen post media',
          isIframe: m.isIframe
        })),
        url: post.url,
        publishedAt: post.publishedAt,
        likes: post.engagement.likes,
        comments: post.engagement.comments,
        shares: post.engagement.shares,
        verified: post.verified
      }))

    return NextResponse.json({
      success: true,
      data: sortedPosts,
      source: 'real_posts',
      total: realPosts.length,
      verified: realPosts.filter(p => p.verified).length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching real posts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real posts',
      data: []
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure posts are loaded from file before proceeding
    await loadPostsFromFile()
    
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    const user = isAuthenticated(authHeader)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 })
    }
    
    const newPost: Partial<RealKellyPost> = await request.json()
    
    // Validate required fields
    if (!newPost.text || !newPost.publishedAt || !newPost.url) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: text, publishedAt, url'
      }, { status: 400 })
    }

    const realPost: RealKellyPost = {
      id: newPost.id || `real_${Date.now()}`,
      weiboId: newPost.weiboId,
      platform: newPost.platform || 'weibo',
      text: newPost.text,
      originalText: newPost.originalText,
      media: newPost.media || [],
      url: newPost.url,
      publishedAt: newPost.publishedAt,
      engagement: {
        likes: newPost.engagement?.likes || 0,
        comments: newPost.engagement?.comments || 0,
        shares: newPost.engagement?.shares || 0,
        lastUpdated: new Date().toISOString()
      },
      verified: newPost.verified || false,
      source: 'manual_verified',
      addedAt: new Date().toISOString()
    }

    // Add to beginning of array (newest first)
    realPosts.unshift(realPost)

    // Keep only latest 50 posts to avoid memory issues
    if (realPosts.length > 50) {
      realPosts = realPosts.slice(0, 50)
    }

    // Save to file for persistence
    await savePostsToFile()

    return NextResponse.json({
      success: true,
      message: 'Real post added successfully',
      post: realPost,
      total: realPosts.length
    })

  } catch (error) {
    console.error('Error adding real post:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add real post'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Ensure posts are loaded from file before proceeding
    await loadPostsFromFile()
    
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    const user = isAuthenticated(authHeader)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 })
    }
    
    const updatedPost = await request.json()
    
    if (!updatedPost.id) {
      return NextResponse.json({
        success: false,
        error: 'Post ID is required'
      }, { status: 400 })
    }
    
    const postIndex = realPosts.findIndex(post => post.id === updatedPost.id)
    if (postIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 })
    }

    // Update the entire post while preserving some original fields
    const originalPost = realPosts[postIndex]
    realPosts[postIndex] = {
      ...updatedPost,
      // Preserve original metadata
      id: originalPost.id,
      weiboId: originalPost.weiboId,
      verified: originalPost.verified,
      source: originalPost.source,
      addedAt: originalPost.addedAt,
      // Update engagement with timestamp
      engagement: {
        ...updatedPost.engagement,
        lastUpdated: new Date().toISOString()
      }
    }

    // Save to file for persistence
    await savePostsToFile()

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      post: realPosts[postIndex]
    })

  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update post'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Ensure posts are loaded from file before proceeding
    await loadPostsFromFile()
    
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    const user = isAuthenticated(authHeader)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 })
    }
    
    const { id } = await request.json()
    
    const postIndex = realPosts.findIndex(post => post.id === id)
    if (postIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 })
    }

    // Remove the post
    const removedPost = realPosts.splice(postIndex, 1)[0]

    // Save to file for persistence
    await savePostsToFile()

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
      deletedPost: removedPost,
      total: realPosts.length
    })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete post'
    }, { status: 500 })
  }
}