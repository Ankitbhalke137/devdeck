import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface RelatedVideo {
  vid: string;
  title: string;
  author: string;
}

function unescapeYt(s: string): string {
  return s.replace(/\\u0026/g, "&").replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseRelated(html: string, excludeId: string): RelatedVideo[] {
  const out: RelatedVideo[] = [];
  const seen = new Set<string>();

  // Extract ytInitialData JSON blob
  const startMarker = "ytInitialData = ";
  const startIdx = html.indexOf(startMarker);
  if (startIdx < 0) return out;
  const jsonStart = startIdx + startMarker.length;
  // Find the closing semicolon
  let depth = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length && i < jsonStart + 2000000; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) { jsonEnd = i + 1; break; }
    }
  }

  try {
    const d = JSON.parse(html.slice(jsonStart, jsonEnd));
    const contents =
      d?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]
        ?.itemSectionRenderer?.contents || [];

    for (const c of contents) {
      // New YouTube format (2025+): lockupViewModel
      const lv = c.lockupViewModel;
      if (lv) {
        const vid = lv.contentId || "";
        const title = lv.metadata?.lockupMetadataViewModel?.title?.content || "";
        const author =
          lv.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
            ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || "";
        if (vid && title && vid !== excludeId && !seen.has(vid)) {
          seen.add(vid);
          out.push({ vid, title: unescapeYt(title), author: unescapeYt(author) });
        }
        continue;
      }

      // Legacy format: compactVideoRenderer
      const cvr = c.compactVideoRenderer;
      if (cvr) {
        const vid = cvr.videoId || "";
        const title = cvr.title?.simpleText || cvr.title?.runs?.[0]?.text || "";
        const author = cvr.shortBylineText?.runs?.[0]?.text || "";
        if (vid && title && vid !== excludeId && !seen.has(vid)) {
          seen.add(vid);
          out.push({ vid, title: unescapeYt(title), author: unescapeYt(author) });
        }
      }
    }
  } catch {
    // JSON parse failure — return empty
  }

  return out;
}

export async function GET(req: NextRequest) {
  const videoId = (req.nextUrl.searchParams.get("videoId") || "").trim();
  if (!videoId || videoId.length !== 11) {
    return NextResponse.json({ error: "Missing or invalid videoId." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`YouTube returned ${res.status}`);
    const html = await res.text();
    const related = parseRelated(html, videoId);
    return NextResponse.json({ results: related });
  } catch (err) {
    console.error("YouTube related videos failed:", err);
    return NextResponse.json({ error: "Could not fetch related videos.", results: [] });
  }
}
