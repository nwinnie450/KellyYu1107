import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'missing url parameter' }, { status: 400 });
  }

  try {
    console.log('🎵 Resolving Douyin URL for text extraction:', url);

    // 1) Follow redirects to real item URL
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
    });

    const html = await response.text();
    console.log('📄 Fetched HTML content, length:', html.length);

    // 2) Parse in-page JSON. Douyin commonly embeds JSON in a script tag like RENDER_DATA/SIGI_STATE.
    let data: any = null;
    let desc = '';
    let author = '';
    let publishedAt = '';
    
    // Try different JSON extraction patterns
    const patterns = [
      /<script[^>]*id="RENDER_DATA"[^>]*>(.*?)<\/script>/,
      /<script[^>]*id="SIGI_STATE"[^>]*>(.*?)<\/script>/,
      /window\._ROUTER_DATA\s*=\s*({.*?});/,
      /self\.__pace_f\.push\(\[.*?,.*?,.*?,.*?,({.*?}),.*?\]\)/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // It's often URI-encoded JSON
          let jsonStr = match[1];
          if (jsonStr.includes('%')) {
            jsonStr = decodeURIComponent(jsonStr);
          }
          data = JSON.parse(jsonStr);
          console.log('✅ Successfully parsed JSON data using pattern:', pattern.toString().slice(0, 50) + '...');
          break;
        } catch (parseError) {
          console.log('❌ Failed to parse JSON from pattern, trying next...');
          continue;
        }
      }
    }

    if (!data) {
      console.log('⚠️ No JSON data found, trying meta tags fallback');
      // Fallback to meta tags
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/) ||
                        html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                        html.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"/);
      if (titleMatch) {
        desc = titleMatch[1].trim().replace(/\s*-\s*抖音$/, ''); // Remove "- 抖音" suffix
      }

      const authorMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/) ||
                         html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"/);
      if (authorMatch) {
        author = authorMatch[1].trim();
      }

      return NextResponse.json({ 
        desc: desc || '无法获取完整描述',
        author: author || 'Douyin用户',
        publishedAt: '',
        method: 'meta-tags-fallback'
      });
    }

    // 3) Walk the JSON to find description & metadata
    // Note: These keys change frequently—adjust as needed
    try {
      // Try different data structure patterns
      const awemeList = data?.[0]?.aweme || data?.aweme || data?.detail?.aweme || data?.video || data?.item;
      const awemeData = Array.isArray(awemeList) ? awemeList[0] : awemeList;
      
      if (awemeData) {
        desc = awemeData.desc || awemeData.title || awemeData.content || '';
        author = awemeData.author?.nickname || awemeData.author?.unique_id || awemeData.nickname || '';
        publishedAt = awemeData.create_time ? new Date(awemeData.create_time * 1000).toISOString() : '';
      }

      // Alternative data structures
      if (!desc && data.app) {
        desc = data.app.videoData?.desc || data.app.itemInfo?.itemStruct?.desc || '';
        author = data.app.videoData?.authorInfo?.nickName || data.app.itemInfo?.itemStruct?.author?.nickname || '';
      }

      console.log('📝 Extracted data:', { desc: desc.slice(0, 100), author, publishedAt });

    } catch (extractError) {
      console.log('❌ Error extracting from JSON structure:', extractError);
    }

    // Return what we found
    return NextResponse.json({
      desc: desc || '无法获取完整描述',
      author: author || 'Douyin用户',
      publishedAt: publishedAt,
      method: 'json-extraction',
      success: !!desc
    });

  } catch (error) {
    console.error('❌ Douyin resolve error:', error);
    return NextResponse.json({ 
      error: 'failed to resolve douyin url',
      desc: '无法获取描述',
      author: 'Douyin用户',
      publishedAt: '',
      method: 'error-fallback'
    }, { status: 500 });
  }
}