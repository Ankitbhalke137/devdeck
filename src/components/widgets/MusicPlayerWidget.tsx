"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music4,
  Loader2,
  Search,
  X,
  ExternalLink,
  Users,
  ListMusic,
  Link as LinkIcon,
} from "lucide-react";
import { chatStore } from "@/lib/chatStore";
import { getChatSocket, joinChatRoom } from "@/lib/chatSocket";

interface Track {
  id: string;
  title: string;
  artist: string;
  videoId: string;
}

interface PlaylistState {
  url: string;
  tracks: Track[];
}

interface RoomMusic {
  videoId: string;
  title: string;
  artist: string;
  isPlaying: boolean;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  loadPlaylist(playlist: { list: string; index?: number }): void;
  nextVideo(): void;
  previousVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  getPlaylist(): string[];
  getPlaylistIndex(): number;
}

interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

interface YTPlayerConstructor {
  new (
    elementId: string,
    options: {
      videoId?: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: (e: YTPlayerEvent) => void;
        onStateChange: (e: YTPlayerEvent) => void;
        onError: (e: YTPlayerEvent) => void;
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

const YT_URL_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const PLAYLIST_RE = /[?&]list=([A-Za-z0-9_-]+)/;
const BARE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function formatSeconds(s: number): string {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(YT_URL_RE);
  if (urlMatch?.[1]) return urlMatch[1];
  if (BARE_ID_RE.test(trimmed) && !trimmed.includes(" ")) return trimmed;
  return null;
}

function extractPlaylistId(input: string): string | null {
  const match = input.match(PLAYLIST_RE);
  return match ? match[1] : null;
}

interface YTOEmbed {
  title?: string;
  author_name?: string;
}

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

function loadSavedPlaylist(): PlaylistState {
  try {
    const saved = localStorage.getItem("devdeck.playlist.v1");
    if (saved) {
      const parsed = JSON.parse(saved) as PlaylistState;
      if (parsed.tracks && parsed.tracks.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return { url: "", tracks: [] };
}

function savePlaylist(playlist: PlaylistState) {
  localStorage.setItem("devdeck.playlist.v1", JSON.stringify(playlist));
}

export function MusicPlayerWidget() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [playerReady, setPlayerReady] = useState(false);
  const [trackError, setTrackError] = useState(false);
  const [trackErrorMessage, setTrackErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const seekRef = useRef<HTMLDivElement | null>(null);

  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlist, setPlaylist] = useState<PlaylistState>(() => loadSavedPlaylist());
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const [recommendations, setRecommendations] = useState<SearchHit[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const lastRecQueryRef = useRef("");

  const playerRef = useRef<YTPlayer | null>(null);
  const trackRef = useRef<Track | null>(null);
  const volumeRef = useRef(70);
  const pendingVideoRef = useRef<string | null>(null);

  const roomIdRef = useRef(chatStore.getCurrentRoom());
  const lastBroadcastRef = useRef("");
  const lastAppliedRef = useRef("");
  const [roomMusic, setRoomMusic] = useState<RoomMusic | null>(null);

  const fetchRecommendations = useCallback(async (track: Track) => {
    if (!track.videoId || track.videoId === lastRecQueryRef.current) return;
    lastRecQueryRef.current = track.videoId;
    setLoadingRecs(true);
    try {
      const res = await fetch(`/api/youtube/related?videoId=${track.videoId}`);
      const data = (await res.json()) as { results?: SearchHit[]; error?: string };
      if (data.results) {
        setRecommendations(data.results.filter((r) => r.vid !== track.videoId).slice(0, 8));
      }
    } catch {
      // silent
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    const initPlayer = () => {
      const YT = (window as YTWindow).YT;
      if (!YT?.Player || playerRef.current) return;

      const savedPlaylist = loadSavedPlaylist();
      const startVideoId = savedPlaylist.tracks.length > 0
        ? savedPlaylist.tracks[0].videoId
        : "jfKfPfyJRdk";

      playerRef.current = new YT.Player("music-youtube-player", {
        videoId: startVideoId,
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
            const videoId = pendingVideoRef.current || startVideoId;
            if (videoId !== startVideoId) {
              e.target.cueVideoById(videoId);
              pendingVideoRef.current = null;
            }
            e.target.setVolume(volumeRef.current);
            e.target.unMute();
            setPlayerReady(true);
            if (savedPlaylist.tracks.length > 0) {
              setCurrentTrack(savedPlaylist.tracks[0]);
              trackRef.current = savedPlaylist.tracks[0];
            }
          },
          onStateChange: (e: YTPlayerEvent) => {
            if (e.data === 1) {
              setIsPlaying(true);
              setTrackError(false);
              setTrackErrorMessage(null);
              e.target.unMute();
              e.target.setVolume(volumeRef.current);

              const idx = e.target.getPlaylistIndex();
              const saved = loadSavedPlaylist();
              if (idx >= 0 && idx < saved.tracks.length) {
                const track = saved.tracks[idx];
                setCurrentTrack(track);
                trackRef.current = track;
                fetchRecommendations(track);
              }
            } else if (e.data === 2 || e.data === 0) {
              setIsPlaying(false);
            }
          },
          onError: (e: YTPlayerEvent) => {
            setTrackError(true);
            setTrackErrorMessage(
              e.data === 101 || e.data === 150 || e.data === 100
                ? "This video can't be embedded or is unavailable."
                : "This track could not load."
            );
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
  }, []);

  const applyRoomMusic = (music: RoomMusic | null) => {
    if (!music?.videoId) return;
    const key = `${music.videoId}|${music.isPlaying}`;
    if (key === lastBroadcastRef.current || key === lastAppliedRef.current) return;
    lastAppliedRef.current = key;
    setRoomMusic(music);

    const track: Track = {
      id: "room-" + music.videoId,
      title: music.title || "Shared track",
      artist: music.artist || "Room",
      videoId: music.videoId,
    };
    const player = playerRef.current;
    const sameTrack = trackRef.current?.videoId === music.videoId;

    if (!player || !playerReady) {
      pendingVideoRef.current = music.videoId;
      setCurrentTrack(track);
      trackRef.current = track;
      return;
    }

    if (!sameTrack) {
      player.mute();
      player.loadVideoById(music.videoId);
      setCurrentTrack(track);
      trackRef.current = track;
      setTrackError(false);
      setTrackErrorMessage(null);
    }
    if (music.isPlaying) {
      player.playVideo();
      player.unMute();
      player.setVolume(volumeRef.current);
    } else {
      player.pauseVideo();
    }
  };

  const broadcastMusic = (videoId: string, title: string, artist: string, isPlaying: boolean) => {
    lastBroadcastRef.current = `${videoId}|${isPlaying}`;
    const socket = getChatSocket();
    const roomId = chatStore.getCurrentRoom();
    if (socket?.connected) {
      socket.emit("music:update", { roomId, music: { videoId, title, artist, isPlaying } });
    }
  };

  useEffect(() => {
    return chatStore.subscribe(() => {
      roomIdRef.current = chatStore.getCurrentRoom();
      joinChatRoom(roomIdRef.current);
    });
  }, []);

  useEffect(() => {
    joinChatRoom(roomIdRef.current);
  }, []);

  useEffect(() => {
    if (!playerReady) return;
    const tick = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (!seeking) setCurrentTime(Math.floor(p.getCurrentTime()));
        setDuration(Math.floor(p.getDuration()));
      } catch {}
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [playerReady, seeking]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;
    const handleMusicState = (payload: { roomId: string; music: RoomMusic | null }) => {
      if (payload.roomId !== roomIdRef.current) return;
      applyRoomMusic(payload.music);
    };
    socket.on("chat:music-state", handleMusicState);
    return () => {
      socket.off("chat:music-state", handleMusicState);
    };
  }, []);

  const handlePlayPause = () => {
    const player = playerRef.current;
    if (!player || !playerReady || !currentTrack) return;
    if (isPlaying) {
      player.pauseVideo();
      broadcastMusic(currentTrack.videoId, currentTrack.title, currentTrack.artist, false);
    } else {
      player.mute();
      player.playVideo();
      player.unMute();
      player.setVolume(volumeRef.current);
      broadcastMusic(currentTrack.videoId, currentTrack.title, currentTrack.artist, true);
    }
  };

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    trackRef.current = track;
    setTrackError(false);
    setTrackErrorMessage(null);
    const player = playerRef.current;
    if (player && playerReady) {
      player.mute();
      player.loadVideoById(track.videoId);
      player.playVideo();
      player.unMute();
      player.setVolume(volumeRef.current);
    } else {
      pendingVideoRef.current = track.videoId;
    }
    broadcastMusic(track.videoId, track.title, track.artist, true);
    fetchRecommendations(track);
  };

  const handleSkip = (direction: "prev" | "next") => {
    const player = playerRef.current;
    if (!player || !playerReady) return;

    if (direction === "next") {
      player.nextVideo();
    } else {
      player.previousVideo();
    }
  };

  const handleVolume = (value: number) => {
    setVolume(value);
    volumeRef.current = value;
    playerRef.current?.setVolume(value);
  };

  const playYouTubeId = async (videoId: string, fallbackTitle: string, fallbackAuthor: string) => {
    const track: Track = {
      id: "custom-" + videoId,
      title: fallbackTitle || "Custom track",
      artist: fallbackAuthor || "YouTube",
      videoId,
    };
    handleSelectTrack(track);

    setPlaylist((prev) => {
      const exists = prev.tracks.some((t) => t.videoId === videoId);
      if (exists) return prev;
      const updated = { url: prev.url, tracks: [...prev.tracks, track] };
      savePlaylist(updated);
      return updated;
    });

    const meta = await fetchOEmbed(videoId);
    if (meta.title || meta.author_name) {
      const title = meta.title || track.title;
      const artist = meta.author_name || track.artist;
      const enrichedTrack = { ...track, title, artist };
      setCurrentTrack((prev) => (prev?.id === track.id ? enrichedTrack : prev));
      if (trackRef.current?.id === track.id) {
        trackRef.current = enrichedTrack;
      }
      setPlaylist((prev) => {
        const updated = {
          url: prev.url,
          tracks: prev.tracks.map((t) => (t.videoId === videoId ? enrichedTrack : t)),
        };
        savePlaylist(updated);
        return updated;
      });
    }
  };

  const handleLoadPlaylist = async () => {
    const raw = playlistUrl.trim();
    if (!raw || loadingPlaylist) return;

    const playlistId = extractPlaylistId(raw);
    if (!playlistId) {
      setPlaylistError("Invalid YouTube playlist URL.");
      return;
    }

    setLoadingPlaylist(true);
    setPlaylistError(null);

    try {
      const key = getVaultYouTubeKey();
      const params = new URLSearchParams({ id: playlistId });
      if (key) params.set("key", key);

      const res = await fetch(`/api/youtube/playlist?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        setPlaylistError(data.error);
        setLoadingPlaylist(false);
        return;
      }

      if (data.tracks && data.tracks.length > 0) {
        const tracks: Track[] = data.tracks;
        const newPlaylist = { url: raw, tracks };
        setPlaylist(newPlaylist);
        savePlaylist(newPlaylist);

        const player = playerRef.current;
        if (player && playerReady) {
          player.mute();
          player.loadPlaylist({ list: playlistId });
          player.unMute();
          player.setVolume(volumeRef.current);
          setCurrentTrack(tracks[0]);
          trackRef.current = tracks[0];
        } else {
          pendingVideoRef.current = tracks[0].videoId;
          setCurrentTrack(tracks[0]);
          trackRef.current = tracks[0];
        }

        setShowPlaylistInput(false);
        setPlaylistUrl("");
      } else {
        setPlaylistError("No videos found in this playlist.");
      }
    } catch {
      setPlaylistError("Failed to load playlist.");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handleClearPlaylist = () => {
    setPlaylist({ url: "", tracks: [] });
    localStorage.removeItem("devdeck.playlist.v1");
    setCurrentTrack(null);
    trackRef.current = null;
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
        setSearchMsg("Search needs a YouTube Data API key.");
      } else {
        setSearchResults([]);
        setSearchMsg(data.error || "No results found.");
      }
    } catch {
      setSearchResults([]);
      setSearchMsg("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden="true">
        <div id="music-youtube-player" className="w-[320px] h-[180px]" />
      </div>

      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Music4 className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-primary">Music Player</span>
          {/* Animated Equalizer Spectrum */}
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-3 px-1.5 py-0.5">
              <span className="w-0.5 bg-indigo-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
              <span className="w-0.5 bg-indigo-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-2/3" />
              <span className="w-0.5 bg-indigo-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s] h-4/5" />
              <span className="w-0.5 bg-indigo-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.15s] h-1/2" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {roomMusic && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
              <Users className="w-2.5 h-2.5" /> shared
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Now Playing */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Now Playing</span>
            {!playerReady && (
              <span className="text-[10px] text-muted flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-surface-3 rounded flex items-center justify-center">
              <Headphones className="h-6 w-6 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary truncate">
                {currentTrack?.title || "No track selected"}
              </div>
              <div className="text-xs text-muted truncate">{currentTrack?.artist || "Add a playlist below"}</div>
            </div>
          </div>

          {trackError && (
            <p className="mt-2 text-[11px] text-rose-400">
              {trackErrorMessage || "Track could not load."}
            </p>
          )}

          {/* Progress / Seek Bar */}
          <div className="mt-3 space-y-1.5">
            <div
              ref={seekRef}
              className="relative h-1.5 bg-surface-3 rounded-full cursor-pointer group"
              onMouseDown={(e) => {
                if (!duration) return;
                setSeeking(true);
                const rect = seekRef.current!.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const newTime = Math.floor(pct * duration);
                setCurrentTime(newTime);
                playerRef.current?.seekTo(newTime, true);
              }}
              onMouseMove={(e) => {
                if (!seeking || !duration) return;
                const rect = seekRef.current!.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setCurrentTime(Math.floor(pct * duration));
              }}
              onMouseUp={() => {
                if (!duration) return;
                const pct = currentTime / duration;
                playerRef.current?.seekTo(currentTime, true);
                setSeeking(false);
              }}
              onMouseLeave={() => {
                if (seeking && duration) {
                  playerRef.current?.seekTo(currentTime, true);
                  setSeeking(false);
                }
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-none"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : "0%" }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span>{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => handleSkip("prev")}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
              title="Previous"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlayPause}
              disabled={!playerReady || !currentTrack}
              className={`p-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isPlaying ? "bg-rose-500 hover:bg-rose-600" : "bg-surface-3 hover:bg-surface-2"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-primary" />
              )}
            </button>
            <button
              onClick={() => handleSkip("next")}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
              title="Next"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Soundscape presets */}
          <div className="pt-2 border-t border-custom/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { name: "Lo-Fi Chill", id: "jfKfPfyJRdk", title: "Lofi Girl - beats to relax/study to", artist: "Lofi Girl" },
              { name: "Deep Focus Synth", id: "4xDzrJKXOOY", title: "Synthwave Radio - Chill synth / retro beats", artist: "Lofi Girl" },
              { name: "Brown Noise", id: "RqzGzwTY-6w", title: "Pure Brown Noise - Deep Focus", artist: "Deep Noise Studio" },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  playYouTubeId(preset.id, preset.title, preset.artist);
                }}
                className="shrink-0 text-[10px] font-medium px-2 py-1 rounded bg-surface-3 hover:bg-surface-1 text-secondary hover:text-primary border border-custom transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Playlist */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          {playlist.tracks.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <ListMusic className="h-3 w-3" /> {playlist.tracks.length} tracks
                </span>
                <button
                  onClick={handleClearPlaylist}
                  className="text-[10px] text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {playlist.tracks.slice(0, 15).map((track, i) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                      currentTrack?.id === track.id
                        ? "bg-indigo-500/10 text-primary"
                        : "text-secondary hover:bg-surface-3"
                    }`}
                  >
                    <span className="text-[10px] text-muted w-4">{i + 1}</span>
                    <span className="text-[11px] truncate">{track.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {!showPlaylistInput ? (
                <button
                  onClick={() => setShowPlaylistInput(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded border border-dashed border-custom bg-surface-2 hover:bg-surface-3 text-xs text-secondary transition-colors"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Add YouTube Playlist
                </button>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={playlistUrl}
                      onChange={(e) => setPlaylistUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLoadPlaylist();
                        if (e.key === "Escape") {
                          setShowPlaylistInput(false);
                          setPlaylistUrl("");
                          setPlaylistError(null);
                        }
                      }}
                      autoFocus
                      placeholder="Paste YouTube playlist URL…"
                      className="flex-1 min-w-0 bg-surface-1 border border-custom rounded px-2.5 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      onClick={handleLoadPlaylist}
                      disabled={loadingPlaylist || !playlistUrl.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white disabled:opacity-40 transition-colors"
                    >
                      {loadingPlaylist ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Music4 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowPlaylistInput(false);
                        setPlaylistUrl("");
                        setPlaylistError(null);
                      }}
                      className="p-2 text-muted hover:bg-surface-3 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted">
                    Paste a YouTube playlist URL
                  </p>
                  {playlistError && (
                    <p className="mt-1.5 text-[10px] text-rose-400">{playlistError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendations — only visible after a song is selected */}
        {currentTrack && (
          <div className="bg-surface-2 rounded-lg border border-custom p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Music4 className="h-3 w-3" /> Recommended for you
              </span>
              {loadingRecs && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
            </div>
            {recommendations.length > 0 ? (
              <div className="space-y-1">
                {recommendations.map((rec) => (
                  <button
                    key={rec.vid}
                    onClick={() => {
                      const track: Track = {
                        id: "rec-" + rec.vid,
                        title: rec.title,
                        artist: rec.author || "YouTube",
                        videoId: rec.vid,
                      };
                      handleSelectTrack(track);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-surface-3 transition-colors group"
                  >
                    <Play className="h-3 w-3 text-indigo-400 flex-shrink-0 group-hover:fill-indigo-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-primary truncate">{rec.title}</span>
                      {rec.author && <span className="block text-[10px] text-muted truncate">{rec.author}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ) : !loadingRecs ? (
              <p className="text-[10px] text-muted text-center py-2">No recommendations yet</p>
            ) : null}
          </div>
        )}

        {/* Search */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded border border-dashed border-custom bg-surface-2 hover:bg-surface-3 text-xs text-secondary transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Search or paste YouTube link
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
                  placeholder="Search or paste YouTube link…"
                  className="flex-1 min-w-0 bg-surface-1 border border-custom rounded px-2.5 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={handleFindMusic}
                  disabled={searching || !searchText.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white disabled:opacity-40 transition-colors"
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
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {searchMsg && (
                <p className="mt-2 text-[10px] text-amber-400/90">{searchMsg}</p>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
      </div>
    </div>
  );
}
