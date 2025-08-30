import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mediaUrl = searchParams.get('url')
  
  if (!mediaUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://weibo.com/',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const mediaBuffer = await response.arrayBuffer()

    return new NextResponse(mediaBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error proxying media:', error)
    
    const errorSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fee2e2"/>
        <text x="50%" y="40%" text-anchor="middle" dy="0.3em" fill="#dc2626" font-family="system-ui" font-size="14">
          Media unavailable
        </text>
        <text x="50%" y="60%" text-anchor="middle" dy="0.3em" fill="#dc2626" font-family="system-ui" font-size="12">
          Source might be offline
        </text>
      </svg>
    `
    
    return new NextResponse(errorSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      },
      status: 200
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}