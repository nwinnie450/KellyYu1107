# 📄 PRD – Kelly Yu Wen Wen Global Updates Hub

## 1. Overview

Fans outside of China cannot easily follow updates across **Weibo, Douyin, Sohu Video, Xiaohongshu (RED), and Instagram**.
This project creates a **centralized webpage** that **fetches new posts automatically** and displays them in a clean, multimedia-friendly feed.

The hub ensures that **text, images, and videos** are aggregated and accessible worldwide, without requiring users to install or navigate each platform individually.

---

## 2. Objectives

* Provide a **single webpage** where fans can see all updates from Kelly Yu Wen Wen.
* **Aggregate posts** (Weibo, Douyin, Sohu, Xiaohongshu, Instagram) via feed/APIs or scraping proxies.
* Ensure **freshness** (updates appear within minutes of posting).
* Support **direct media playback** (images inline, videos embedded or autoplay where possible).
* Work globally (accessible outside China).
* Mobile-first design (optimize for phones).
* Minimal latency, with caching/CDN.

---

## 3. Key Features

### 3.1 Feed Aggregation

* **Weibo**: public posts (text, image, video, reposts).
* **Douyin**: short videos (with autoplay or embed player).
* **Sohu Video**: long-form video, embedded or inline preview.
* **Xiaohongshu (RED Notes)**: image/video posts with captions.
* **Instagram**: official IG feed (via Graph API or embed).

### 3.2 Unified Feed

* Posts merged into a single chronological feed.
* Each item shows:

  * Platform icon (Weibo/Douyin/etc.)
  * Timestamp (localized for user)
  * Text snippet/description
  * Inline **image gallery**
  * Inline **video player** (with autoplay muted/loop; fallback to embed if direct link blocked).
  * Link to **original post**.

### 3.3 Media Handling

* **Images**: proxied through server (avoid hotlink restrictions).
* **Videos**:

  * Try direct `<video src>` if accessible.
  * Else fallback to **official platform embed iframe**.
* **IG/RED**: prefer official embed for compliance.
* **Lightbox Modal**: Click/tap to enlarge images/videos with:
  * Full-screen viewing experience
  * Original size toggle option
  * Mobile-optimized touch gestures
  * Gallery navigation for multiple media
  * Zoom in/out controls

### 3.4 Refresh & Sync

* **Backend scheduled fetch** (every 5–10 min).
* Normalize posts into a **common schema**:

  ```json
  {
    "id": "string",
    "platform": "weibo|douyin|sohu|red|ig",
    "author": "Kelly Yu",
    "text": "string",
    "media": [{ "type": "image|video|embed", "src": "url", "poster": "url" }],
    "url": "original link",
    "publishedAt": "ISO date"
  }
  ```
* Cache results in **Vercel KV / Redis** for fast read.

### 3.5 UI/UX

* **Infinite scroll feed**.
* **Filters** (by platform).
* **Light/dark mode**.
* Responsive layout:

  * Desktop → 2–3 column grid.
  * Mobile → single column.

---

## 4. Non-Functional Requirements

* **Performance**:

  * Load initial feed in <2s.
  * CDN caching for media.
* **Scalability**:

  * Support >10k daily visitors.
* **Availability**:

  * Deployed on **Vercel** (serverless, global edge).
* **Legal/Compliance**:

  * Respect platform ToS.
  * Use **embeds** when required (esp. IG/Douyin).
* **Security**:

  * Sanitize external content.
  * Rate limit scrapers.

---

## 5. Technical Architecture

### 5.1 Data Ingestion

* **Option A: RSSHub**

  * Self-hosted to fetch Weibo, Douyin, Sohu, RED.
  * Converts posts → RSS/JSON feed.

* **Option B: Official APIs** (when available)

  * Instagram Graph API.
  * Douyin/Weibo developer APIs (if accessible).

*(Hybrid recommended: RSSHub for Chinese platforms, official APIs for IG.)*

### 5.2 Backend

* **Next.js (App Router)** on Vercel.
* **API Routes** for ingestion & proxying media.
* **Cron jobs (Vercel Scheduled Functions)** to poll feeds every 5–10 min.
* Store normalized posts in **Vercel KV / Redis**.

### 5.3 Frontend

* **Next.js pages** render feed.
* **Framer Motion** for animations.
* **Tailwind CSS** for styling.
* **Card UI** per post (platform badge, text, media, link).

### 5.4 Media Proxy

* `/api/media?url=...` route to fetch + cache images/videos server-side → avoid hotlink/CORS issues.

---

## 6. Future Enhancements

* **Search** posts by keyword.
* **Tag/Topic filter** (#hashtags from Weibo/IG).
* **Push notifications** (subscribe to new updates).
* **Offline archiving** (store posts in DB for history).
* **Translation toggle** (Chinese → English).

---

## 7. Risks & Mitigation

* **Platform anti-scraping** → Use RSSHub + embeds, respect rate limits.
* **Video playback restrictions** → Always fallback to embeds if direct streaming fails.
* **Legal/TOS compliance** → Clearly attribute sources, don't re-host full videos without embed/permission.

---

## 8. Success Metrics

* **Engagement**: Daily Active Users (DAU), Avg. session time.
* **Coverage**: % of Kelly's posts successfully mirrored within 10 min.
* **Performance**: Avg. page load time < 2s.
* **Reliability**: Uptime > 99%.

---

✅ With this PRD, you can:

* Start MVP using **RSSHub + Vercel KV + Next.js**.
* Iterate later with **official APIs** for more stability.