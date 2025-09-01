import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src');
  if (!src) return new Response('missing src', { status: 400 });

  try {
    console.log('🌹 Proxying XHS media:', src);

    const upstream = await fetch(src, {
      headers: {
        'Referer': 'https://www.xiaohongshu.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    });

    if (!upstream.ok) {
      console.log('❌ Upstream fetch failed:', upstream.status);
      return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
    }

    console.log('✅ Successfully proxied XHS media, size:', upstream.headers.get('content-length'));

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ XHS proxy error:', error);
    return new Response('Proxy failed', { status: 500 });
  }
}