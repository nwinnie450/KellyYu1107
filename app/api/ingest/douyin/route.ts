// app/api/ingest/douyin/route.ts
import { getDouyinVideoAutoEmbed, parseDouyinShareText, resolveDouyinUrlWithMetadata } from "@/lib/douyin";

export async function POST(req: Request) {
  try {
    const { url, shareText } = await req.json();
    
    // Parse share text if provided (like the copy-paste from Douyin app)
    let parsedInfo = { hashtags: [] };
    if (shareText) {
      parsedInfo = parseDouyinShareText(shareText);
    }
    
    // Use URL from parsed text if not provided directly
    const videoUrl = url || parsedInfo.url;
    
    if (!videoUrl) {
      return Response.json({
        success: false,
        error: "No Douyin URL found"
      });
    }
    
    // Enhanced server-side URL resolution with metadata extraction using new robust API
    console.log('🎵 Starting enhanced Douyin URL resolution for:', videoUrl);
    let resolvedMetadata: any = {};
    let finalVideoUrl = videoUrl;
    
    try {
      const resolveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/douyin/resolve?url=${encodeURIComponent(videoUrl)}`);
      if (resolveResponse.ok) {
        const resolveResult = await resolveResponse.json();
        if (resolveResult.success) {
          finalVideoUrl = resolveResult.finalUrl;
          resolvedMetadata = {
            title: resolveResult.desc,
            author: resolveResult.author,
            publishedAt: resolveResult.createTime,
            description: resolveResult.desc,
            thumbnail: resolveResult.cover,
            avatar: resolveResult.avatar
          };
          console.log('✅ Enhanced URL resolution successful with robust API:', {
            originalUrl: videoUrl,
            resolvedUrl: finalVideoUrl,
            extractedMetadata: resolvedMetadata
          });
        }
      }
    } catch (resolveError) {
      console.log('⚠️ Enhanced resolution failed, using original URL:', resolveError);
    }
    
    // Get video embed info
    const embed = await getDouyinVideoAutoEmbed(finalVideoUrl);
    
    // Use the best available text content, prioritizing resolved metadata
    let bestText = resolvedMetadata.title || 
                  resolvedMetadata.description || 
                  parsedInfo.originalText || 
                  parsedInfo.title || 
                  shareText || "";
                  
    // Use resolved metadata for publish date if available
    let bestPublishDate = resolvedMetadata.publishedAt || parsedInfo.publishDate;
    
    // Try legacy scraping as fallback
    let scrapedData = null;
    let scrapedEngagement = null;
    
    try {
      console.log('🎵 Attempting legacy scrape as fallback for:', finalVideoUrl);
      const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/douyin/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalVideoUrl })
      });
      
      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        if (scrapeResult.success && scrapeResult.data) {
          scrapedData = scrapeResult.data;
          // Only use scraped text if we don't have better metadata
          if (!bestText && scrapeResult.data.text && scrapeResult.data.text.length > 0) {
            bestText = scrapeResult.data.text;
          }
          scrapedEngagement = scrapeResult.data.engagement;
          // Only use scraped date if we don't have better metadata
          if (!bestPublishDate) {
            bestPublishDate = scrapeResult.data.publishedAt;
          }
          console.log('✅ Legacy scraping provided additional data');
        }
      }
    } catch (scrapeError) {
      console.log('⚠️ Legacy scraping failed:', scrapeError);
    }
    
    // Always create a video media object for Douyin posts since they are video platform
    const videoMediaObject = {
      type: 'video',
      src: finalVideoUrl,
      originalSrc: videoUrl,
      isIframe: false, // Douyin videos are direct links, not iframes
      alt: 'Kelly Yu Wenwen Douyin video',
      thumbnail: resolvedMetadata.thumbnail || scrapedData?.thumbnail || embed?.thumb
    };
    
    return Response.json({
      success: true,
      source: "douyin",
      source_url: finalVideoUrl,
      original_url: videoUrl,
      hasVideo: true, // Always true for Douyin
      videoEmbed: embed?.kind === "iframe" ? embed.src : null,
      videoThumb: resolvedMetadata.thumbnail || scrapedData?.thumbnail || embed?.thumb || null,
      redirectUrl: embed?.kind === "redirect" ? embed.url : finalVideoUrl,
      // Enhanced metadata from server-side resolution
      resolvedMetadata: resolvedMetadata,
      resolvedTitle: resolvedMetadata.title,
      resolvedAuthor: resolvedMetadata.author,
      resolvedDescription: resolvedMetadata.description,
      resolvedPublishDate: resolvedMetadata.publishedAt,
      // Parsed information from share text
      title: parsedInfo.title,
      description: parsedInfo.description,
      hashtags: scrapedData?.hashtags || parsedInfo.hashtags,
      originalText: parsedInfo.originalText,
      publishDate: bestPublishDate,
      // Scraped full content (if available)
      scrapedText: scrapedData?.text,
      scrapedEngagement: scrapedEngagement,
      scrapingMethod: scrapedData ? 'success' : 'failed',
      resolutionMethod: resolvedMetadata && Object.keys(resolvedMetadata).length > 0 ? 'enhanced' : 'basic',
      // Always include video media
      videoMedia: videoMediaObject,
      // Pre-filled form data
      platform: "douyin",
      text: bestText,
      bestPublishDate: bestPublishDate
    });
    
  } catch (error) {
    console.error('Error processing Douyin content:', error);
    return Response.json({
      success: false,
      error: "Failed to process Douyin content"
    });
  }
}