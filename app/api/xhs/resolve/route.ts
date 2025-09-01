import { NextRequest, NextResponse } from 'next/server';

function pick<T = any>(obj: any, path: string[]): T | undefined {
  return path.reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
}

function parseInitialState(html: string) {
  // XHS often embeds JSON in one of these script tags:
  //  - window.__INITIAL_STATE__ = {...}
  //  - <script id="__NEXT_DATA__" type="application/json">{...}</script>
  // Try both.
  const mState = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  if (mState) {
    try { return JSON.parse(mState[1]); } catch {}
  }
  const mNext = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (mNext) {
    try { return JSON.parse(mNext[1]); } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const shareUrl = req.nextUrl.searchParams.get('url');
  if (!shareUrl) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  try {
    console.log('🌹 Resolving XHS URL:', shareUrl);

    // 1) Follow redirects from xhslink.com to the real note URL.
    const r = await fetch(shareUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
    });

    const finalUrl = r.url;                     // e.g. https://www.xiaohongshu.com/explore/xxxxx
    const html = await r.text();
    console.log('📄 Resolved to:', finalUrl, 'HTML length:', html.length);

    // 2) Try structured JSON first
    const state = parseInitialState(html);

    // --- Fallbacks from OG meta for public pages (sometimes enough for title/cover) ---
    const og = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
      return m ? m[1] : '';
    };

    // 3) Extract fields from either JSON or OG metas
    let title = og('og:title') || '';
    let desc = og('og:description') || '';
    let cover = og('og:image') || '';
    let author = '';
    let avatar = '';
    let publishTime: string | null = null;
    let images: string[] = [];
    let videoUrl = '';

    if (state) {
      console.log('✅ Found structured JSON data');
      // Structures vary; probe likely paths
      // Common: state.note?.note ?? state.pageProps?.note ?? …
      const note =
        pick<any>(state, ['note', 'note']) ??
        pick<any>(state, ['pageProps', 'note']) ??
        pick<any>(state, ['props', 'pageProps', 'note']) ??
        null;

      if (note) {
        title = note.title || title || '';
        desc = (note.desc || note.content || desc || '').trim();
        author = pick<string>(note, ['user', 'nickname']) || author;
        avatar =
          pick<string>(note, ['user', 'avatar']) ||
          pick<string>(note, ['user', 'image']) ||
          avatar;
        if (note.time || note.timeFormat || note.timestamp) {
          const ts = note.timestamp ? Number(note.timestamp) * 1000 : Date.parse(note.timeFormat || note.time);
          if (!Number.isNaN(ts)) publishTime = new Date(ts).toISOString();
        }
        // images
        const imgList: string[] =
          note.imageList?.map((x: any) => x.url || x.urlDefault || x.traceId || '').filter(Boolean) ||
          note.images?.map((x: any) => x?.url || '').filter(Boolean) ||
          [];
        images = imgList;

        // video
        videoUrl =
          pick<string>(note, ['video', 'url']) ||
          pick<string>(note, ['video', 'media', 'stream', 'h264']) ||
          pick<string>(note, ['video', 'h264', 'url']) ||
          '';
        if (!cover && note.cover?.url) cover = note.cover.url;
        
        console.log('✅ Successfully extracted XHS data:', { 
          title: title.slice(0, 50) + '...', 
          author, 
          publishTime, 
          hasVideo: !!videoUrl, 
          imageCount: images.length 
        });
      } else {
        console.log('⚠️ No note data found in structured JSON');
      }
    } else {
      console.log('⚠️ No structured JSON found, using meta tags fallback');
    }

    // If we still don't have much, clean up the OG data
    if (!desc || desc === title) {
      desc = title || '无法获取完整内容';
    }

    // Basic sanity: at least give back something
    return NextResponse.json({
      finalUrl,
      title,
      desc,          // full caption when available (no "...")
      author: author || 'XHS用户',
      avatar,
      publishTime,
      cover,
      images,
      videoUrl,      // may require proxying to play inline
      success: !!(title || desc),
      method: state ? 'json-extraction' : 'meta-tags-fallback'
    });

  } catch (error) {
    console.error('❌ XHS resolve error:', error);
    return NextResponse.json({ 
      error: 'failed to resolve xhs url',
      title: '无法获取内容',
      desc: '无法获取完整内容',
      author: 'XHS用户',
      publishTime: null,
      method: 'error-fallback'
    }, { status: 500 });
  }
}