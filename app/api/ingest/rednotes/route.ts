// app/api/ingest/rednotes/route.ts
import { getRedNotesAutoEmbed, parseRedNotesShareText } from "@/lib/rednotes";

export async function POST(req: Request) {
  try {
    const { url, shareText } = await req.json();
    
    // Parse share text if provided (like the copy-paste from RedNotes app)
    let parsedInfo = {};
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
    
    // Get note embed info
    const embed = await getRedNotesAutoEmbed(noteUrl);
    
    // Try to scrape full content from the actual post
    let scrapedData = null;
    let scrapedEngagement = null;
    let scrapedPublishDate = parsedInfo.publishDate;
    
    // Use the best available text content - prioritize share text since scraping is unreliable
    let bestText = parsedInfo.originalText || parsedInfo.description || shareText || "";
    
    try {
      console.log('🌹 Attempting to scrape full content from:', noteUrl);
      const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rednotes/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: noteUrl })
      });
      
      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        if (scrapeResult.success && scrapeResult.data) {
          scrapedData = scrapeResult.data;
          // Only use scraped text if it's actually meaningful (more than just site name)
          if (scrapeResult.data.text && 
              scrapeResult.data.text.length > bestText.length && 
              scrapeResult.data.text !== '小红书' && 
              scrapeResult.data.text.length > 10) {
            bestText = scrapeResult.data.text;
            console.log('✅ Using scraped text:', scrapeResult.data.text);
          } else {
            console.log('⚠️ Scraped text not useful, keeping share text');
          }
          scrapedEngagement = scrapeResult.data.engagement;
          scrapedPublishDate = scrapeResult.data.publishedAt || parsedInfo.publishDate;
          console.log('✅ Successfully scraped RedNotes metadata!');
        }
      }
    } catch (scrapeError) {
      console.log('⚠️ Scraping failed, using share text only:', scrapeError);
    }
    
    // RedNotes can contain images, videos, or mixed content
    const mediaObjects = [];
    
    // If we have scraped media, use that
    if (scrapedData?.media && scrapedData.media.length > 0) {
      mediaObjects.push(...scrapedData.media);
    } else {
      // Use parsed information to determine media type
      const mediaType = parsedInfo.hasVideo ? 'video' : 'image';
      
      // Create a media object based on detected type
      mediaObjects.push({
        type: mediaType,
        src: scrapedData?.thumbnail || '',
        originalSrc: scrapedData?.thumbnail || '',
        isIframe: false,
        alt: `Kelly Yu Wenwen RedNotes ${mediaType}`,
        thumbnail: scrapedData?.thumbnail,
        poster: scrapedData?.thumbnail // For video thumbnails
      });
    }
    
    return Response.json({
      success: true,
      source: "rednotes",
      source_url: noteUrl,
      hasVideo: scrapedData?.hasVideo || parsedInfo.hasVideo || false,
      hasImages: !parsedInfo.hasVideo, // If not video, assume images
      mediaType: parsedInfo.mediaType || 'image',
      mediaEmbed: embed?.kind === "iframe" ? embed.src : null,
      mediaThumb: scrapedData?.thumbnail || embed?.thumb || null,
      redirectUrl: embed?.kind === "redirect" ? embed.url : noteUrl,
      // Parsed information from share text
      title: parsedInfo.title,
      author: parsedInfo.author,
      noteId: parsedInfo.noteId,
      description: parsedInfo.description,
      originalText: parsedInfo.originalText,
      publishDate: scrapedPublishDate,
      // Scraped full content (if available)
      scrapedText: scrapedData?.text,
      scrapedEngagement: scrapedEngagement,
      scrapingMethod: scrapedData ? 'success' : 'failed',
      // Media objects
      mediaObjects: mediaObjects,
      // Pre-filled form data
      platform: "red", // Use "red" to match existing platform config
      text: bestText
    });
    
  } catch (error) {
    console.error('Error processing RedNotes content:', error);
    return Response.json({
      success: false,
      error: "Failed to process RedNotes content"
    });
  }
}