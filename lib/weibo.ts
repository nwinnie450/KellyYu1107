// lib/weibo.ts
export type WeiboVideoEmbed =
  | { kind: "iframe"; src: string; thumb?: string }
  | { kind: "external"; provider?: string; url?: string; thumb?: string }
  | null;

type MBlog = {
  page_info?: {
    type?: string;
    object_id?: string;
    page_pic?: { url?: string };
    media_info?: {
      h5_url?: string;
      extern_site?: string;
      page_url?: string;
      // mp4/stream fields exist but we won't use them in the browser
    };
  };
  retweeted_status?: MBlog;
};

async function fetchWeiboStatusByUrl(postUrl: string): Promise<MBlog | null> {
  try {
    const u = new URL(postUrl);
    const shortId = u.pathname.split("/").filter(Boolean).pop();
    if (!shortId) return null;

    const api = `https://m.weibo.cn/statuses/show?id=${encodeURIComponent(shortId)}`;
    const res = await fetch(api, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json,text/plain,*/*",
      },
      // cache a bit to reduce hammering
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function pickEmbed(mb?: MBlog): WeiboVideoEmbed {
  if (!mb?.page_info) return null;
  const pi = mb.page_info;
  const mi = pi.media_info ?? {};

  if (mi.h5_url) return { kind: "iframe", src: mi.h5_url, thumb: pi.page_pic?.url };

  // Build an iframe player from object_id as fallback
  if (pi.object_id && (pi.type || "").toLowerCase().includes("video")) {
    const src = `https://m.weibo.cn/s/video/show?object_id=${encodeURIComponent(pi.object_id)}`;
    return { kind: "iframe", src, thumb: pi.page_pic?.url };
  }

  // External providers (bilibili/youku/douyin etc.)
  if (mi.page_url || mi["extern_site"]) {
    return { kind: "external", provider: mi["extern_site"], url: mi.page_url, thumb: pi.page_pic?.url };
  }
  return null;
}

export async function getWeiboVideoAutoEmbed(postUrl: string): Promise<WeiboVideoEmbed> {
  const mblog = await fetchWeiboStatusByUrl(postUrl);
  return pickEmbed(mblog) ?? pickEmbed(mblog?.retweeted_status) ?? null;
}