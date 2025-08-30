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
    
    console.log('📱 Trying mobile JSON API approach for:', url)

    // Mobile Weibo JSON endpoints to try
    const mobileEndpoints = [
      `https://m.weibo.cn/api/container/getIndex?type=uid&value=${userId}`,
      `https://m.weibo.cn/api/statuses/show?id=${weiboId}`,
      `https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D1%26q%3D${encodeURIComponent('Kelly Yu 于文文')}`,
      `https://m.weibo.cn/api/container/getIndex?containerid=102803&since_id=0`,
      `https://weibo.cn/ajax/statuses/show?id=${weiboId}`
    ]

    let foundData = false
    let postData = null

    for (const endpoint of mobileEndpoints) {
      console.log(`📱 Trying mobile JSON endpoint: ${endpoint}`)
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://m.weibo.cn/',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 10000
        })

        if (!response.ok) {
          console.log(`❌ ${endpoint} returned ${response.status}`)
          continue
        }

        const data = await response.json()
        console.log(`📱 Mobile JSON response structure:`, Object.keys(data))

        // Parse mobile JSON structure
        if (data && data.data) {
          // Method 1: Direct post data
          if (data.data.text) {
            console.log('🔍 Direct post data keys:', Object.keys(data.data))
            console.log('🔍 mblogtype:', data.data.mblogtype)
            console.log('🔍 pic_ids:', data.data.pic_ids)
            console.log('🔍 url_objects:', data.data.url_objects?.length || 'none')
            if (data.data.page_info) {
              console.log('🔍 page_info type:', data.data.page_info.type)
            }
            postData = extractPostFromData(data.data, url)
            foundData = true
            console.log('✅ Found direct post data!')
            break
          }
          
          // Method 2: Cards/statuses array
          else if (data.data.cards) {
            for (const card of data.data.cards) {
              if (card.mblog && card.mblog.id === weiboId) {
                postData = extractPostFromData(card.mblog, url)
                foundData = true
                console.log('✅ Found post in cards array!')
                break
              }
            }
          }
          
          // Method 3: Statuses array
          else if (data.data.statuses) {
            for (const status of data.data.statuses) {
              if (status.id === weiboId || status.idstr === weiboId) {
                postData = extractPostFromData(status, url)
                foundData = true
                console.log('✅ Found post in statuses array!')
                break
              }
            }
          }
        }

        // Method 4: Root level post data
        if (!foundData && data.text) {
          postData = extractPostFromData(data, url)
          foundData = true
          console.log('✅ Found root level post data!')
          break
        }

        if (foundData) break

      } catch (error) {
        console.log(`❌ Mobile JSON endpoint ${endpoint} failed:`, error.message)
        continue
      }
    }

    if (foundData && postData) {
      return NextResponse.json({
        success: true,
        data: {
          weiboId: weiboId,
          platform: 'weibo',
          url: url,
          publishedAt: postData.publishedAt || new Date().toISOString(),
          text: postData.text || '',
          originalText: postData.text || '',
          media: postData.media || [],
          engagement: postData.engagement || { likes: 0, comments: 0, shares: 0 },
          verified: true
        },
        message: `📱 Mobile JSON Success! Found ${postData.text?.length || 0} chars, ${postData.media?.length || 0} media`,
        scraped: {
          textLength: postData.text?.length || 0,
          imageCount: postData.media?.length || 0,
          engagement: postData.engagement || { likes: 0, comments: 0, shares: 0 },
          method: 'mobile_json'
        }
      })
    }

    // No mobile JSON data found
    return NextResponse.json({
      success: false,
      error: 'No mobile JSON data found for this post',
      message: 'Mobile JSON endpoints did not return content for this specific post'
    }, { status: 404 })

  } catch (error) {
    console.error('Mobile JSON fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Mobile JSON fetch failed: ' + error.message
    }, { status: 500 })
  }
}

function extractPostFromData(data: any, originalUrl: string) {
  // Extract text content
  let text = data.text || data.raw_text || ''
  if (typeof text === 'string') {
    text = text.replace(/<[^>]*>/g, '').trim()
  }

  // Extract media (images/videos)
  const media: any[] = []
  
  // Pictures - but check if any are actually videos/GIFs
  if (data.pic_urls && Array.isArray(data.pic_urls)) {
    for (const pic of data.pic_urls) {
      // Check if this is actually a video or GIF
      const isVideo = pic.url?.includes('.mp4') || pic.url?.includes('.mov') || 
                     pic.large_pic?.includes('.mp4') || pic.large_pic?.includes('.mov')
      const isLivePhoto = pic.type === 'livephoto' || pic.live_photo
      
      if (isVideo || isLivePhoto) {
        console.log('🎥 Found video/live photo in pic_urls:', pic)
        media.push({
          type: 'video' as const,
          src: pic.large_pic || pic.url || pic,
          originalSrc: pic.original_pic || pic.large_pic || pic.url || pic,
          poster: pic.thumbnail_pic
        })
      } else {
        media.push({
          type: 'image' as const,
          src: pic.thumbnail_pic || pic.url || pic,
          originalSrc: pic.original_pic || pic.large_pic || pic.url || pic,
          alt: 'Kelly Yu Wenwen post image'
        })
      }
    }
  }
  
  // Alternative picture format
  if (data.pics && Array.isArray(data.pics)) {
    for (const pic of data.pics) {
      media.push({
        type: 'image' as const,
        src: pic.url || pic.pic?.url,
        originalSrc: pic.large?.url || pic.url,
        alt: 'Kelly Yu Wenwen post image'
      })
    }
  }

  // Enhanced video detection (multiple sources)
  if (data.page_info && data.page_info.type === 'video') {
    const videoInfo = data.page_info.media_info || {}
    media.push({
      type: 'video' as const,
      src: videoInfo.mp4_720p_mp4 || videoInfo.mp4_sd_url || videoInfo.stream_url || videoInfo.mp4_url,
      originalSrc: videoInfo.mp4_hd_url || videoInfo.mp4_720p_mp4 || videoInfo.stream_url_hd,
      poster: data.page_info.pic || videoInfo.cover_image || videoInfo.kol_title
    })
    console.log('🎥 Found video:', videoInfo)
  }
  
  // Check for video in url_objects (common Weibo video format)
  if (data.url_objects && Array.isArray(data.url_objects)) {
    console.log(`🔍 Checking ${data.url_objects.length} url_objects for video content`)
    for (const urlObj of data.url_objects) {
      console.log('🔍 url_object keys:', Object.keys(urlObj))
      console.log('🔍 url_object has page_info:', !!urlObj.page_info)
      console.log('🔍 url_object has object:', !!urlObj.object)
      if (urlObj.object && typeof urlObj.object === 'object') {
        console.log('🔍 url_object.object keys:', Object.keys(urlObj.object))
        if (urlObj.object.object_type === 'video' || urlObj.object.scheme?.includes('video')) {
          console.log('🎥 Found video in object structure!')
          // Try to extract video data from this structure
          const videoData = urlObj.object
          media.push({
            type: 'video' as const,
            src: videoData.stream_url || videoData.mp4_url || videoData.video_url || videoData.media_url,
            originalSrc: videoData.hd_url || videoData.stream_url || videoData.mp4_url,
            poster: videoData.pic || videoData.cover_url || videoData.thumbnail
          })
        }
      }
      if (urlObj.page_info) {
        console.log('🔍 url_object page_info type:', urlObj.page_info.type)
        if (urlObj.page_info.type === 'video') {
          const videoInfo = urlObj.page_info.media_info || {}
          media.push({
            type: 'video' as const,
            src: videoInfo.mp4_720p_mp4 || videoInfo.mp4_sd_url || videoInfo.stream_url,
            originalSrc: videoInfo.mp4_hd_url || videoInfo.mp4_720p_mp4,
            poster: urlObj.page_info.pic || videoInfo.cover_image
          })
          console.log('🎥 Found video in url_objects:', videoInfo)
        }
      }
    }
  }
  
  // Check for embedded video content
  if (data.video_details) {
    media.push({
      type: 'video' as const,
      src: data.video_details.video_url || data.video_details.stream_url,
      originalSrc: data.video_details.hd_url || data.video_details.video_url,
      poster: data.video_details.pic || data.video_details.cover_url
    })
    console.log('🎥 Found embedded video:', data.video_details)
  }
  
  // Check for video URLs in different common Weibo structures
  if (data.url_struct && Array.isArray(data.url_struct)) {
    for (const urlStruct of data.url_struct) {
      if (urlStruct.url_type_pic && urlStruct.url_type_pic.includes('video')) {
        media.push({
          type: 'video' as const,
          src: urlStruct.ori_url || urlStruct.short_url || urlStruct.url_title,
          originalSrc: urlStruct.ori_url || urlStruct.short_url,
          poster: urlStruct.pic || urlStruct.url_type_pic
        })
        console.log('🎥 Found video in url_struct:', urlStruct)
      }
    }
  }
  
  // Check for live photo videos (common in Weibo)
  if (data.live_photo && data.live_photo.length > 0) {
    for (const livePhoto of data.live_photo) {
      media.push({
        type: 'video' as const,
        src: livePhoto.video_url || livePhoto.mp4_url,
        originalSrc: livePhoto.hd_video_url || livePhoto.video_url,
        poster: livePhoto.pic_info?.pic || livePhoto.thumbnail
      })
      console.log('🎥 Found live photo video:', livePhoto)
    }
  }
  
  // Alternative video check - look in text for video indicators and extract more data
  if (text.includes('视频') || text.includes('播放') || data.mblogtype === 'video' || data.objecttype === 'video') {
    console.log('📹 Post contains video indicators, checking for video URLs...')
    // Log the full data structure for debugging video posts
    console.log('🔍 Video post data keys:', Object.keys(data))
    if (data.page_info) {
      console.log('🔍 page_info structure:', Object.keys(data.page_info))
      if (data.page_info.media_info) {
        console.log('🔍 media_info keys:', Object.keys(data.page_info.media_info))
      }
    }
    
    // Sometimes video URLs are in different locations, try to find them
    const possibleVideoKeys = ['video_url', 'stream_url', 'mp4_url', 'mp4_720p_mp4', 'mp4_sd_url']
    for (const key of possibleVideoKeys) {
      if (data[key]) {
        console.log(`🎥 Found video URL in data.${key}:`, data[key])
        media.push({
          type: 'video' as const,
          src: data[key],
          originalSrc: data[key],
          poster: data.pic || data.cover_image
        })
        break
      }
    }
    
    // Check if no video found but post is definitely a video type
    if (media.filter(m => m.type === 'video').length === 0) {
      console.log('⚠️ Video post detected but no video URLs found. Full data structure:')
      console.log(JSON.stringify(data, null, 2))
    }
  }
  
  // Final check for any media_info nested in various locations
  if (data.retweeted_status && data.retweeted_status.page_info && data.retweeted_status.page_info.type === 'video') {
    const videoInfo = data.retweeted_status.page_info.media_info || {}
    media.push({
      type: 'video' as const,
      src: videoInfo.mp4_720p_mp4 || videoInfo.mp4_sd_url || videoInfo.stream_url,
      originalSrc: videoInfo.mp4_hd_url || videoInfo.mp4_720p_mp4,
      poster: data.retweeted_status.page_info.pic || videoInfo.cover_image
    })
    console.log('🎥 Found video in retweeted status:', videoInfo)
  }

  // Extract engagement numbers
  const engagement = {
    likes: parseInt(data.attitudes_count || data.attitude_count || '0') || 0,
    comments: parseInt(data.comments_count || data.comment_count || '0') || 0,
    shares: parseInt(data.reposts_count || data.repost_count || '0') || 0
  }

  // Extract publish date
  let publishedAt = new Date().toISOString()
  if (data.created_at) {
    try {
      publishedAt = new Date(data.created_at).toISOString()
    } catch {
      // Keep default if parsing fails
    }
  }

  console.log(`📊 Final extraction results:`)
  console.log(`   Text: ${text.length} chars`)
  console.log(`   Media: ${media.length} items`)
  media.forEach((item, i) => {
    console.log(`   [${i}] Type: ${item.type}, Src: ${item.src?.substring(0, 50)}...`)
  })

  return {
    text: text,
    media: media,
    engagement: engagement,
    publishedAt: publishedAt,
    url: originalUrl
  }
}