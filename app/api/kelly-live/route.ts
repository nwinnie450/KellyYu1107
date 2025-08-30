import { NextRequest, NextResponse } from 'next/server'

const KELLY_WEIBO_UID = '6465429977'

interface ParsedPost {
  id: string
  platform: 'weibo'
  author: 'Kelly Yu Wenwen'
  text: string
  media: Array<{
    type: 'image' | 'video'
    src: string
    alt?: string
  }>
  url: string
  publishedAt: string
  likes: number
  comments: number
  shares: number
  source: string
}

// Multiple RSSHub sources for redundancy
const RSS_SOURCES = [
  'https://rsshub.app/weibo/user/6465429977',
  'https://rss.rssforever.com/weibo/user/6465429977', 
  'https://rsshub.herokuapp.com/weibo/user/6465429977',
  'https://rsshub.pseudoyu.com/weibo/user/6465429977'
]

// Parse RSS XML to extract posts
function parseRSSXML(xmlText: string): ParsedPost[] {
  try {
    const posts: ParsedPost[] = []
    
    // Extract items from RSS feed
    const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || []
    
    itemMatches.slice(0, 10).forEach((item, index) => {
      // Extract title/content
      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)
      const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)
      const linkMatch = item.match(/<link>(.*?)<\/link>/i)
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i)
      const guidMatch = item.match(/<guid[^>]*>(.*?)<\/guid>/i)
      
      let content = ''
      let mediaUrls: string[] = []
      
      if (titleMatch && titleMatch[1]) {
        content = titleMatch[1].trim()
      } else if (descMatch && descMatch[1]) {
        content = descMatch[1].trim()
      }
      
      // Clean up content - remove HTML tags but keep text
      content = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim()
      
      // Extract image URLs from description
      if (descMatch && descMatch[1]) {
        const imgMatches = descMatch[1].match(/src="([^"]*(?:jpg|jpeg|png|gif|webp)[^"]*)"/gi) || []
        mediaUrls = imgMatches.map(match => {
          const urlMatch = match.match(/src="([^"]*)"/)
          return urlMatch ? urlMatch[1] : ''
        }).filter(url => url && url.startsWith('http'))
      }
      
      // Generate unique ID
      const postId = guidMatch && guidMatch[1] 
        ? guidMatch[1].split('/').pop() || `rss_${Date.now()}_${index}`
        : `rss_${Date.now()}_${index}`
      
      // Parse publish date
      let publishDate = new Date().toISOString()
      if (pubDateMatch && pubDateMatch[1]) {
        try {
          publishDate = new Date(pubDateMatch[1]).toISOString()
        } catch (e) {
          // Keep current date if parsing fails
        }
      }
      
      // Skip if no meaningful content
      if (!content || content.length < 10) return
      
      posts.push({
        id: postId,
        platform: 'weibo',
        author: 'Kelly Yu Wenwen',
        text: content,
        media: mediaUrls.map(url => ({
          type: 'image' as const,
          src: `/api/media-proxy?url=${encodeURIComponent(url)}`,
          alt: 'Kelly Yu Wenwen post image'
        })),
        url: linkMatch && linkMatch[1] ? linkMatch[1] : `https://weibo.com/${KELLY_WEIBO_UID}/O${postId}`,
        publishedAt: publishDate,
        likes: 0,
        comments: 0,
        shares: 0,
        source: 'rsshub'
      })
    })
    
    return posts
  } catch (error) {
    console.error('RSS parsing error:', error instanceof Error ? error.message : String(error))
    return []
  }
}

// Try multiple RSS sources with timeout
async function fetchFromRSSSources(): Promise<ParsedPost[]> {
  const timeout = 8000 // 8 second timeout per source
  
  for (const rssUrl of RSS_SOURCES) {
    try {
      console.log(`Trying RSS source: ${rssUrl}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        next: { revalidate: 300 } // Cache for 5 minutes
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const xmlText = await response.text()
        
        // Check if response contains valid RSS/XML
        if (xmlText.includes('<rss') || xmlText.includes('<feed') || xmlText.includes('<item>')) {
          const posts = parseRSSXML(xmlText)
          
          if (posts.length > 0) {
            console.log(`✅ Successfully fetched ${posts.length} posts from ${rssUrl}`)
            return posts
          }
        }
      }
      
      console.log(`❌ No valid data from ${rssUrl}`)
      
    } catch (error) {
      console.log(`❌ Error with ${rssUrl}:`, error instanceof Error ? error.message : String(error))
      continue
    }
  }
  
  return []
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching Kelly\'s live Weibo data...')
    
    // Try RSS sources first
    const rssPosts = await fetchFromRSSSources()
    
    if (rssPosts.length > 0) {
      // Sort by publish date (newest first)
      rssPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      
      return NextResponse.json({
        success: true,
        data: rssPosts,
        source: 'rsshub_live',
        profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
        lastUpdated: new Date().toISOString(),
        note: `Live data from Kelly's Weibo via RSS feeds`,
        postsFound: rssPosts.length
      })
    }
    
    // No fallback mock data - return empty if RSS fails
    console.log('⚠️ RSS sources failed, returning empty data (no mock fallback)')
    
    return NextResponse.json({
      success: true,
      data: [],
      source: 'empty',
      profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
      lastUpdated: new Date().toISOString(),
      note: 'RSS feeds unavailable, no mock data provided',
      postsFound: 0
    })
    
  } catch (error) {
    console.error('❌ Critical error in kelly-live API:', error instanceof Error ? error.message : String(error))
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Kelly\'s posts',
      data: [],
      source: 'error',
      note: 'All data sources failed'
    }, { status: 500 })
  }
}