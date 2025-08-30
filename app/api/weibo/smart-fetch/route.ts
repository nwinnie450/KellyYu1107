import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  let browser = null
  
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
        error: 'Invalid Weibo post URL format. Expected: weibo.com/6465429977/O123...'
      }, { status: 400 })
    }

    const weiboId = match[1]
    
    console.log('🤖 Smart Browser Automation starting for:', url)

    // Launch browser with mobile emulation
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      ]
    })

    const page = await browser.newPage()
    
    // Set mobile viewport and user agent
    await page.setViewport({ width: 375, height: 667, isMobile: true })
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1')

    // Try different URL formats
    const urlsToTry = [
      `https://m.weibo.cn/detail/${weiboId}`, // Mobile format
      `https://weibo.cn/status/${weiboId}`, // Simple mobile
      url // Original URL
    ]

    let postText = ''
    let images: string[] = []
    let engagement = { likes: 0, comments: 0, shares: 0 }
    let foundContent = false

    for (const testUrl of urlsToTry) {
      console.log(`🔍 Trying URL: ${testUrl}`)
      
      try {
        await page.goto(testUrl, { 
          waitUntil: 'networkidle0', 
          timeout: 15000 
        })

        // Wait for content to load
        await page.waitForTimeout(3000)

        // Try to extract post text
        const textSelectors = [
          '.weibo-text',
          '.m-text-box',
          '.txt',
          '[class*="text"]',
          '.status-content',
          '.feed-content'
        ]

        for (const selector of textSelectors) {
          try {
            const elements = await page.$$(selector)
            for (const element of elements) {
              const text = await page.evaluate(el => el.textContent?.trim(), element)
              if (text && text.length > postText.length) {
                postText = text
                foundContent = true
                console.log(`✅ Found text with selector ${selector}: ${text.substring(0, 100)}...`)
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        // Extract images
        const imgSelectors = [
          'img[src*="sinaimg.cn"]',
          'img[src*="weibo.com"]',
          '.pic img',
          '.media img'
        ]

        for (const selector of imgSelectors) {
          try {
            const imgElements = await page.$$(selector)
            for (const img of imgElements) {
              const src = await page.evaluate(el => el.getAttribute('src'), img)
              if (src && !images.includes(src)) {
                const fullSrc = src.startsWith('//') ? 'https:' + src : src
                images.push(fullSrc)
                console.log(`📷 Found image: ${fullSrc}`)
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        // Try to extract engagement numbers
        try {
          const engagementText = await page.evaluate(() => {
            return document.body.textContent || ''
          })
          
          // Look for Chinese engagement indicators
          const likeMatch = engagementText.match(/(\d+)\s*赞/i) || engagementText.match(/点赞\s*(\d+)/i)
          const commentMatch = engagementText.match(/(\d+)\s*评论/i) || engagementText.match(/评论\s*(\d+)/i)
          const shareMatch = engagementText.match(/(\d+)\s*转发/i) || engagementText.match(/转发\s*(\d+)/i)
          
          if (likeMatch) engagement.likes = parseInt(likeMatch[1]) || 0
          if (commentMatch) engagement.comments = parseInt(commentMatch[1]) || 0
          if (shareMatch) engagement.shares = parseInt(shareMatch[1]) || 0
          
          console.log(`📊 Engagement: ${engagement.likes} likes, ${engagement.comments} comments, ${engagement.shares} shares`)
        } catch (e) {
          console.log('Could not extract engagement numbers')
        }

        if (foundContent) break // Found content, no need to try other URLs

      } catch (error) {
        console.log(`❌ Failed to load ${testUrl}:`, error.message)
        continue
      }
    }

    await browser.close()

    // Prepare media array
    const media = images.map(src => ({
      type: 'image' as const,
      src: src,
      originalSrc: src,
      alt: 'Kelly Yu Wenwen post image'
    }))

    if (foundContent) {
      console.log('🎉 Smart automation successful!')
      return NextResponse.json({
        success: true,
        data: {
          weiboId: weiboId,
          platform: 'weibo',
          url: url,
          publishedAt: new Date().toISOString(),
          text: postText || '',
          originalText: postText || '',
          media: media,
          engagement: engagement,
          verified: true
        },
        message: `🤖 Smart Browser Success! Found ${postText.length} chars, ${images.length} images, engagement: ${engagement.likes}/${engagement.comments}/${engagement.shares}`,
        scraped: {
          textLength: postText.length,
          imageCount: images.length,
          engagement: engagement,
          method: 'browser_automation'
        }
      })
    } else {
      // Fallback to manual guidance
      return NextResponse.json({
        success: true,
        data: {
          weiboId: weiboId,
          platform: 'weibo',
          url: url,
          publishedAt: new Date().toISOString(),
          text: '',
          originalText: '',
          media: [],
          engagement: { likes: 0, comments: 0, shares: 0 },
          verified: true
        },
        message: '⚠️ Browser automation couldn\'t extract content. Try manual method.',
        smartAssistant: true
      })
    }

  } catch (error) {
    console.error('Browser automation error:', error)
    
    if (browser) {
      await browser.close()
    }
    
    return NextResponse.json({
      success: false,
      error: 'Browser automation failed: ' + error.message
    }, { status: 500 })
  }
}