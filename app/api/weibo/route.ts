import { NextRequest, NextResponse } from 'next/server'

// Kelly Yu Wenwen's Weibo profile: https://weibo.com/u/6465429977
const KELLY_WEIBO_UID = '6465429977'

interface WeiboPost {
  id: string
  text: string
  created_at: string
  pic_urls?: Array<{ thumbnail_pic: string, bmiddle_pic: string, original_pic: string }>
  video?: { play_addr: { url_list: Array<{ url: string }> }, cover: { url_list: Array<{ url: string }> } }
  attitudes_count: number
  comments_count: number
  reposts_count: number
  source: string
}

interface NormalizedPost {
  id: string
  platform: 'weibo'
  author: 'Kelly Yu Wenwen'
  text: string
  media: Array<{
    type: 'image' | 'video'
    src: string
    poster?: string
    alt?: string
  }>
  url: string
  publishedAt: string
  likes: number
  comments: number
  shares: number
}

export async function GET(request: NextRequest) {
  try {
    // Try to fetch real data from RSSHub first
    const RSSHUB_URL = process.env.RSSHUB_URL || 'https://rsshub.app'
    
    try {
      const response = await fetch(`${RSSHUB_URL}/weibo/user/${KELLY_WEIBO_UID}`, {
        headers: {
          'User-Agent': 'Kelly-Updates-Hub/1.0'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      })
      
      if (response.ok) {
        const rssText = await response.text()
        
        // Parse RSS feed (simplified XML parsing)
        const items = rssText.match(/<item>([\s\S]*?)<\/item>/g) || []
        
        const realPosts = items.slice(0, 10).map((item, index) => {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)
          const linkMatch = item.match(/<link>(.*?)<\/link>/)
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
          
          return {
            id: `real_${Date.now()}_${index}`,
            platform: 'weibo' as const,
            author: 'Kelly Yu Wenwen',
            text: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'New post from Kelly',
            media: [], // RSSHub might not include images, we'll handle this separately
            url: linkMatch ? linkMatch[1] : `https://weibo.com/u/${KELLY_WEIBO_UID}`,
            publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            likes: 0,
            comments: 0,
            shares: 0
          }
        })
        
        if (realPosts.length > 0) {
          return NextResponse.json({
            success: true,
            data: realPosts,
            source: 'rsshub',
            profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
            lastUpdated: new Date().toISOString()
          })
        }
      }
    } catch (rssError) {
      console.warn('RSSHub fetch failed, no mock data available:', rssError)
    }
    
    // No mock data - return empty if RSSHub fails
    return NextResponse.json({
      success: true,
      data: [],
      source: 'none',
      profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
      lastUpdated: new Date().toISOString(),
      note: 'RSSHub unavailable, no mock data provided'
    })

  } catch (error) {
    console.error('Error fetching Weibo data:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch Weibo data',
        data: []
      },
      { status: 500 }
    )
  }
}

/* 
TODO: Production Implementation

For production, replace mock data with actual RSSHub integration:

1. Set up RSSHub instance or use public instance
2. Use RSSHub Weibo route: https://docs.rsshub.app/social-media.html#weibo
3. Example endpoint: https://rsshub.app/weibo/user/6465429977

Example RSSHub implementation:

export async function GET(request: NextRequest) {
  try {
    const rssHubUrl = `${process.env.RSSHUB_URL}/weibo/user/${KELLY_WEIBO_UID}`
    const response = await fetch(rssHubUrl, {
      headers: {
        'User-Agent': 'Kelly-Updates-Hub/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`RSSHub error: ${response.status}`)
    }
    
    const rssData = await response.text()
    // Parse RSS/XML data and normalize to our format
    
    return NextResponse.json({
      success: true,
      data: normalizedPosts
    })
  } catch (error) {
    // Handle errors and fallbacks
  }
}

*/