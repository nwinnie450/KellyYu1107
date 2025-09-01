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
    
    // Enhanced server-side URL resolution with metadata extraction
    console.log('🌹 Starting enhanced RedNotes URL resolution for:', noteUrl);
    let resolvedMetadata: any = {};
    let finalNoteUrl = noteUrl;
    
    try {
      const resolveResult = await resolveRedNotesUrlWithMetadata(noteUrl);
      if (resolveResult) {
        finalNoteUrl = resolveResult.resolvedUrl;
        resolvedMetadata = resolveResult.metadata || {};
        console.log('✅ Enhanced RedNotes URL resolution successful:', {
          originalUrl: noteUrl,
          resolvedUrl: finalNoteUrl,
          extractedMetadata: resolvedMetadata
        });
      }
    } catch (resolveError) {
      console.log('⚠️ Enhanced resolution failed, using original URL:', resolveError);
    }
    
    // Get note embed info
    const embed = await getRedNotesAutoEmbed(finalNoteUrl);
    
    // Use the best available text content, prioritizing resolved metadata
    let bestText = resolvedMetadata.title || 
                  resolvedMetadata.description || 
                  parsedInfo.originalText || 
                  parsedInfo.description || 
                  shareText || "";
                  
    // Use resolved metadata for publish date if available
    let bestPublishDate = resolvedMetadata.publishedAt || parsedInfo.publishDate;
    
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
      bestPublishDate: bestPublishDate
    });
    
  } catch (error) {
    console.error('Error processing RedNotes content:', error);
    return Response.json({
      success: false,
      error: "Failed to process RedNotes content"
    });
  }
}