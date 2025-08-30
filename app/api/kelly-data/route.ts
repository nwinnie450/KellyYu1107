import { NextRequest, NextResponse } from 'next/server'

const KELLY_WEIBO_UID = '6465429977'

// Try multiple data sources in priority order
async function fetchKellyData() {
  const dataSources = []
  
  // Method 1: Try RSSHub (may work without login)
  try {
    const rssResponse = await fetch(`https://rsshub.app/weibo/user/${KELLY_WEIBO_UID}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (rssResponse.ok) {
      const rssText = await rssResponse.text()
      
      // Simple RSS parsing
      const items = rssText.match(/<item>([\s\S]*?)<\/item>/g) || []
      
      if (items.length > 0) {
        const posts = items.slice(0, 5).map((item: string, index: number) => {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
          const linkMatch = item.match(/<link>(.*?)<\/link>/)
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
          
          return {
            id: `rss_${Date.now()}_${index}`,
            platform: 'weibo',
            author: 'Kelly Yu Wenwen',
            text: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '',
            media: [],
            url: linkMatch ? linkMatch[1] : `https://weibo.com/u/${KELLY_WEIBO_UID}`,
            publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            likes: 0,
            comments: 0,
            shares: 0,
            source: 'rsshub'
          }
        })
        
        dataSources.push({
          source: 'rsshub',
          posts: posts,
          success: true
        })
      }
    }
  } catch (rssError) {
    console.log('RSSHub failed:', rssError instanceof Error ? rssError.message : String(rssError))
  }
  
  // Method 2: Try alternative RSS services
  try {
    const altServices = [
      'https://feeds.pub/weibo/6465429977',
      'https://api.rss2json.com/v1/api.json?rss_url=https://rsshub.app/weibo/user/6465429977'
    ]
    
    for (const serviceUrl of altServices) {
      try {
        const response = await fetch(serviceUrl, {
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.items && data.items.length > 0) {
            dataSources.push({
              source: 'alternative_rss',
              posts: data.items.slice(0, 5).map((item: any, index: number) => ({
                id: `alt_${Date.now()}_${index}`,
                platform: 'weibo',
                author: 'Kelly Yu Wenwen',
                text: item.title || item.description || '',
                media: [],
                url: item.link || `https://weibo.com/u/${KELLY_WEIBO_UID}`,
                publishedAt: item.pubDate || new Date().toISOString(),
                likes: 0,
                comments: 0,
                shares: 0,
                source: 'alternative_rss'
              })),
              success: true
            })
            break
          }
        }
      } catch (serviceError) {
        continue
      }
    }
  } catch (altError) {
    console.log('Alternative RSS failed:', altError instanceof Error ? altError.message : String(altError))
  }
  
  return dataSources
}

export async function GET(request: NextRequest) {
  try {
    // Try to get real data from multiple sources
    const dataSources = await fetchKellyData()
    
    if (dataSources.length > 0) {
      // Use the first successful data source
      const bestSource = dataSources[0]
      
      return NextResponse.json({
        success: true,
        data: bestSource.posts,
        source: bestSource.source,
        profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
        lastUpdated: new Date().toISOString(),
        note: `Data fetched from ${bestSource.source}`,
        alternatives: dataSources.length
      })
    }
    
    // Fallback when no data sources are available
    return NextResponse.json({
      success: true,
      data: [],
      source: 'none',
      profile: `https://weibo.com/u/${KELLY_WEIBO_UID}`,
      lastUpdated: new Date().toISOString(),
      note: 'Real data sources unavailable. No mock data is being used.'
    })
    
  } catch (error) {
    console.error('Error fetching Kelly data:', error instanceof Error ? error.message : String(error))
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data',
      data: [],
      note: 'All data sources failed'
    }, { status: 500 })
  }
}