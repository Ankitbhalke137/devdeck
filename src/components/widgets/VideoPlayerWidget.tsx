"use client";

import { useState, useCallback } from "react";
import {
  Tv,
  Play,
  Search,
  Bookmark,
  History,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  X,
  Trash2,
} from "lucide-react";

interface PresetVideo {
  id: string;
  title: string;
  category: "talks" | "ambient" | "keynotes";
  author: string;
  videoId: string;
  thumbnail?: string;
}

const CURATED_VIDEOS: PresetVideo[] = [
  {
    id: "lofi-live",
    title: "Lofi Girl — Beats to Relax / Study to 📚",
    category: "ambient",
    author: "Lofi Girl",
    videoId: "jfKfPfyJRdk",
  },
  {
    id: "synth-night",
    title: "Synthwave Radio — Chill Synth / Retro Beats 🌆",
    category: "ambient",
    author: "Lofi Girl Synthwave",
    videoId: "4xDzrJKXOOY",
  },
  {
    id: "rainy-cyberpunk",
    title: "Cyberpunk Hacker Room — Neon Rain & Lo-Fi ☔",
    category: "ambient",
    author: "Cyber Ambience",
    videoId: "3jWRrafhO7M",
  },
  {
    id: "coffee-shop",
    title: "Cozy Tokyo Coffee Shop — Rain & Acoustic Beats ☕",
    category: "ambient",
    author: "Coffee & Jazz",
    videoId: "e3L1Ias4jHI",
  },
  {
    id: "fireship-git",
    title: "Git Explained in 100 Seconds ⚡",
    category: "talks",
    author: "Fireship",
    videoId: "hwP7WQkmECE",
  },
  {
    id: "primeagen-vim",
    title: "Why Neovim in 2026? Developer Flow",
    category: "talks",
    author: "ThePrimeagen",
    videoId: "w7i4amO_zaE",
  },
  {
    id: "lex-altman",
    title: "OpenAI CEO: AGI, Superintelligence & Future of Code",
    category: "talks",
    author: "Lex Fridman Podcast",
    videoId: "jvqFAi7vkBc",
  },
  {
    id: "mit-dist-sys",
    title: "MIT 6.824: Distributed Systems Lecture 1",
    category: "keynotes",
    author: "MIT OpenCourseWare",
    videoId: "cQP8WApzIQQ",
  },
];

interface SavedVideo {
  id: string;
  title: string;
  url: string;
  sourceType: "youtube" | "html5" | "twitch" | "vimeo";
  author?: string;
  addedAt: number;
}

const STORAGE_HISTORY = "devdeck.video.history.v1";
const STORAGE_FAVORITES = "devdeck.video.favorites.v1";

export function VideoPlayerWidget() {
  const [activeTab, setActiveTab] = useState<"player" | "search" | "curated" | "saved">("player");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [currentVideo, setCurrentVideo] = useState<{
    url: string;
    sourceType: "youtube" | "html5" | "twitch" | "vimeo";
    id: string;
    title: string;
    author?: string;
  }>({
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    sourceType: "youtube",
    id: "jfKfPfyJRdk",
    title: "Lofi Girl — Beats to Relax / Study to 📚",
    author: "Lofi Girl",
  });

  const [ambientGlow, setAmbientGlow] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ vid: string; title: string; author: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState<SavedVideo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const favs = localStorage.getItem(STORAGE_FAVORITES);
      return favs ? JSON.parse(favs) : [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState<SavedVideo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const hist = localStorage.getItem(STORAGE_HISTORY);
      return hist ? JSON.parse(hist) : [];
    } catch {
      return [];
    }
  });
  const [curatedCategory, setCuratedCategory] = useState<"all" | "ambient" | "talks" | "keynotes">("all");

  const saveToHistory = useCallback((item: Omit<SavedVideo, "addedAt">) => {
    setHistory((prev) => {
      const entry: SavedVideo = { ...item, addedAt: Date.now() };
      const filtered = prev.filter((v) => v.url !== entry.url);
      const updated = [entry, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      const isFav = prev.some((f) => f.url === currentVideo.url);
      const updated = isFav
        ? prev.filter((f) => f.url !== currentVideo.url)
        : [
            {
              id: currentVideo.id,
              title: currentVideo.title,
              url: currentVideo.url,
              sourceType: currentVideo.sourceType,
              author: currentVideo.author,
              addedAt: Date.now(),
            },
            ...prev,
          ];
      try {
        localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [currentVideo]);

  // Parse video input into type and identifier
  const parseVideoUrl = (raw: string) => {
    const input = raw.trim();
    if (!input) return null;

    // Direct MP4 / WebM
    if (input.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
      return {
        url: input,
        sourceType: "html5" as const,
        id: input,
        title: input.split("/").pop()?.split("?")[0] || "HTML5 Video",
      };
    }

    // Twitch
    const twitchMatch = input.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
    if (twitchMatch) {
      const channel = twitchMatch[1];
      return {
        url: input,
        sourceType: "twitch" as const,
        id: channel,
        title: `Twitch: ${channel}`,
      };
    }

    // Vimeo
    const vimeoMatch = input.match(/vimeo\.com\/(\d+)/i);
    if (vimeoMatch) {
      const vid = vimeoMatch[1];
      return {
        url: input,
        sourceType: "vimeo" as const,
        id: vid,
        title: `Vimeo #${vid}`,
      };
    }

    // YouTube regex patterns
    let ytId = "";
    const ytMatch = input.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch) {
      ytId = ytMatch[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      ytId = input;
    }

    if (ytId) {
      return {
        url: `https://www.youtube.com/watch?v=${ytId}`,
        sourceType: "youtube" as const,
        id: ytId,
        title: `YouTube: ${ytId}`,
      };
    }

    return null;
  };

  const handleLoadCustomUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseVideoUrl(videoUrlInput);
    if (parsed) {
      setCurrentVideo(parsed);
      saveToHistory({
        id: parsed.id,
        title: parsed.title,
        url: parsed.url,
        sourceType: parsed.sourceType,
      });
      setVideoUrlInput("");
      setActiveTab("player");
    }
  };

  const playPreset = (preset: PresetVideo) => {
    const video = {
      url: `https://www.youtube.com/watch?v=${preset.videoId}`,
      sourceType: "youtube" as const,
      id: preset.videoId,
      title: preset.title,
      author: preset.author,
    };
    setCurrentVideo(video);
    saveToHistory({
      id: preset.videoId,
      title: preset.title,
      url: video.url,
      sourceType: "youtube",
      author: preset.author,
    });
    setActiveTab("player");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results);
      }
    } catch {
      // fail gracefully
    } finally {
      setIsSearching(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentVideo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const isFavorited = favorites.some((f) => f.url === currentVideo.url);

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden shadow-sm">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom bg-surface-2/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-rose-500/10 text-rose-400">
            <Tv className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-primary truncate">Video Player</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-muted uppercase font-mono tracking-wider">
            {currentVideo.sourceType}
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("player")}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-all ${
              activeTab === "player"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                : "text-muted hover:text-primary hover:bg-surface-3"
            }`}
          >
            Player
          </button>
          <button
            onClick={() => setActiveTab("curated")}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-all ${
              activeTab === "curated"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                : "text-muted hover:text-primary hover:bg-surface-3"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-all ${
              activeTab === "search"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                : "text-muted hover:text-primary hover:bg-surface-3"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-2 py-1 text-[11px] rounded font-medium transition-all ${
              activeTab === "saved"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                : "text-muted hover:text-primary hover:bg-surface-3"
            }`}
          >
            Saved ({favorites.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {activeTab === "player" && (
          <div className="flex-1 flex flex-col p-3 gap-3">
            {/* Quick URL Input Bar */}
            <form onSubmit={handleLoadCustomUrl} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste YouTube, MP4, or Twitch stream URL..."
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="w-full text-xs bg-surface-2 border border-custom rounded-md pl-2.5 pr-8 py-1.5 text-primary placeholder:text-muted/60 focus:outline-none focus:border-rose-500/40"
                />
                {videoUrlInput && (
                  <button
                    type="button"
                    onClick={() => setVideoUrlInput("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!videoUrlInput.trim()}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Load
              </button>
            </form>

            {/* Video Canvas Container with Ambient Glow */}
            <div className="relative w-full rounded-lg overflow-hidden bg-black/80 border border-white/5 shadow-2xl flex items-center justify-center">
              {ambientGlow && (
                <div className="absolute -inset-1 bg-linear-to-r from-rose-500/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-xl opacity-60 pointer-events-none -z-10 animate-pulse" />
              )}

              <div className="w-full aspect-video relative flex items-center justify-center bg-zinc-950">
                {currentVideo.sourceType === "youtube" && (
                  <iframe
                    key={currentVideo.id}
                    src={`https://www.youtube-nocookie.com/embed/${currentVideo.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}

                {currentVideo.sourceType === "html5" && (
                  <video
                    key={currentVideo.url}
                    src={currentVideo.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}

                {currentVideo.sourceType === "twitch" && (
                  <iframe
                    src={`https://player.twitch.tv/?channel=${currentVideo.id}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`}
                    title={currentVideo.title}
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}

                {currentVideo.sourceType === "vimeo" && (
                  <iframe
                    src={`https://player.vimeo.com/video/${currentVideo.id}?autoplay=1`}
                    title={currentVideo.title}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            </div>

            {/* Video Details & Quick Controls Bar */}
            <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-primary truncate leading-tight">
                  {currentVideo.title}
                </h4>
                {currentVideo.author && (
                  <p className="text-[11px] text-muted truncate">{currentVideo.author}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className={`p-1.5 rounded transition-colors ${
                    ambientGlow
                      ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                      : "text-muted hover:text-primary hover:bg-surface-3"
                  }`}
                  title={ambientGlow ? "Ambient Glow On" : "Ambient Glow Off"}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={toggleFavorite}
                  className={`p-1.5 rounded transition-colors ${
                    isFavorited
                      ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                      : "text-muted hover:text-primary hover:bg-surface-3"
                  }`}
                  title={isFavorited ? "Remove from Bookmarks" : "Bookmark Video"}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={isFavorited ? "currentColor" : "none"} />
                </button>

                <button
                  onClick={copyUrl}
                  className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
                  title="Copy video link"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>

                <a
                  href={currentVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div className="pt-1">
              <div className="text-[10px] uppercase font-mono tracking-wider text-muted mb-1.5">
                Quick Developer Channels
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CURATED_VIDEOS.slice(0, 4).map((video) => (
                  <button
                    key={video.id}
                    onClick={() => playPreset(video)}
                    className="flex items-center gap-2 p-2 rounded-md bg-surface-2 hover:bg-surface-3 border border-custom text-left transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-surface-3 group-hover:bg-rose-500/20 text-muted group-hover:text-rose-400 transition-colors shrink-0">
                      <Play className="h-3 w-3" fill="currentColor" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-primary truncate">{video.title}</div>
                      <div className="text-[10px] text-muted truncate">{video.author}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Curated Channels Tab */}
        {activeTab === "curated" && (
          <div className="p-3 space-y-3">
            {/* Filter tags */}
            <div className="flex items-center gap-1.5">
              {(["all", "ambient", "talks", "keynotes"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCuratedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                    curatedCategory === cat
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-surface-2 text-muted hover:text-primary border border-custom"
                  }`}
                >
                  {cat === "all" ? "All Channels" : cat}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {CURATED_VIDEOS.filter((v) => curatedCategory === "all" || v.category === curatedCategory).map(
                (video) => (
                  <div
                    key={video.id}
                    onClick={() => playPreset(video)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-custom cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                        <Play className="h-4 w-4" fill="currentColor" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-primary truncate group-hover:text-rose-400 transition-colors">
                          {video.title}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          <span>{video.author}</span>
                          <span>•</span>
                          <span className="capitalize font-mono text-[10px]">{video.category}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-surface-3 text-muted group-hover:text-primary transition-colors shrink-0">
                      Play Now
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="p-3 space-y-3">
            <form onSubmit={handleSearch} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search coding talks, tutorials, tech keynotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-surface-2 border border-custom rounded-md pl-8 pr-3 py-1.5 text-primary placeholder:text-muted/60 focus:outline-none focus:border-rose-500/40"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-md text-xs font-medium disabled:opacity-40 transition-colors shrink-0"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted text-xs">
                Search millions of developer videos, livestreams, and podcasts.
              </div>
            )}

            <div className="space-y-1.5">
              {searchResults.map((res) => (
                <div
                  key={res.vid}
                  onClick={() => {
                    const video = {
                      url: `https://www.youtube.com/watch?v=${res.vid}`,
                      sourceType: "youtube" as const,
                      id: res.vid,
                      title: res.title,
                      author: res.author,
                    };
                    setCurrentVideo(video);
                    saveToHistory({
                      id: res.vid,
                      title: res.title,
                      url: video.url,
                      sourceType: "youtube",
                      author: res.author,
                    });
                    setActiveTab("player");
                  }}
                  className="flex items-center justify-between p-2 rounded-md bg-surface-2 hover:bg-surface-3 border border-custom cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Play className="h-3.5 w-3.5 text-muted group-hover:text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-primary font-medium truncate group-hover:text-rose-400 transition-colors">
                        {res.title}
                      </div>
                      <div className="text-[10px] text-muted truncate">{res.author}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-3 text-muted shrink-0">Play</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved & History Tab */}
        {activeTab === "saved" && (
          <div className="p-3 space-y-4">
            {/* Bookmarked Videos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-rose-400" />
                  <span>Bookmarks ({favorites.length})</span>
                </div>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-4 bg-surface-2/40 rounded border border-dashed border-custom text-xs text-muted">
                  No bookmarked videos yet. Click the bookmark icon on any playing video!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {favorites.map((fav) => (
                    <div
                      key={fav.url}
                      className="flex items-center justify-between p-2 rounded-md bg-surface-2 hover:bg-surface-3 border border-custom transition-colors group"
                    >
                      <div
                        onClick={() => {
                          setCurrentVideo({
                            url: fav.url,
                            sourceType: fav.sourceType,
                            id: fav.id,
                            title: fav.title,
                            author: fav.author,
                          });
                          setActiveTab("player");
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-primary truncate group-hover:text-rose-400 transition-colors">
                            {fav.title}
                          </div>
                          <div className="text-[10px] text-muted font-mono">{fav.sourceType}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const next = favorites.filter((f) => f.url !== fav.url);
                          setFavorites(next);
                          localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(next));
                        }}
                        className="p-1 text-muted hover:text-rose-400 rounded transition-colors"
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-blue-400" />
                  <span>Recently Played ({history.length})</span>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem(STORAGE_HISTORY);
                    }}
                    className="text-[10px] text-muted hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-3 text-xs text-muted">No watch history yet.</div>
              ) : (
                <div className="space-y-1">
                  {history.map((hist) => (
                    <div
                      key={hist.url}
                      onClick={() => {
                        setCurrentVideo({
                          url: hist.url,
                          sourceType: hist.sourceType,
                          id: hist.id,
                          title: hist.title,
                          author: hist.author,
                        });
                        setActiveTab("player");
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-surface-2 hover:bg-surface-3 cursor-pointer text-xs group transition-colors"
                    >
                      <span className="text-primary truncate text-xs flex-1 group-hover:text-rose-400 transition-colors">
                        {hist.title}
                      </span>
                      <span className="text-[10px] text-muted shrink-0 ml-2 font-mono">
                        {new Date(hist.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
