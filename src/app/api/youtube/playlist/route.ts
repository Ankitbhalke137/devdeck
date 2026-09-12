import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function isUsableKey(key: string | undefined | null): key is string {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 20) return false;
  if (k.startsWith("your_") || k.includes("your_api_key") || k.includes("REPLACE")) return false;
  return true;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  videoId: string;
}

function unescapeYt(s: string): string {
  return s.replace(/\\u0026/g, "&").replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
}

/** Parse playlist items from YouTube's playlist page HTML. */
function parsePlaylistScrape(html: string): Track[] {
  const out: Track[] = [];
  let idx = 0;

  while (out.length < 100) {
    const start = html.indexOf('"playlistVideoRenderer":{', idx);
    if (start < 0) break;
    const chunk = html.slice(start, start + 3000);
    const vid = chunk.match(/"videoId":"([^"]+)"/)?.[1];
    const titleMatch = chunk.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const title = titleMatch?.[1];
    const channelMatch = chunk.match(/"shortBylineText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const artist = channelMatch?.[1];

    if (vid && title) {
      out.push({
        id: `playlist-scraped-${out.length}`,
        title: unescapeYt(title),
        artist: unescapeYt(artist || "YouTube"),
        videoId: vid,
      });
    }
    idx = start + 25;
  }
  return out;
}

/** Fallback: scrape the public playlist page. */
async function scrapePlaylist(playlistId: string): Promise<Track[]> {
  const res = await fetch(
    `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
    { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`YouTube returned ${res.status}`);
  const html = await res.text();
  const results = parsePlaylistScrape(html);
  if (results.length === 0) throw new Error("no playlist items parsed");
  return results;
}

/** Official API fetch via YouTube Data API v3. */
async function apiPlaylist(playlistId: string, key: string): Promise<Track[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50` +
    `&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`YouTube Data API returned ${res.status}`);
  const data = (await res.json()) as {
    items?: { snippet?: { title?: string; channelTitle?: string; resourceId?: { videoId?: string } } }[];
  };
  return (data.items || [])
    .filter((it) => it.snippet?.resourceId?.videoId && it.snippet?.title)
    .map((it, i) => ({
      id: `playlist-api-${i}`,
      title: it.snippet!.title!,
      artist: it.snippet!.channelTitle || "YouTube",
      videoId: it.snippet!.resourceId!.videoId!,
    }));
}

export async function GET(req: NextRequest) {
  const playlistId = (req.nextUrl.searchParams.get("id") || "").trim();
  const vaultKey = (req.nextUrl.searchParams.get("key") || "").trim();

  if (!playlistId) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }

  const envKey = (process.env.YOUTUBE_API_KEY || "").trim();
  const key = isUsableKey(vaultKey) ? vaultKey : isUsableKey(envKey) ? envKey : "";

  if (key) {
    try {
      const tracks = await apiPlaylist(playlistId, key);
      return NextResponse.json({ tracks, source: "api" });
    } catch {
      // fall through to scrape
    }
  }

  try {
    const tracks = await scrapePlaylist(playlistId);
    return NextResponse.json({ tracks, source: "scrape" });
  } catch (err) {
    console.error("YouTube playlist fetch failed:", err);
    return NextResponse.json({
      error: "Could not load playlist. Check the URL and try again.",
      needsKey: !key,
      tracks: [],
    });
  }
}
