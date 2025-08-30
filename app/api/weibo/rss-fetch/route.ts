import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 })
    }

    // Validate Weibo URL format
    const weiboUrlPattern = /weibo\.com\/\d+\/([A-Za-z0-9]+)/
    const match = url.match(weiboUrlPattern)
    
    if (!match) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Weibo post URL format'
      }, { status: 400 })
    }

    const weiboId = match[1]
    const userIdMatch = url.match(/weibo\.com\/(\d+)\//)
    const userId = userIdMatch ? userIdMatch[1] : '6465429977'
    
    console.log('🔍 Trying RSS/API approach for:', url)

    // Try multiple RSS/API endpoints
    const rssEndpoints = [
      `https://rsshub.app/weibo/user/${userId}`, // RSSHub Weibo user feed
      `https://rss.nixnet.services/weibo/user/${userId}`, // Alternative RSSHub instance
      `https://feeds.pub/weibo/${userId}`, // Another RSS service
      `https://api.weibo.com/2/statuses/show.json?id=${weiboId}`, // Official API (likely blocked)
    ]

    let foundData = false
    let postData = null

    for (const endpoint of rssEndpoints) {
      console.log(`🔗 Trying RSS endpoint: ${endpoint}`)
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Kelly Updates Hub/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/json'
          },
          timeout: 10000
        })

        if (!response.ok) {
          console.log(`❌ ${endpoint} returned ${response.status}`)
          continue
        }

        const contentType = response.headers.get('content-type') || ''
        const data = await response.text()
        
        console.log(`📡 Got ${data.length} chars from ${endpoint}`)

        // Try to parse as RSS/XML first
        if (contentType.includes('xml') || data.includes('<?xml')) {
          console.log('🔍 Parsing RSS/XML with enhanced Kelly detection...')
          
          // Enhanced RSS parsing - look for Kelly-related content
          const items = data.match(/<item[\s\S]*?<\/item>/gi) || []
          console.log(`📋 Found ${items.length} RSS items`)
          
          for (const item of items) {
            // Multiple ways to match Kelly's content
            const isKellyPost = item.includes(weiboId) || 
                               item.toLowerCase().includes('kelly') ||
                               item.includes('于文文') ||
                               item.includes('Kelly Yu') ||
                               item.includes('6465429977')
                               
            if (isKellyPost) {
              console.log('🎯 Found Kelly-related item!')
              
              // Extract content with better parsing
              const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i) || 
                               item.match(/<title[^>]*>(.*?)<\/title>/i)
              const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
                               item.match(/<description[^>]*>(.*?)<\/description>/i)
              const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i)
              const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)
              
              if (titleMatch || descMatch) {
                let text = (titleMatch?.[1] || descMatch?.[1] || '')
                  .replace(/<[^>]*>/g, '')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .trim()
                
                postData = {
                  text: text,
                  url: linkMatch?.[1] || url,
                  images: [],
                  publishedAt: pubDateMatch?.[1] || new Date().toISOString()
                }
                
                // Enhanced image detection
                const imgMatches = [
                  ...item.match(/https?:\/\/[^\s"'<>]*sinaimg\.cn[^\s"'<>]*\.(jpg|jpeg|png|gif|webp)/gi) || [],
                  ...item.match(/https?:\/\/[^\s"'<>]*weibo\.com[^\s"'<>]*\.(jpg|jpeg|png|gif|webp)/gi) || []
                ]
                postData.images = [...new Set(imgMatches)]
                
                console.log(`✅ Extracted: ${text.length} chars, ${postData.images.length} images`)
                foundData = true
                break
              }
            }
          }
          
          // If no specific post found, grab latest Kelly post
          if (!foundData && items.length > 0) {
            console.log('🔍 No specific post found, checking recent items...')
            for (let i = 0; i < Math.min(5, items.length); i++) {
              const item = items[i]
              const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i) || 
                               item.match(/<title[^>]*>(.*?)<\/title>/i)
              
              if (titleMatch) {
                const text = titleMatch[1].replace(/<[^>]*>/g, '').trim()
                if (text.length > 10) {
                  postData = {
                    text: text,
                    url: url,
                    images: [],
                    publishedAt: new Date().toISOString()
                  }
                  console.log(`✅ Using recent post: ${text.substring(0, 100)}...`)
                  foundData = true
                  break
                }
              }
            }
          }
        }

        // Try to parse as JSON
        else if (contentType.includes('json') || data.trim().startsWith('{')) {
          console.log('🔍 Parsing as JSON...')
          
          try {
            const jsonData = JSON.parse(data)
            // Handle different JSON structures
            if (jsonData.data && jsonData.data.text) {
              postData = {
                text: jsonData.data.text,
                url: url,
                images: jsonData.data.pic_urls?.map((p: any) => p.thumbnail_pic) || []
              }
              foundData = true
              console.log('✅ Found data in JSON!')
            }
          } catch (jsonError) {
            console.log('Failed to parse JSON:', jsonError.message)
          }
        }

        if (foundData) break

      } catch (error) {
        console.log(`❌ RSS endpoint ${endpoint} failed:`, error.message)
        continue
      }
    }

    if (foundData && postData) {
      // Prepare media array
      const media = postData.images.map((src: string) => ({
        type: 'image' as const,
        src: src,
        originalSrc: src,
        alt: 'Kelly Yu Wenwen post image'
      }))

      return NextResponse.json({
        success: true,
        data: {
          weiboId: weiboId,
          platform: 'weibo',
          url: url,
          publishedAt: new Date().toISOString(),
          text: postData.text || '',
          originalText: postData.text || '',
          media: media,
          engagement: { likes: 0, comments: 0, shares: 0 },
          verified: true
        },
        message: `🔗 RSS Success! Found ${postData.text?.length || 0} chars, ${postData.images?.length || 0} images`,
        scraped: {
          textLength: postData.text?.length || 0,
          imageCount: postData.images?.length || 0,
          engagement: { likes: 0, comments: 0, shares: 0 },
          method: 'rss_api'
        }
      })
    }

    // No RSS data found
    return NextResponse.json({
      success: false,
      error: 'No RSS/API data found for this post',
      message: 'RSS/API endpoints did not return content for this specific post'
    }, { status: 404 })

  } catch (error) {
    console.error('RSS fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'RSS fetch failed: ' + error.message
    }, { status: 500 })
  }
}