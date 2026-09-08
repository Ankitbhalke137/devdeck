import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEARCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Placeholder sentinel values should not be treated as real keys. */
function isUsableKey(key: string | undefined | null): key is string {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 20) return false;
  if (k.startsWith("your_") || k.includes("your_api_key") || k.includes("REPLACE")) return false;
  return true;
}

interface SearchResult {
  vid: string;
  title: string;
  author: string;
}

/** Unescape the JSON-style \" and \\ sequences YouTube embeds in its HTML. */
function unescapeYt(s: string): string {
  return s.replace(/\\u0026/g, "&").replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
}

/** Parse videoRenderer blocks out of a YouTube search results page. */
function parseScrape(html: string): SearchResult[] {
  const out: SearchResult[] = [];
  let idx = 0;
  while (out.length < 10) {
    const start = html.indexOf('"videoRenderer":{', idx);
    if (start < 0) break;
    const chunk = html.slice(start, start + 6000);
    const vid = chunk.match(/"videoId":"([^"]+)"/)?.[1];
    const title = chunk.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1];
    const ownerStart = chunk.indexOf('"ownerText":');
    let author = "";
    if (ownerStart >= 0) {
      const a = chunk
        .slice(ownerStart, ownerStart + 400)
        .match(/"text":"((?:[^"\\]|\\.)*)"/)?.[1];
      if (a) author = a;
    }
    if (vid && title) {
      out.push({ vid, title: unescapeYt(title), author: unescapeYt(author) });
    }
    idx = start + 20;
  }
  return out;
}

/** Fallback search that needs no API key (reads the public results page). */
async function scrapeSearch(q: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`,
    { headers: { "User-Agent": SEARCH_UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`YouTube returned ${res.status}`);
  const html = await res.text();
  const results = parseScrape(html);
  if (results.length === 0) throw new Error("no results parsed");
  return results;
}

/** Official search via the YouTube Data API (used when a key is available). */
async function apiSearch(q: string, key: string): Promise<SearchResult[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&maxResults=10&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`YouTube Data API returned ${res.status}`);
  const data = (await res.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[];
  };
  return (data.items || [])
    .filter((it) => it.id?.videoId && it.snippet?.title)
    .map((it) => ({
      vid: it.id!.videoId!,
      title: it.snippet!.title!,
      author: it.snippet!.channelTitle || "",
    }));
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const vaultKey = (req.nextUrl.searchParams.get("key") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q parameter." }, { status: 400 });
  }

  const envKey = (process.env.YOUTUBE_API_KEY || "").trim();
  const key = isUsableKey(vaultKey) ? vaultKey : isUsableKey(envKey) ? envKey : "";

  if (key) {
    try {
      const results = await apiSearch(q, key);
      return NextResponse.json({ results, source: "api" });
    } catch {
      // fall through to the keyless scrape rather than failing the user
    }
  }

  try {
    const results = await scrapeSearch(q);
    return NextResponse.json({ results, source: "scrape" });
  } catch (err) {
    console.error("YouTube search failed:", err);
    return NextResponse.json({
      error: "YouTube search is unavailable right now.",
      needsKey: !key,
      results: [],
    });
  }
}
