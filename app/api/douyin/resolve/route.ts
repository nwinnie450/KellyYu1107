import { NextRequest, NextResponse } from 'next/server';

function tryParseRenderData(html: string) {
  // Douyin often stores URI-encoded JSON here
  const m = html.match(/<script[^>]*id="RENDER_DATA"[^>]*>(.*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

function tryParseSigiState(html: string) {
  // Older/alt structure
  const m = html.match(/<script[^>]*id="SIGI_STATE"[^>]*>(.*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  try {
    console.log('🎵 Resolving Douyin URL:', url);

    // 1) Follow redirects from v.douyin.com
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        // Pretend to be a normal browser; Douyin is finicky about UA/Language
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    const finalUrl = r.url; // resolved item page
    const html = await r.text();
    console.log('📄 Resolved to:', finalUrl, 'HTML length:', html.length);

    // 2) Parse embedded JSON
    let data: any = tryParseRenderData(html) ?? tryParseSigiState(html);
    if (!data) {
      console.log('⚠️ No JSON data found, trying meta tags fallback');
      // Fallback to meta tags
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/) ||
                        html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                        html.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"/);
      const desc = titleMatch ? titleMatch[1].trim().replace(/\s*-\s*抖音$/, '') : '无法获取完整描述';
      
      return NextResponse.json({ 
        finalUrl,
        desc,
        author: 'Douyin用户',
        createTime: null,
        method: 'meta-tags-fallback'
      });
    }

    // 3) Extract fields (structure changes; probe a few likely paths)
    const nodes = Array.isArray(data) ? data : [data];
    let aweme: any;

    // RENDER_DATA style
    for (const n of nodes) {
      if (n?.aweme?.aweme_id || n?.aweme?.desc || n?.aweme?.video) {
        aweme = n.aweme;
        break;
      }
      if (n?.detail?.aweme) {
        aweme = n.detail.aweme;
        break;
      }
    }

    // SIGI_STATE style (keys vary, but often contain an "aweme" or "Aweme" map)
    if (!aweme && data?.Aweme?.aweme_list) {
      const list = Object.values<any>(data.Aweme.aweme_list);
      if (list.length) aweme = list[0];
    }

    if (!aweme) {
      console.log('❌ No aweme data found in parsed JSON');
      return NextResponse.json({ 
        error: 'no-aweme', 
        finalUrl,
        desc: '无法获取完整描述',
        author: 'Douyin用户',
        createTime: null,
        method: 'no-aweme-fallback'
      }, { status: 404 });
    }

    const desc =
      aweme.desc ||
      aweme.share_info?.share_desc ||
      aweme.share_info?.share_title ||
      '无法获取完整描述';

    // Prefer non-watermarked play URL if present; otherwise fallback
    const playUrl =
      aweme.video?.play_addr?.url_list?.[0] ||
      aweme.video?.bit_rate?.[0]?.play_addr?.url_list?.[0] ||
      '';

    const cover =
      aweme.video?.cover?.url_list?.[0] ||
      aweme.video?.origin_cover?.url_list?.[0] ||
      '';

    const author = aweme.author?.nickname || 'Douyin用户';
    const avatar =
      aweme.author?.avatar_thumb?.url_list?.[0] ||
      aweme.author?.avatar_medium?.url_list?.[0] ||
      '';

    // Publish time (epoch seconds) → ISO
    const createTime =
      aweme.create_time ? new Date(aweme.create_time * 1000).toISOString() : null;

    console.log('✅ Successfully extracted:', { 
      desc: desc.slice(0, 100) + '...', 
      author, 
      createTime,
      hasPlayUrl: !!playUrl,
      hasCover: !!cover 
    });

    return NextResponse.json({
      finalUrl,
      desc,          // ← full caption (no "..."—this is what you want)
      playUrl,       // direct file (may still require proxying)
      cover,
      author,
      avatar,
      createTime,
      method: 'json-extraction',
      success: true
    });

  } catch (error) {
    console.error('❌ Douyin resolve error:', error);
    return NextResponse.json({ 
      error: 'failed to resolve douyin url',
      desc: '无法获取描述',
      author: 'Douyin用户',
      createTime: null,
      method: 'error-fallback'
    }, { status: 500 });
  }
}