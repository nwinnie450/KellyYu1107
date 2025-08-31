// app/api/ingest/weibo/route.ts
import { getWeiboVideoAutoEmbed } from "@/lib/weibo";

export async function POST(req: Request) {
  const { url } = await req.json();
  const embed = await getWeiboVideoAutoEmbed(url);

  return Response.json({
    source: "weibo",
    source_url: url,
    hasVideo: !!embed,
    videoEmbed: embed?.kind === "iframe" ? embed.src : null,
    videoThumb: embed?.thumb ?? null,
    externalProvider: embed?.kind === "external" ? embed.provider : null,
    externalUrl: embed?.kind === "external" ? embed.url : null,
  });
}