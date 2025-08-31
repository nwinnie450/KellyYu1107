// app/api/douyin/scrape/route.ts
import { NextRequest } from 'next/server'

interface DouyinScrapedData {
  success: boolean
  data?: {
    text: string
    title: string
    author: string
    hashtags: string[]
    publishedAt: string
    url: string
    videoUrl?: string
    thumbnail?: string
    engagement?: {
      likes: number
      comments: number
      shares: number
    }
  }
  error?: string
  method: string
}

// Method 1: Try to extract content from resolved URL HTML
async function scrapeDouyinHTML(url: string): Promise<DouyinScrapedData> {
  try {
    console.log('🎵 Method 1: HTML scraping for:', url)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log('📄 HTML length:', html.length)

    // Try to extract JSON data from script tags - try multiple patterns
    const jsonMatch = html.match(/<script[^>]*>window\._ROUTER_DATA\s*=\s*({.+?})<\/script>/s) ||
                     html.match(/<script[^>]*>window\.INITIAL_STATE\s*=\s*({.+?})<\/script>/s) ||
                     html.match(/window\.__INITIAL_SSR_STATE__\s*=\s*({.+?});/s) ||
                     html.match(/<script[^>]*>\s*self\.__next_f\.push\(\[1,"(.+?)"\]\)/s) ||
                     html.match(/window\.__NUXT__\s*=\s*({.+?});/s)

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        console.log('📊 Found JSON data structure')
        
        // Navigate through Douyin's data structure - try multiple paths
        let videoData = data?.app?.videoDetail || data?.videoDetail || data?.awemeDetail || data
        
        // Try nested structures common in Douyin
        if (!videoData?.desc && data?.loaderData) {
          const loaderKeys = Object.keys(data.loaderData);
          for (const key of loaderKeys) {
            if (data.loaderData[key]?.videoDetail) {
              videoData = data.loaderData[key].videoDetail;
              break;
            }
          }
        }
        
        // Try to find aweme data in various locations
        if (!videoData?.desc && data?.props?.pageProps?.videoDetail) {
          videoData = data.props.pageProps.videoDetail;
        }
        
        // Extract video info
        const desc = videoData?.desc || videoData?.title || videoData?.content || '';
        const createTime = videoData?.createTime || videoData?.create_time || videoData?.publishTime;
        
        console.log('🔍 Douyin data structure found:', {
          hasDesc: !!desc,
          hasCreateTime: !!createTime,
          hasStats: !!videoData?.stats,
          dataKeys: Object.keys(videoData || {}).slice(0, 10)
        });
        
        return {
          success: true,
          data: {
            text: desc,
            title: desc,
            author: videoData?.author?.nickname || videoData?.authorInfo?.nickname || 'Kelly于文文',
            hashtags: extractHashtagsFromText(desc),
            publishedAt: createTime ? new Date(createTime * 1000).toISOString() : '',
            url: url,
            videoUrl: videoData?.video?.playUrl || videoData?.video?.play_url || videoData?.playUrl || '',
            thumbnail: videoData?.video?.cover || videoData?.video?.origin_cover?.url_list?.[0] || videoData?.cover || '',
            engagement: {
              likes: parseInt(videoData?.stats?.diggCount || videoData?.statistics?.digg_count || '0'),
              comments: parseInt(videoData?.stats?.commentCount || videoData?.statistics?.comment_count || '0'),
              shares: parseInt(videoData?.stats?.shareCount || videoData?.statistics?.share_count || '0')
            }
          },
          method: 'HTML + JSON extraction'
        }
      } catch (parseError) {
        console.log('❌ JSON parse failed:', parseError)
      }
    }

    // Fallback: Try to extract from meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i)
    
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)

    // Try to extract visible text content that looks like a video description
    const contentPatterns = [
      /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)</gi,
      /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</gi,
      /<span[^>]*class="[^"]*text[^"]*"[^>]*>([^<]+)</gi,
    ];
    
    let extractedText = '';
    for (const pattern of contentPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const text = match[1].trim();
        if (text.length > extractedText.length && text.length > 10) {
          extractedText = text;
        }
      }
    }

    if (titleMatch || descMatch || extractedText) {
      const title = titleMatch ? titleMatch[1] : ''
      const desc = extractedText || (descMatch ? descMatch[1] : '')
      
      return {
        success: true,
        data: {
          text: desc || title,
          title: title,
          author: 'Kelly于文文',
          hashtags: extractHashtagsFromText(desc || title),
          publishedAt: '',
          url: url
        },
        method: 'Meta tags + content extraction'
      }
    }

    throw new Error('No extractable content found')

  } catch (error) {
    console.log('❌ HTML scraping failed:', error)
    return {
      success: false,
      error: `HTML scraping failed: ${error}`,
      method: 'HTML scraping'
    }
  }
}

// Method 2: Try alternative API endpoints
async function scrapeDouyinAPI(videoId: string): Promise<DouyinScrapedData> {
  try {
    console.log('🎵 Method 2: API scraping for video ID:', videoId)
    
    // Try different API endpoints that might work
    const apiUrls = [
      `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
      `https://www.douyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
    ]

    for (const apiUrl of apiUrls) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.douyin.com/',
          }
        })

        if (response.ok) {
          const data = await response.json()
          const itemList = data?.item_list || data?.aweme_list || []
          
          if (itemList.length > 0) {
            const item = itemList[0]
            
            return {
              success: true,
              data: {
                text: item.desc || '',
                title: item.desc || '',
                author: item?.author?.nickname || 'Kelly于文文',
                hashtags: extractHashtagsFromText(item.desc || ''),
                publishedAt: item.create_time ? new Date(item.create_time * 1000).toISOString() : '',
                url: `https://www.douyin.com/video/${videoId}`,
                engagement: {
                  likes: item?.statistics?.digg_count || 0,
                  comments: item?.statistics?.comment_count || 0,
                  shares: item?.statistics?.share_count || 0
                }
              },
              method: 'API endpoint'
            }
          }
        }
      } catch (apiError) {
        console.log(`❌ API ${apiUrl} failed:`, apiError)
        continue
      }
    }

    throw new Error('All API endpoints failed')

  } catch (error) {
    return {
      success: false,
      error: `API scraping failed: ${error}`,
      method: 'API scraping'
    }
  }
}

// Helper function to extract hashtags from text
function extractHashtagsFromText(text: string): string[] {
  const hashtagMatches = text.match(/#[^#\s\n]+/g) || []
  return hashtagMatches.map(tag => tag.replace(/^#/, ''))
}

// Helper function to extract video ID from various Douyin URL formats
function extractDouyinVideoId(url: string): string | null {
  // Try different patterns
  const patterns = [
    /\/video\/(\d+)/,
    /\/share\/video\/(\d+)/,
    /item_ids=(\d+)/,
    /aweme\/v1\/aweme\/detail\/\?aweme_id=(\d+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return Response.json({
        success: false,
        error: "URL is required"
      })
    }

    console.log('🎵 Starting Douyin scraping for:', url)

    // Method 1: Try HTML scraping
    let result = await scrapeDouyinHTML(url)
    
    if (result.success) {
      console.log('✅ HTML scraping succeeded!')
      return Response.json(result)
    }

    // Method 2: Try API scraping if we can extract video ID
    const videoId = extractDouyinVideoId(url)
    if (videoId) {
      console.log('🎵 Trying API scraping with video ID:', videoId)
      result = await scrapeDouyinAPI(videoId)
      
      if (result.success) {
        console.log('✅ API scraping succeeded!')
        return Response.json(result)
      }
    }

    // If all methods fail, return error
    return Response.json({
      success: false,
      error: "All scraping methods failed. Douyin content may be protected or URL invalid.",
      attempted_methods: ['HTML scraping', 'API endpoints'],
      suggestion: "Try manually copying the content from the Douyin post"
    })

  } catch (error) {
    console.error('Error in Douyin scraping:', error)
    return Response.json({
      success: false,
      error: "Internal server error during scraping"
    })
  }
}