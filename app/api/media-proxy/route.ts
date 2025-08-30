import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  
  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  try {
    // In development, return placeholder for any URL
    if (imageUrl.includes('/api/placeholder/')) {
      // Generate a placeholder image response
      const svg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#9ca3af" font-family="system-ui" font-size="16">
            Kelly Yu Wenwen
          </text>
        </svg>
      `
      
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    }

    // For production: Proxy actual images from Chinese platforms
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://weibo.com/',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error proxying image:', error)
    
    // Return placeholder on error
    const errorSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fee2e2"/>
        <text x="50%" y="40%" text-anchor="middle" dy="0.3em" fill="#dc2626" font-family="system-ui" font-size="14">
          Image unavailable
        </text>
        <text x="50%" y="60%" text-anchor="middle" dy="0.3em" fill="#dc2626" font-family="system-ui" font-size="12">
          Kelly Yu Wenwen
        </text>
      </svg>
    `
    
    return new NextResponse(errorSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      },
      status: 200 // Return 200 to avoid broken images in UI
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