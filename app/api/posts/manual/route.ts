import { NextRequest, NextResponse } from 'next/server'

// Manual content management endpoint
// This allows admins to add real Kelly posts manually

interface ManualPost {
  platform: 'weibo' | 'douyin' | 'instagram' | 'red' | 'sohu'
  text: string
  media: string[]
  originalUrl: string
  publishedAt: string
}

// In production, this would use a database
let manualPosts: ManualPost[] = [
  // Example real posts that could be manually added
  {
    platform: 'weibo',
    text: 'Real post content copied from Kelly\'s actual Weibo',
    media: ['https://real-weibo-image-url.jpg'],
    originalUrl: 'https://weibo.com/u/6465429977/actual-post-id',
    publishedAt: '2024-08-30T12:00:00Z'
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
    manualPosts.unshift(newPost) // Add to beginning
    
    return NextResponse.json({
      success: true,
      message: 'Post added successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to add post'
    }, { status: 400 })
  }
}