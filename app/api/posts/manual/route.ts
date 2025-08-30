import { NextRequest, NextResponse } from 'next/server'

// Manual content management endpoint
// This allows admins to add real Kelly posts manually

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

// In production, this would use a database
let manualPosts: ManualPost[] = [
  // Example real posts that could be manually added
  {
    id: '1',
    platform: 'weibo',
    text: 'Real post content copied from Kelly\'s actual Weibo',
    media: ['https://real-weibo-image-url.jpg'],
    originalUrl: 'https://weibo.com/u/6465429977/actual-post-id',
    publishedAt: '2024-08-30T12:00:00Z',
    likes: 1000,
    comments: 200,
    shares: 50
  }
]

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: manualPosts,
    source: 'manual',
    note: 'Manually curated content from Kelly\'s social media'
  })
}

export async function POST(request: NextRequest) {
  // Add new manual post
  try {
    const newPost = await request.json()
    // Add ID if not present
    if (!newPost.id) {
      newPost.id = Date.now().toString()
    }
    manualPosts.unshift(newPost) // Add to beginning
    
    return NextResponse.json({
      success: true,
      message: 'Post added successfully',
      post: newPost
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to add post'
    }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  // Update existing post
  try {
    const updatedPost: ManualPost = await request.json()
    
    if (!updatedPost.id) {
      return NextResponse.json({
        success: false,
        error: 'Post ID is required for updates'
      }, { status: 400 })
    }
    
    const index = manualPosts.findIndex(post => post.id === updatedPost.id)
    
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 })
    }
    
    manualPosts[index] = updatedPost
    
    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update post'
    }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  // Delete existing post
  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Post ID is required for deletion'
      }, { status: 400 })
    }
    
    const index = manualPosts.findIndex(post => post.id === id)
    
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: 'Post not found'
      }, { status: 404 })
    }
    
    const deletedPost = manualPosts.splice(index, 1)[0]
    
    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
      post: deletedPost
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to delete post'
    }, { status: 400 })
  }
}