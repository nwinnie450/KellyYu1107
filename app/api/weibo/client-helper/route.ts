import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, clientData } = await request.json()
    
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

    // If client provided data (from browser extension or client-side script)
    if (clientData) {
      console.log('🌐 Client-side data received:', {
        textLength: clientData.text?.length || 0,
        imageCount: clientData.images?.length || 0,
        hasEngagement: Boolean(clientData.engagement)
      })

      // Prepare media array
      const media = (clientData.images || []).map((src: string) => ({
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
          publishedAt: clientData.publishedAt || new Date().toISOString(),
          text: clientData.text || '',
          originalText: clientData.text || '',
          media: media,
          engagement: clientData.engagement || { likes: 0, comments: 0, shares: 0 },
          verified: true
        },
        message: `🌐 Client Helper Success! Processed ${clientData.text?.length || 0} chars, ${media.length} images`,
        scraped: {
          textLength: clientData.text?.length || 0,
          imageCount: media.length,
          engagement: clientData.engagement || { likes: 0, comments: 0, shares: 0 },
          method: 'client_helper'
        }
      })
    }

    // No client data - return instructions for client-side extraction
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
      clientHelper: true,
      instructions: {
        message: 'Run this JavaScript in your browser console on the Weibo post page:',
        script: `
// Kelly Weibo Client Helper Script
(function() {
  console.log('🔍 Kelly Client Helper - Extracting Weibo content...');
  
  // Extract post text
  const textSelectors = ['.WB_text', '.weibo-text', '.txt', '[class*="text"]'];
  let postText = '';
  
  for (const selector of textSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (text && text.length > postText.length) {
        postText = text;
      }
    }
  }
  
  // Extract images
  const images = [];
  const imgElements = document.querySelectorAll('img[src*="sinaimg.cn"], img[src*="weibo.com"]');
  for (const img of imgElements) {
    if (img.src && !images.includes(img.src)) {
      images.push(img.src);
    }
  }
  
  // Extract engagement
  const bodyText = document.body.textContent || '';
  const likes = (bodyText.match(/(\\d+)\\s*赞/i) || [])[1] || 0;
  const comments = (bodyText.match(/(\\d+)\\s*评论/i) || [])[1] || 0;
  const shares = (bodyText.match(/(\\d+)\\s*转发/i) || [])[1] || 0;
  
  const extractedData = {
    text: postText,
    images: images,
    engagement: { 
      likes: parseInt(likes) || 0, 
      comments: parseInt(comments) || 0, 
      shares: parseInt(shares) || 0 
    }
  };
  
  console.log('✅ Extracted data:', extractedData);
  
  // Send to Kelly admin panel
  fetch('/api/weibo/client-helper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      url: window.location.href, 
      clientData: extractedData 
    })
  }).then(r => r.json()).then(data => {
    console.log('🎉 Data sent to Kelly admin panel!', data);
    alert('✅ Content extracted and sent to admin panel!');
  });
})();`
      },
      message: '🌐 Client Helper Ready! Copy the JavaScript and run it on the Weibo post page.'
    })

  } catch (error) {
    console.error('Client helper error:', error)
    return NextResponse.json({
      success: false,
      error: 'Client helper failed: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}