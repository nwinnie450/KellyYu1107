// app/api/rednotes/scrape/route.ts
import { extractRedNotesNoteId } from "@/lib/rednotes";

interface RedNotesScrapedData {
  text: string;
  media: Array<{
    type: 'image' | 'video';
    src: string;
    originalSrc: string;
    alt: string;
    thumbnail?: string;
  }>;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  publishedAt: string;
  thumbnail?: string;
  hasVideo: boolean;
}

// Method 1: Try HTML scraping
async function scrapeRedNotesHTML(url: string): Promise<{ success: boolean; data?: RedNotesScrapedData; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Try to extract data from HTML
    let text = '';
    let media: any[] = [];
    let engagement = { likes: 0, comments: 0, shares: 0 };
    let publishedAt = '';
    let thumbnail = '';
    let hasVideo = false;
    
    // Extract title/content from meta tags or page content
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
    const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i);
    
    console.log('🔍 RedNotes Scraping Debug:');
    console.log('Title match:', titleMatch?.[1]);
    console.log('Description match:', descriptionMatch?.[1]);
    console.log('OG Description match:', ogDescriptionMatch?.[1]);
    
    text = ogDescriptionMatch?.[1] || descriptionMatch?.[1] || titleMatch?.[1] || '';
    
    // Clean up the text (remove HTML entities, fix encoding issues)
    if (text) {
      text = text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    console.log('Final extracted text:', text);
    
    // Extract thumbnail from og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)/i);
    thumbnail = ogImageMatch?.[1] || '';
    
    // Try to find images in the content
    const imageMatches = html.matchAll(/<img[^>]*src=["']([^"']*)/gi);
    for (const match of imageMatches) {
      if (match[1] && !match[1].includes('avatar') && !match[1].includes('icon')) {
        media.push({
          type: 'image',
          src: match[1],
          originalSrc: match[1],
          alt: 'Kelly Yu Wenwen RedNotes image'
        });
      }
    }
    
    // Try to find videos
    const videoMatches = html.matchAll(/<video[^>]*src=["']([^"']*)/gi);
    for (const match of videoMatches) {
      if (match[1]) {
        hasVideo = true;
        media.push({
          type: 'video',
          src: match[1],
          originalSrc: match[1],
          alt: 'Kelly Yu Wenwen RedNotes video'
        });
      }
    }
    
    // If no media found but we have a thumbnail, use that
    if (media.length === 0 && thumbnail) {
      media.push({
        type: 'image',
        src: thumbnail,
        originalSrc: thumbnail,
        alt: 'Kelly Yu Wenwen RedNotes post'
      });
    }
    
    return {
      success: true,
      data: {
        text: text.trim(),
        media,
        engagement,
        publishedAt,
        thumbnail,
        hasVideo
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `HTML scraping failed: ${error.message}`
    };
  }
}

// Method 2: Try API scraping with note ID
async function scrapeRedNotesAPI(noteId: string): Promise<{ success: boolean; data?: RedNotesScrapedData; error?: string }> {
  try {
    // Note: This is a placeholder for potential API access
    // RedNotes has strict API access requirements
    console.log(`Attempting API scraping for note ID: ${noteId}`);
    
    // For now, return failure to fall back to HTML scraping
    return {
      success: false,
      error: "API scraping not yet available"
    };
    
  } catch (error) {
    return {
      success: false,
      error: `API scraping failed: ${error.message}`
    };
  }
}

// Method 3: Extract from RedNotes mobile app share format
function parseRedNotesShareFormat(url: string): { success: boolean; data?: Partial<RedNotesScrapedData>; error?: string } {
  try {
    // If URL contains recognizable patterns, extract what we can
    const noteId = extractRedNotesNoteId(url);
    
    if (noteId) {
      return {
        success: true,
        data: {
          text: 'Kelly Yu Wenwen RedNotes post',
          media: [{
            type: 'image',
            src: '',
            originalSrc: '',
            alt: 'Kelly Yu Wenwen RedNotes post'
          }],
          engagement: { likes: 0, comments: 0, shares: 0 },
          publishedAt: '',
          hasVideo: false
        }
      };
    }
    
    return {
      success: false,
      error: "Could not extract note information"
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Share format parsing failed: ${error.message}`
    };
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return Response.json({
        success: false,
        error: "URL is required"
      });
    }
    
    console.log('🌹 Starting RedNotes scraping for:', url);
    
    // Method 1: Try HTML scraping
    let result = await scrapeRedNotesHTML(url);
    if (result.success) {
      console.log('✅ HTML scraping successful');
      return Response.json(result);
    }
    console.log('❌ HTML scraping failed:', result.error);
    
    // Method 2: Try API scraping if we can extract note ID
    const noteId = extractRedNotesNoteId(url);
    if (noteId) {
      result = await scrapeRedNotesAPI(noteId);
      if (result.success) {
        console.log('✅ API scraping successful');
        return Response.json(result);
      }
      console.log('❌ API scraping failed:', result.error);
    }
    
    // Method 3: Try basic share format parsing
    result = parseRedNotesShareFormat(url);
    if (result.success) {
      console.log('✅ Share format parsing successful');
      return Response.json(result);
    }
    console.log('❌ Share format parsing failed:', result.error);
    
    // All methods failed
    return Response.json({
      success: false,
      error: "Unable to scrape RedNotes content using any available method",
      attempted_methods: ['HTML scraping', 'API scraping', 'Share format parsing'],
      note: "RedNotes has strict anti-scraping measures. Manual content entry may be required."
    });
    
  } catch (error) {
    console.error('Error in RedNotes scraping:', error);
    return Response.json({
      success: false,
      error: "Internal server error during scraping"
    });
  }
}

