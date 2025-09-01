// lib/douyin.ts
export type DouyinVideoEmbed =
  | { kind: "iframe"; src: string; thumb?: string }
  | { kind: "redirect"; url: string; thumb?: string }
  | null;

// Extract Douyin video ID from various URL formats
function extractDouyinVideoId(url: string): string | null {
  try {
    // Common Douyin URL patterns:
    // https://v.douyin.com/GjQ0V39et9c/
    // https://www.douyin.com/video/7234567890123456789
    // https://www.iesdouyin.com/share/video/7234567890123456789
    
    const shortLinkMatch = url.match(/v\.douyin\.com\/([A-Za-z0-9]+)/);
    if (shortLinkMatch) {
      return shortLinkMatch[1]; // Return the short ID
    }
    
    const longLinkMatch = url.match(/(?:douyin\.com|iesdouyin\.com)\/(?:share\/)?video\/(\d+)/);
    if (longLinkMatch) {
      return longLinkMatch[1]; // Return the full video ID
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// Enhanced Douyin URL resolution with metadata extraction
async function resolveDouyinUrlWithMetadata(url: string): Promise<{
  resolvedUrl: string;
  videoId: string | null;
  metadata?: {
    title?: string;
    author?: string;
    publishedAt?: string;
    description?: string;
    thumbnail?: string;
  }
} | null> {
  try {
    console.log('🔍 Resolving Douyin URL:', url);
    
    // For short URLs like https://v.douyin.com/GjQ0V39et9c/
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });
    
    const resolvedUrl = response.url;
    const videoId = extractDouyinVideoId(resolvedUrl);
    const htmlContent = await response.text();
    
    // Extract metadata from HTML content
    const metadata: any = {};
    
    // Extract title from various meta tags
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/) ||
                      htmlContent.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                      htmlContent.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"/)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim().replace(/\s*-\s*抖音$/, ''); // Remove "- 抖音" suffix
    }
    
    // Extract author/creator
    const authorMatch = htmlContent.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/) ||
                       htmlContent.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"/)
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }
    
    // Extract description
    const descMatch = htmlContent.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
                     htmlContent.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }
    
    // Extract thumbnail
    const thumbMatch = htmlContent.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) ||
                      htmlContent.match(/<meta[^>]*name="image"[^>]*content="([^"]*)"/)
    if (thumbMatch) {
      metadata.thumbnail = thumbMatch[1];
    }
    
    // Try to extract publication date from structured data
    const structuredDataMatch = htmlContent.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]*)<\/script>/);
    if (structuredDataMatch) {
      try {
        const data = JSON.parse(structuredDataMatch[1]);
        if (data.datePublished) {
          metadata.publishedAt = new Date(data.datePublished).toISOString();
        } else if (data.uploadDate) {
          metadata.publishedAt = new Date(data.uploadDate).toISOString();
        }
      } catch (e) {
        console.log('Failed to parse structured data for date');
      }
    }
    
    console.log('✅ Successfully resolved Douyin URL with metadata:', {
      resolvedUrl,
      videoId,
      metadata
    });
    
    return {
      resolvedUrl,
      videoId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
    
  } catch (e) {
    console.error('❌ Error resolving Douyin URL:', e);
    return {
      resolvedUrl: url,
      videoId: extractDouyinVideoId(url),
      metadata: undefined
    };
  }
}

// Legacy function for backward compatibility
async function resolveDouyinUrl(shortUrl: string): Promise<string | null> {
  const result = await resolveDouyinUrlWithMetadata(shortUrl);
  return result?.resolvedUrl || null;
}

// Get Douyin video information from API (if available)
async function fetchDouyinVideoInfo(videoId: string): Promise<any> {
  try {
    // Note: Douyin's API is restricted and requires authentication
    // For now, we'll return basic structure that can be filled manually
    return {
      video_id: videoId,
      title: '',
      author: '',
      thumbnail: '',
      video_url: '',
      embed_url: `https://www.douyin.com/video/${videoId}`
    };
  } catch (e) {
    return null;
  }
}

export async function getDouyinVideoAutoEmbed(postUrl: string): Promise<DouyinVideoEmbed> {
  try {
    let videoId = extractDouyinVideoId(postUrl);
    let fullUrl = postUrl;
    let metadata: any = {};
    
    // Always try to resolve URL with metadata extraction
    const resolvedResult = await resolveDouyinUrlWithMetadata(postUrl);
    if (resolvedResult) {
      fullUrl = resolvedResult.resolvedUrl;
      videoId = resolvedResult.videoId || videoId;
      metadata = resolvedResult.metadata || {};
    }
    
    if (!videoId) {
      return null;
    }
    
    // For now, return as redirect since Douyin embedding is complex
    return {
      kind: "redirect",
      url: fullUrl,
      thumb: metadata.thumbnail
    };
  } catch (e) {
    console.error('Error processing Douyin URL:', e);
    return null;
  }
}

// Export the enhanced resolution function for use in API routes
export { resolveDouyinUrlWithMetadata };

// Parse Douyin share text to extract useful information
export function parseDouyinShareText(shareText: string): {
  title?: string;
  hashtags: string[];
  url?: string;
  originalText?: string;
  description?: string;
  publishDate?: string;
} {
  try {
    // Extract title from share text like "看看【Kelly于文文的作品】根本停不下来怎么回事"
    const titleMatch = shareText.match(/【([^】]+)】/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract the description after the title (before hashtags)
    let description = '';
    if (titleMatch) {
      // Get text after the title bracket until hashtags or URL
      const afterTitle = shareText.substring(shareText.indexOf('】') + 1);
      const descMatch = afterTitle.match(/^([^#]*?)(?=#|https?:|$)/);
      description = descMatch ? descMatch[1].trim() : '';
    }
    
    // Extract hashtags like "# 李羲承进行曲#"
    const hashtags = shareText.match(/#[^#\s]+#?/g) || [];
    
    // Extract URL
    const urlMatch = shareText.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : '';
    
    // Note: The numbers at the end like "01/20" are not dates - they're tracking codes
    // Real dates need to be manually set or scraped from the actual post
    let publishDate = '';
    
    // Create a cleaner version of the original text
    const cleanedText = shareText
      .replace(/^\d+\.\d+\s*复制打开抖音，?\s*看看/, '') // Remove "9.99 复制打开抖音，看看"
      .replace(/【[^】]*】/g, '') // Remove bracketed content like "【Kelly于文文的作品】"
      .replace(/\s+https?:\/\/[^\s]+.*$/, '') // Remove URL and everything after
      .replace(/\s+daN:\/.*$/, '') // Remove tracking codes
      .replace(/\s+z@T\.YZ.*$/, '') // Remove tracking codes
      .replace(/\.{3,}$/, '') // Remove trailing ellipsis from truncated text
      .trim();
    
    return {
      title: title || undefined,
      description: description || undefined,
      hashtags: hashtags.map(tag => tag.replace(/^#|#$/g, '')),
      url: url || undefined,
      originalText: cleanedText || shareText,
      publishDate: publishDate || undefined
    };
  } catch (e) {
    return { 
      hashtags: [],
      originalText: shareText
    };
  }
}