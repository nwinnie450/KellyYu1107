// app/api/ingest/rednotes/route.ts
import { getRedNotesAutoEmbed, parseRedNotesShareText, resolveRedNotesUrlWithMetadata } from "@/lib/rednotes";

export async function POST(req: Request) {
  try {
    const { url, shareText } = await req.json();
    
    // Parse share text if provided (like the copy-paste from RedNotes app)
    let parsedInfo: {
      title?: string;
      author?: string;
      noteId?: string;
      url?: string;
      originalText?: string;
      description?: string;
      publishDate?: string;
      hasVideo?: boolean;
      mediaType?: 'image' | 'video' | 'mixed';
    } = {};
    if (shareText) {
      parsedInfo = parseRedNotesShareText(shareText);
    }
    
    // Use URL from parsed text if not provided directly
    const noteUrl = url || parsedInfo.url;
    
    if (!noteUrl) {
      return Response.json({
        success: false,
        error: "No RedNotes URL found"
      });
    }
    
    // Enhanced server-side URL resolution with metadata extraction using robust XHS API
    console.log('🌹 Starting enhanced RedNotes URL resolution for:', noteUrl);
    let resolvedMetadata: any = {};
    let finalNoteUrl = noteUrl;
    
    try {
      const resolveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xhs/resolve?url=${encodeURIComponent(noteUrl)}`);
      if (resolveResponse.ok) {
        const resolveResult = await resolveResponse.json();
        console.log('🔍 XHS API Response received:', resolveResult);
        if (resolveResult.success !== false && resolveResult.desc) { // Check for actual data
          finalNoteUrl = resolveResult.finalUrl || noteUrl;
          resolvedMetadata = {
            title: resolveResult.title,
            author: resolveResult.author,
            publishedAt: resolveResult.publishTime,
            description: resolveResult.desc,
            thumbnail: resolveResult.cover,
            avatar: resolveResult.avatar,
            contentType: resolveResult.videoUrl ? 'video' : 'image',
            hasVideo: !!resolveResult.videoUrl,
            images: resolveResult.images || [],
            videoUrl: resolveResult.videoUrl
          };
          console.log('✅ Enhanced RedNotes URL resolution successful with robust API:', {
            originalUrl: noteUrl,
            resolvedUrl: finalNoteUrl,
            extractedMetadata: resolvedMetadata
          });
        } else {
          console.log('⚠️ XHS API response did not contain expected data:', resolveResult);
        }
      }
    } catch (resolveError) {
      console.log('⚠️ Enhanced resolution failed, using original URL:', resolveError);
    }
    
    // Get note embed info
    const embed = await getRedNotesAutoEmbed(finalNoteUrl);
    
    // Use the best available text content, prioritizing resolved metadata with smart processing
    let bestText = "";
    let extractedDate = null;
    
    // Priority 1: Full resolved metadata (complete text)
    if (resolvedMetadata.title && resolvedMetadata.title.length > 20) {
      bestText = resolvedMetadata.title;
    } else if (resolvedMetadata.description && resolvedMetadata.description.length > 20) {
      bestText = resolvedMetadata.description;
    }
    // Priority 2: Only use parsed text if no good resolved data
    else if (parsedInfo.originalText && parsedInfo.originalText.length > 10) {
      bestText = parsedInfo.originalText;
    } else if (parsedInfo.description && parsedInfo.description.length > 10) {
      bestText = parsedInfo.description;
    }
    // Priority 3: Fallback to share text
    else {
      bestText = shareText || "";
    }
    
    // Smart text processing for XHS: clean promotional content and extract date patterns
    if (bestText) {
      // Look for common XHS promotional patterns and clean them
      bestText = bestText
        .replace(/\s*-\s*小红书.*$/, '') // Remove "- 小红书" and everything after
        .replace(/来小红书.*$/, '') // Remove promotional endings
        .replace(/.*赞.*收藏.*评论.*$/, '') // Remove engagement lines
        .trim();
      
      // Try to extract dates from various patterns (XHS doesn't have as consistent format as Douyin)
      const datePatterns = [
        /(\d{4})[-年]\s*(\d{1,2})[-月]\s*(\d{1,2})[日]?/,
        /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
      ];
      
      for (const pattern of datePatterns) {
        const match = bestText.match(pattern);
        if (match) {
          const year = match[1];
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          extractedDate = `${year}-${month}-${day}T10:00:00.000Z`; // Default to 10am UTC for XHS posts
          console.log('📅 Extracted date from XHS text:', extractedDate);
          break;
        }
      }
      
      console.log('🧹 Processed XHS text:', bestText.slice(0, 100) + '...');
    }
                  
    // Use resolved metadata for publish date if available, prioritizing extracted date
    let bestPublishDate = extractedDate || resolvedMetadata.publishedAt || parsedInfo.publishDate;
    
    // Determine video/content type from resolved metadata or parsed info
    let hasVideo = resolvedMetadata.hasVideo || parsedInfo.hasVideo || false;
    let mediaType = resolvedMetadata.contentType || parsedInfo.mediaType || 'image';
    
    // Try legacy scraping as fallback
    let scrapedData = null;
    let scrapedEngagement = null;
    
    try {
      console.log('🌹 Attempting legacy scrape as fallback for:', finalNoteUrl);
      const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rednotes/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalNoteUrl })
      });
      
      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        if (scrapeResult.success && scrapeResult.data) {
          scrapedData = scrapeResult.data;
          // Only use scraped text if we don't have better metadata and it's meaningful
          if (!bestText && scrapeResult.data.text && 
              scrapeResult.data.text !== '小红书' && 
              scrapeResult.data.text.length > 10) {
            bestText = scrapeResult.data.text;
            console.log('✅ Using scraped text as fallback:', scrapeResult.data.text);
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
    
    // Debug logging for text selection
    console.log('🎯 XHS Text selection debug:', {
      resolvedTitle: resolvedMetadata.title,
      resolvedDescription: resolvedMetadata.description,
      parsedOriginal: parsedInfo.originalText,
      parsedDescription: parsedInfo.description,
      shareText: shareText,
      finalBestText: bestText,
      extractedDate: extractedDate,
      bestPublishDate: bestPublishDate
    });
    
    // RedNotes can contain images, videos, or mixed content
    const mediaObjects = [];
    
    // If we have scraped media, use that
    if (scrapedData?.media && scrapedData.media.length > 0) {
      mediaObjects.push(...scrapedData.media);
    } else {
      // Create a media object based on detected type and available thumbnails
      mediaObjects.push({
        type: mediaType,
        src: resolvedMetadata.thumbnail || scrapedData?.thumbnail || finalNoteUrl,
        originalSrc: resolvedMetadata.thumbnail || scrapedData?.thumbnail || noteUrl,
        isIframe: false,
        alt: `Kelly Yu Wenwen RedNotes ${mediaType}`,
        thumbnail: resolvedMetadata.thumbnail || scrapedData?.thumbnail,
        poster: resolvedMetadata.thumbnail || scrapedData?.thumbnail // For video thumbnails
      });
    }
    
    return Response.json({
      success: true,
      source: "rednotes",
      source_url: finalNoteUrl,
      original_url: noteUrl,
      hasVideo: hasVideo,
      hasImages: !hasVideo, // If not video, assume images
      mediaType: mediaType,
      mediaEmbed: embed?.kind === "iframe" ? embed.src : null,
      mediaThumb: resolvedMetadata.thumbnail || scrapedData?.thumbnail || embed?.thumb || null,
      redirectUrl: embed?.kind === "redirect" ? embed.url : finalNoteUrl,
      // Enhanced metadata from server-side resolution
      resolvedMetadata: resolvedMetadata,
      resolvedTitle: resolvedMetadata.title,
      resolvedAuthor: resolvedMetadata.author,
      resolvedDescription: resolvedMetadata.description,
      resolvedPublishDate: resolvedMetadata.publishedAt,
      resolvedContentType: resolvedMetadata.contentType,
      resolvedHasVideo: resolvedMetadata.hasVideo,
      // Parsed information from share text
      title: parsedInfo.title,
      author: parsedInfo.author,
      noteId: parsedInfo.noteId,
      description: parsedInfo.description,
      originalText: parsedInfo.originalText,
      publishDate: bestPublishDate,
      // Scraped full content (if available)
      scrapedText: scrapedData?.text,
      scrapedEngagement: scrapedEngagement,
      scrapingMethod: scrapedData ? 'success' : 'failed',
      resolutionMethod: resolvedMetadata && Object.keys(resolvedMetadata).length > 0 ? 'enhanced' : 'basic',
      // Media objects
      mediaObjects: mediaObjects,
      // Pre-filled form data
      platform: "red", // Use "red" to match existing platform config
      text: bestText,
      bestPublishDate: bestPublishDate,
      extractedDate: extractedDate
    });
    
  } catch (error) {
    console.error('Error processing RedNotes content:', error);
    return Response.json({
      success: false,
      error: "Failed to process RedNotes content"
    });
  }
}