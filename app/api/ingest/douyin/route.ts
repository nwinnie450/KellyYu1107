// app/api/ingest/douyin/route.ts
import { getDouyinVideoAutoEmbed, parseDouyinShareText } from "@/lib/douyin";

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
    
    // Get video embed info
    const embed = await getDouyinVideoAutoEmbed(videoUrl);
    
    // Try to scrape full content from the actual post
    let scrapedData = null;
    let scrapedEngagement = null;
    let scrapedPublishDate = parsedInfo.publishDate;
    
    // Use the best available text content
    let bestText = parsedInfo.originalText || parsedInfo.title || shareText || "";
    
    try {
      console.log('🎵 Attempting to scrape full content from:', videoUrl);
      const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/douyin/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      });
      
      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        if (scrapeResult.success && scrapeResult.data) {
          scrapedData = scrapeResult.data;
          // Use scraped text if it's longer and more meaningful than parsed text
          if (scrapeResult.data.text && scrapeResult.data.text.length > bestText.length) {
            bestText = scrapeResult.data.text;
          }
          scrapedEngagement = scrapeResult.data.engagement;
          scrapedPublishDate = scrapeResult.data.publishedAt || parsedInfo.publishDate;
          console.log('✅ Successfully scraped full Douyin content!');
        }
      }
    } catch (scrapeError) {
      console.log('⚠️ Scraping failed, using share text only:', scrapeError);
    }
    
    // Always create a video media object for Douyin posts since they are video platform
    const videoMediaObject = {
      type: 'video',
      src: videoUrl,
      originalSrc: videoUrl,
      isIframe: false, // Douyin videos are direct links, not iframes
      alt: 'Kelly Yu Wenwen Douyin video',
      thumbnail: scrapedData?.thumbnail
    };
    
    return Response.json({
      success: true,
      source: "douyin",
      source_url: videoUrl,
      hasVideo: true, // Always true for Douyin
      videoEmbed: embed?.kind === "iframe" ? embed.src : null,
      videoThumb: scrapedData?.thumbnail || embed?.thumb || null,
      redirectUrl: embed?.kind === "redirect" ? embed.url : videoUrl,
      // Parsed information from share text
      title: parsedInfo.title,
      description: parsedInfo.description,
      hashtags: scrapedData?.hashtags || parsedInfo.hashtags,
      originalText: parsedInfo.originalText,
      publishDate: scrapedPublishDate,
      // Scraped full content (if available)
      scrapedText: scrapedData?.text,
      scrapedEngagement: scrapedEngagement,
      scrapingMethod: scrapedData ? 'success' : 'failed',
      // Always include video media
      videoMedia: videoMediaObject,
      // Pre-filled form data
      platform: "douyin",
      text: bestText
    });
    
  } catch (error) {
    console.error('Error processing Douyin content:', error);
    return Response.json({
      success: false,
      error: "Failed to process Douyin content"
    });
  }
}