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
    
    // Enhanced server-side URL resolution with metadata extraction (keeping working method)
    console.log('🎵 Starting enhanced Douyin URL resolution for:', videoUrl);
    let resolvedMetadata: any = {};
    let finalVideoUrl = videoUrl;
    
    try {
      const resolveResult = await resolveDouyinUrlWithMetadata(videoUrl);
      if (resolveResult) {
        finalVideoUrl = resolveResult.resolvedUrl;
        resolvedMetadata = resolveResult.metadata || {};
        console.log('✅ Enhanced URL resolution successful:', {
          originalUrl: videoUrl,
          resolvedUrl: finalVideoUrl,
          extractedMetadata: resolvedMetadata
        });
      }
    } catch (resolveError) {
      console.log('⚠️ Enhanced resolution failed, using original URL:', resolveError);
    }
    
    // Get video embed info
    const embed = await getDouyinVideoAutoEmbed(finalVideoUrl);
    
    // Use the best available text content, prioritizing resolved metadata over truncated parsed text
    let bestText = "";
    let extractedDate = null;
    
    // Priority 1: Full resolved metadata (complete text)
    if (resolvedMetadata.title && resolvedMetadata.title.length > 50) {
      bestText = resolvedMetadata.title;
    } else if (resolvedMetadata.description && resolvedMetadata.description.length > 50) {
      bestText = resolvedMetadata.description;
    }
    // Priority 2: Only use parsed text if no good resolved data
    else if (parsedInfo.originalText && parsedInfo.originalText.length > 20) {
      bestText = parsedInfo.originalText;
    } else if (parsedInfo.title && parsedInfo.title.length > 20) {
      bestText = parsedInfo.title;
    }
    // Priority 3: Fallback to share text
    else {
      bestText = shareText || "";
    }
    
    // Smart text processing: Extract date and clean promotional content
    if (bestText && bestText.includes('Kelly于文文于')) {
      // Extract date from text like "Kelly于文文于20250313发布在抖音"
      const dateMatch = bestText.match(/Kelly于文文于(\d{8})发布在抖音/);
      if (dateMatch) {
        const dateStr = dateMatch[1]; // 20250313
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        extractedDate = `${year}-${month}-${day}T04:00:00.000Z`; // Default to 4am UTC for Douyin posts
        console.log('📅 Extracted date from text:', extractedDate);
      }
      
      // Clean the text by removing promotional metadata
      const cleanText = bestText
        .split(' - Kelly于文文于')[0] // Remove everything after the author signature
        .trim();
      
      if (cleanText !== bestText) {
        bestText = cleanText;
        console.log('🧹 Cleaned text:', bestText);
      }
    }
                  
    console.log('🎯 Text selection debug:', {
      resolvedTitle: resolvedMetadata.title,
      resolvedDescription: resolvedMetadata.description,
      parsedOriginal: parsedInfo.originalText,
      parsedTitle: parsedInfo.title,
      shareText: shareText,
      finalBestText: bestText,
      selectedSource: resolvedMetadata.title && resolvedMetadata.title.length > 50 ? 'resolved-title' :
                      resolvedMetadata.description && resolvedMetadata.description.length > 50 ? 'resolved-description' :
                      parsedInfo.originalText && parsedInfo.originalText.length > 20 ? 'parsed-original' :
                      parsedInfo.title && parsedInfo.title.length > 20 ? 'parsed-title' : 'shareText-fallback'
    });
                  
    // Use resolved metadata for publish date if available, prioritizing extracted date
    let bestPublishDate = extractedDate || resolvedMetadata.publishedAt || parsedInfo.publishDate;
    
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