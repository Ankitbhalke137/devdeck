"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Timer,
  Coffee,
  Target,
  Volume2,
  VolumeX,
  Music4,
  Loader2,
  Search,
  X,
  ExternalLink,
} from "lucide-react";

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

// Verified working YouTube video IDs (oEmbed-checked).
const presetTracks = [
  { id: "1", title: "Deep Focus", artist: "Lo-Fi Beats", videoId: "jfKfPfyJRdk" },
  { id: "2", title: "Ambient Rain", artist: "Nature Sounds", videoId: "mPZkdNFkNps" },
  { id: "3", title: "Jazz Vibes", artist: "Chill Jazz", videoId: "Dx5qFachd3A" },
  { id: "4", title: "Classical Calm", artist: "Piano Dreams", videoId: "9E6b3swbnWg" },
];

type Track = (typeof presetTracks)[number];

// Minimal typed surface of the YouTube IFrame API we use.
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
}

interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

interface YTPlayerConstructor {
  new (
    elementId: string,
    options: {
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady: (e: YTPlayerEvent) => void;
        onStateChange: (e: YTPlayerEvent) => void;
        onError: () => void;
      };
    }
  ): YTPlayer;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
}

interface YTWindow extends Window {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}

const getYT = (): YTNamespace | undefined => (window as YTWindow).YT;

/* ---------- YouTube link parsing + metadata helpers ---------- */

const YT_URL_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const BARE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Pull a video id out of any YouTube URL form, or a bare 11-char id. */
function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(YT_URL_RE);
  if (urlMatch) return urlMatch[1];
  // Only treat a bare token as an id if it really is an 11-char video id.
  if (BARE_ID_RE.test(trimmed) && !trimmed.includes(" ")) return trimmed;
  return null;
}

interface YTOEmbed {
  title?: string;
  author_name?: string;
}

/** Fetch a video's real title/channel from YouTube's public oEmbed endpoint. */
async function fetchOEmbed(videoId: string): Promise<YTOEmbed> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return {};
    return (await res.json()) as YTOEmbed;
  } catch {
    return {};
  }
}

interface SearchHit {
  vid: string;
  title: string;
  author: string;
}

/** Pull the user's saved YouTube Data API key out of the Settings vault, if any. */
function getVaultYouTubeKey(): string {
  try {
    const raw = localStorage.getItem("devdeck.apiKeys.v1");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Record<string, string>;
    return (parsed.youtube || "").trim();
  } catch {
    return "";
  }
}

export function FocusStationWidget() {
  const [pomodoroMode, setPomodoroMode] = useState<"focus" | "short_break" | "long_break">("focus");
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [currentTrack, setCurrentTrack] = useState<Track>(presetTracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [playerReady, setPlayerReady] = useState(false);
  const [trackError, setTrackError] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const trackRef = useRef<Track>(presetTracks[0]);
  const volumeRef = useRef(70);
  const pendingVideoRef = useRef<string | null>(null);
  const modeRef = useRef(pomodoroMode);
  const countRef = useRef(pomodoroCount);

  useEffect(() => {
    modeRef.current = pomodoroMode;
  }, [pomodoroMode]);
  useEffect(() => {
    countRef.current = pomodoroCount;
  }, [pomodoroCount]);

  /* ---------- Pomodoro timer ---------- */
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (modeRef.current === "focus") {
              const next = countRef.current + 1;
              setPomodoroCount(next);
              if (next % 4 === 0) {
                setPomodoroMode("long_break");
                return LONG_BREAK;
              } else {
                setPomodoroMode("short_break");
                return SHORT_BREAK;
              }
            } else {
              setPomodoroMode("focus");
              return FOCUS_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  /* ---------- Real YouTube IFrame API player (hidden, audio only) ---------- */
  const advancePomodoro = useCallback(() => {
    setIsRunning(false);
    if (modeRef.current === "focus") {
      const next = countRef.current + 1;
      setPomodoroCount(next);
      if (next % 4 === 0) {
        setPomodoroMode("long_break");
        setTimeLeft(LONG_BREAK);
      } else {
        setPomodoroMode("short_break");
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      setPomodoroMode("focus");
      setTimeLeft(FOCUS_DURATION);
    }
  }, []);

  useEffect(() => {
    const initPlayer = () => {
      const YT = (window as YTWindow).YT;
      if (!YT?.Player || playerRef.current) return;

      playerRef.current = new YT.Player("focus-youtube-player", {
        videoId: trackRef.current.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e: YTPlayerEvent) => {
            const videoId = pendingVideoRef.current || trackRef.current.videoId;
            if (videoId !== trackRef.current.videoId) {
              e.target.loadVideoById(videoId);
            }
            e.target.setVolume(volumeRef.current);
            setPlayerReady(true);
          },
          onStateChange: (e: YTPlayerEvent) => {
            if (e.data === 1) {
              setIsPlaying(true);
              setTrackError(false);
            } else if (e.data === 2 || e.data === 0) {
              setIsPlaying(false);
            }
            if (e.data === 0) {
              advancePomodoro();
            }
          },
          onError: () => {
            setTrackError(true);
            setIsPlaying(false);
          },
        },
      });
    };

    const YT = (window as YTWindow).YT;
    if (YT?.Player) {
      initPlayer();
      return;
    }
    (window as YTWindow).onYouTubeIframeAPIReady = initPlayer;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, [advancePomodoro]);

  /* ---------- Controls ---------- */
  const handlePlayPause = () => {
    const player = playerRef.current;
    if (!player || !playerReady) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    trackRef.current = track;
    setTrackError(false);
    const player = playerRef.current;
    if (player && playerReady) {
      player.loadVideoById(track.videoId);
      player.playVideo();
    } else {
      pendingVideoRef.current = track.videoId;
    }
  };

  const handleSkip = (direction: "prev" | "next") => {
    const idx = presetTracks.findIndex((t) => t.id === trackRef.current.id);
    const nextIdx = (idx + (direction === "next" ? 1 : -1) + presetTracks.length) % presetTracks.length;
    handleSelectTrack(presetTracks[nextIdx]);
  };

  const handleVolume = (value: number) => {
    setVolume(value);
    volumeRef.current = value;
    playerRef.current?.setVolume(value);
  };

  const handleStartPause = () => setIsRunning(!isRunning);

  /* ---------- Find music: paste a link or search YouTube ---------- */
  const playYouTubeId = async (videoId: string, fallbackTitle: string, fallbackAuthor: string) => {
    const meta = await fetchOEmbed(videoId);
    handleSelectTrack({
      id: "custom-" + videoId,
      title: meta.title || fallbackTitle || "Custom track",
      artist: meta.author_name || fallbackAuthor || "YouTube",
      videoId,
    });
  };

  const handleFindMusic = async () => {
    const raw = searchText.trim();
    if (!raw || searching) return;

    const videoId = extractYouTubeId(raw);
    if (videoId) {
      setSearchResults([]);
      setSearchMsg(null);
      setSearching(true);
      await playYouTubeId(videoId, raw, "");
      setSearching(false);
      setSearchText("");
      setShowSearch(false);
      return;
    }

    setSearching(true);
    setSearchMsg(null);
    try {
      const key = getVaultYouTubeKey();
      const params = new URLSearchParams({ q: raw });
      if (key) params.set("key", key);
      const res = await fetch(`/api/youtube/search?${params.toString()}`);
      const data = (await res.json()) as {
        results?: SearchHit[];
        error?: string;
        needsKey?: boolean;
      };
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else if (data.needsKey) {
        setSearchResults([]);
        setSearchMsg(
          "Search needs a YouTube Data API key — add one in Settings → API Keys (it's free) and try again."
        );
      } else {
        setSearchResults([]);
        setSearchMsg(data.error || "No results found — try different words.");
      }
    } catch {
      setSearchResults([]);
      setSearchMsg("Search failed — is the server running?");
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (pomodoroMode === "focus") setTimeLeft(FOCUS_DURATION);
    else if (pomodoroMode === "short_break") setTimeLeft(SHORT_BREAK);
    else setTimeLeft(LONG_BREAK);
  };

  const handleSkipMode = () => {
    setIsRunning(false);
    if (pomodoroMode === "focus") {
      setPomodoroMode("short_break");
      setTimeLeft(SHORT_BREAK);
    } else {
      setPomodoroMode("focus");
      setTimeLeft(FOCUS_DURATION);
    }
  };

  const getProgress = () => {
    const total =
      pomodoroMode === "focus"
        ? FOCUS_DURATION
        : pomodoroMode === "short_break"
        ? SHORT_BREAK
        : LONG_BREAK;
    return ((total - timeLeft) / total) * 100;
  };

  const getModeColor = () => {
    switch (pomodoroMode) {
      case "focus":
        return "text-emerald-500";
      case "short_break":
        return "text-sky-500";
      case "long_break":
        return "text-indigo-500";
    }
  };

  const getModeLabel = () => {
    switch (pomodoroMode) {
      case "focus":
        return "Focus Time";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      {/* Hidden YouTube player (audio only — no video UI) */}
      <div className="pointer-events-none fixed left-[-9999px] top-0 h-[1px] w-[1px] overflow-hidden" aria-hidden="true">
        <div id="focus-youtube-player" />
      </div>

      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-medium text-primary">Focus Station</span>
        </div>
        <span className="text-xs text-muted">{pomodoroCount} 🍅 completed</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Pomodoro Timer */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${getModeColor()}`}>{getModeLabel()}</span>
            <span className="text-xs text-muted">
              {pomodoroMode === "focus" ? "🍅" : pomodoroMode === "short_break" ? "☕" : "🛋️"}
            </span>
          </div>

          <div className="text-center mb-3">
            <div className="text-3xl font-mono font-bold text-primary">
              {formatTime(timeLeft)}
            </div>
            <div className="w-full h-2 bg-surface-3 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  pomodoroMode === "focus" ? "bg-emerald-500" : "bg-sky-500"
                }`}
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
              title="Reset timer"
            >
              <Timer className="h-4 w-4" />
            </button>
            <button
              onClick={handleStartPause}
              className={`p-3 rounded-full transition-colors ${
                isRunning ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {isRunning ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white" />
              )}
            </button>
            <button
              onClick={handleSkipMode}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
              title="Skip to next mode"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Music Player */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted flex items-center gap-1.5">
              <Music4 className="h-3.5 w-3.5" /> Now Playing
            </span>
            {!playerReady && (
              <span className="text-[10px] text-muted flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading player…
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-surface-3 rounded flex items-center justify-center">
              <Headphones className="h-5 w-5 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-muted truncate">{currentTrack.artist}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSkip("prev")}
                className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
                title="Previous track"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={!playerReady}
                className={`p-2.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlaying ? "bg-rose-500 hover:bg-rose-600" : "bg-surface-3 hover:bg-surface-2"
                }`}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-primary" />
                )}
              </button>
              <button
                onClick={() => handleSkip("next")}
                className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
                title="Next track"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>

          {trackError && (
            <p className="mt-2 text-[11px] text-rose-400">
              This track could not load — try another one.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <VolumeX className="h-3.5 w-3.5 text-muted flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolume(parseInt(e.target.value))}
              className="w-full h-1 bg-surface-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
            />
            <Volume2 className="h-3.5 w-3.5 text-muted flex-shrink-0" />
          </div>

          {/* Find music: paste any link or search */}
          <div className="mt-3 pt-3 border-t border-custom">
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded border border-dashed border-custom bg-surface-2 hover:bg-surface-3 text-xs text-secondary transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                Search or paste any YouTube link
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFindMusic();
                      if (e.key === "Escape") {
                        setShowSearch(false);
                        setSearchText("");
                        setSearchResults([]);
                        setSearchMsg(null);
                      }
                    }}
                    autoFocus
                    placeholder="Paste a YouTube link or search…"
                    className="flex-1 min-w-0 bg-surface-1 border border-custom rounded px-2.5 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    onClick={handleFindMusic}
                    disabled={searching || !searchText.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Search"
                  >
                    {searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchText("");
                      setSearchResults([]);
                      setSearchMsg(null);
                    }}
                    className="p-2 text-muted hover:bg-surface-3 rounded transition-colors"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted">
                  Tip: any YouTube URL works instantly — e.g. a song, live stream or lofi radio.
                </p>

                {searchMsg && (
                  <p className="mt-2 text-[10px] text-amber-400/90 leading-snug">{searchMsg}</p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-0.5">
                    {searchResults.map((hit) => (
                      <button
                        key={hit.vid}
                        onClick={() => {
                          setSearching(true);
                          playYouTubeId(hit.vid, hit.title, hit.author).then(() => {
                            setSearching(false);
                            setSearchText("");
                            setSearchResults([]);
                            setShowSearch(false);
                          });
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-custom bg-surface-2 hover:bg-surface-3 text-left transition-colors group"
                      >
                        <Play className="h-3 w-3 text-indigo-400 flex-shrink-0 group-hover:fill-indigo-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium text-primary truncate">
                            {hit.title}
                          </span>
                          {hit.author && (
                            <span className="block text-[10px] text-muted truncate">
                              {hit.author}
                            </span>
                          )}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Track presets */}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {presetTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-colors ${
                  currentTrack.id === track.id
                    ? "bg-indigo-500/10 border-indigo-500/40 text-primary"
                    : "bg-surface-2 hover:bg-surface-3 border-custom text-secondary"
                }`}
              >
                <span className="text-sm">{track.artist === "Lo-Fi Beats" ? "🎧" : track.artist === "Nature Sounds" ? "🌧️" : track.artist === "Chill Jazz" ? "🎷" : "🎹"}</span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium truncate">{track.title}</span>
                  <span className="block text-[10px] text-muted truncate">{track.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setPomodoroMode("focus");
              setTimeLeft(FOCUS_DURATION);
              setIsRunning(false);
              handleSelectTrack(presetTracks[0]);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-secondary">25m Focus</span>
          </button>
          <button
            onClick={() => {
              setPomodoroMode("short_break");
              setTimeLeft(SHORT_BREAK);
              setIsRunning(false);
              handleSelectTrack(presetTracks[1]);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <Coffee className="h-4 w-4 text-sky-500" />
            <span className="text-xs text-secondary">5m Break</span>
          </button>
        </div>
      </div>
    </div>
  );
}