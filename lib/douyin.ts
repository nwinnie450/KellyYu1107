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

// Resolve Douyin short URL to get the full video URL
async function resolveDouyinUrl(shortUrl: string): Promise<string | null> {
  try {
    // For short URLs like https://v.douyin.com/GjQ0V39et9c/
    // We need to follow the redirect to get the full URL
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    
    return response.url; // This should be the resolved URL
  } catch (e) {
    console.error('Error resolving Douyin URL:', e);
    return null;
  }
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
    
    // If it's a short URL, resolve it first
    if (postUrl.includes('v.douyin.com')) {
      const resolved = await resolveDouyinUrl(postUrl);
      if (resolved) {
        fullUrl = resolved;
        videoId = extractDouyinVideoId(resolved);
      }
    }
    
    if (!videoId) {
      return null;
    }
    
    // Try to get video info
    const videoInfo = await fetchDouyinVideoInfo(videoId);
    
    if (videoInfo) {
      // For now, return as redirect since Douyin embedding is complex
      return {
        kind: "redirect",
        url: fullUrl,
        thumb: videoInfo.thumbnail
      };
    }
    
    return null;
  } catch (e) {
    console.error('Error processing Douyin URL:', e);
    return null;
  }
}

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