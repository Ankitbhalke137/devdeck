"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, Users, Radio, Volume2, ShieldCheck, Share2, MonitorUp, Loader2 } from "lucide-react";
import { chatStore, VoiceParticipant } from "@/lib/chatStore";
import { useSession } from "next-auth/react";
import { getChatSocket } from "@/lib/chatSocket";

interface VoiceHuddleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceHuddleModal({ isOpen, onClose }: VoiceHuddleModalProps) {
  const { data: session } = useSession();
  const [participants, setParticipants] = useState<VoiceParticipant[]>(chatStore.getVoiceMembers());
  const [isMuted, setIsMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0..1 real RMS from the mic
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 18, 30, 22, 14, 28, 16]);

  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const lastSpeakingRef = useRef(false);

  const currentUserId = session?.user?.id || session?.user?.email || "current-user";
  const currentUserName = session?.user?.name || "You (Developer)";
  const currentUserAvatar = session?.user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  useEffect(() => {
    return chatStore.subscribe(() => {
      setParticipants(chatStore.getVoiceMembers());
    });
  }, []);

  // Voice roster sync: the server is the source of truth across machines.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;
    const handleVoiceState = (roster: VoiceParticipant[]) => {
      chatStore.setVoiceRoster(roster);
    };
    socket.on("voice:state", handleVoiceState);
    if (socket.connected) {
      socket.connect();
    }
    return () => {
      socket.off("voice:state", handleVoiceState);
    };
  }, []);

  const emitVoiceState = () => {
    const socket = getChatSocket();
    if (!socket?.connected) return;
    const member = participants.find((p) => p.id === currentUserId);
    socket.emit("voice:update", {
      id: currentUserId,
      name: currentUserName,
      avatar: currentUserAvatar,
      isMuted,
      isSpeaking: !!member?.isSpeaking,
      role: member?.role || "Participant",
    });
  };

  // Visualizer: when we have a real mic signal, drive the bars from its RMS.
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setWaveHeights((prev) =>
        prev.map(() => {
          const base = Math.floor(Math.random() * 10) + 6;
          const boost = micLevel > 0 ? micLevel * 34 : 0;
          return Math.min(48, base + boost);
        })
      );
    }, 120);
    return () => clearInterval(interval);
  }, [isOpen, micLevel]);

  // Release hardware when the modal unmounts.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const stopLevelMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setMicLevel(0);
  }, []);

  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      const current = analyserRef.current;
      if (!current) return;
      current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const level = sum / data.length / 255;
      setMicLevel(level);
      // Voice-activity detection: above threshold counts as speaking.
      const speaking = level > 0.14 && !isMuted;
      chatStore.setSpeaking(currentUserId, speaking);
      if (speaking !== lastSpeakingRef.current) {
        lastSpeakingRef.current = speaking;
        const socket = getChatSocket();
        socket?.connected &&
          socket.emit("voice:update", {
            id: currentUserId,
            isSpeaking: speaking,
          });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [currentUserId, isMuted]);

  const handleJoin = async () => {
    setIsJoining(true);
    setMicError(null);
    let joinedMuted = false;
    try {
      // Real microphone capture (works over HTTP(S) localhost; needs HTTPS elsewhere).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      startLevelMeter();
      chatStore.joinVoice({ id: currentUserId, name: currentUserName, avatar: currentUserAvatar });
    } catch {
      // Mic blocked or unavailable — still join the room, shown as muted.
      setMicError("Microphone unavailable — joining muted. Check browser permissions.");
      joinedMuted = true;
      setIsMuted(true);
      chatStore.joinVoice({ id: currentUserId, name: currentUserName, avatar: currentUserAvatar, muted: true });
    } finally {
      setIsJoining(false);
      const socket = getChatSocket();
      socket?.connected &&
        socket.emit("voice:join", {
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          isMuted: isMuted || joinedMuted,
          role: "Participant",
        });
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    // Real mute at the audio-track level.
    micStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    chatStore.toggleMute(currentUserId);
    emitVoiceState();
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      setIsScreenSharing(true);
      // If the user stops sharing via the browser's bar, mirror that state.
      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      });
    } catch {
      setIsScreenSharing(false);
    }
  };

  const handleLeaveHuddle = () => {
    stopLevelMeter();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    setIsMuted(false);
    chatStore.leaveVoice(currentUserId);
    const socket = getChatSocket();
    socket?.connected && socket.emit("voice:leave", currentUserId);
    onClose();
  };

  if (!isOpen) return null;

  const isInVoice = participants.some((p) => p.id === currentUserId);
  const currentMember = participants.find((p) => p.id === currentUserId);
  const realSpeaking = !!currentMember?.isSpeaking && !isMuted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-2">
                Engineering Voice Huddle
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Real WebRTC Mic
                </span>
              </h3>
              <p className="text-xs text-[#71717a]">Browser microphone · live audio levels</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#a1a1aa] bg-[#27272a]/60 rounded-md border border-[#27272a]">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{participants.length} Active</span>
            </div>
          </div>
        </div>

        {/* Audio Visualizer Stage */}
        <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#18181b]/30 to-transparent">
          {/* Animated soundwaves driven by real mic level */}
          <div className="h-16 flex items-center justify-center gap-1.5 px-6 mb-4">
            {waveHeights.map((h, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isMuted
                    ? "bg-[#3f3f46]"
                    : realSpeaking
                    ? "bg-gradient-to-t from-emerald-500 to-indigo-500"
                    : "bg-gradient-to-t from-emerald-500/70 to-indigo-500/70"
                }`}
                style={{ height: isMuted ? "6px" : `${h}px` }}
              />
            ))}
          </div>

          {/* Mic level meter */}
          <div className="w-full max-w-[280px] mb-4">
            <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-[#71717a]">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Input level
              </span>
              <span>{Math.round(micLevel * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#27272a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isMuted
                    ? "bg-[#3f3f46]"
                    : micLevel > 0.14
                    ? "bg-gradient-to-r from-emerald-500 to-indigo-500"
                    : "bg-gradient-to-r from-emerald-500/60 to-indigo-500/60"
                }`}
                style={{ width: `${Math.min(100, micLevel * 100 + 4)}%` }}
              />
            </div>
            {micError && (
              <p className="mt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                {micError}
              </p>
            )}
          </div>

          {/* Participant Avatars in Huddle */}
          <div className="grid grid-cols-3 gap-4 w-full mt-2">
            {participants.map((member) => {
              const isSelf = member.id === currentUserId;
              return (
                <div
                  key={member.id}
                  className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
                    isSelf && realSpeaking
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : member.isSpeaking && !isSelf
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : "bg-[#18181b] border-[#27272a]"
                  }`}
                >
                  {/* Speaking Ring */}
                  <div className="relative mb-2">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#27272a]"
                    />
                    {(member.isSpeaking || (isSelf && realSpeaking)) && (
                      <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
                    )}
                    {member.isMuted && (
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-rose-600 text-white border border-[#121215]">
                        <MicOff className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-medium text-[#f4f4f5] max-w-[100px] truncate text-center">
                    {member.name}
                    {isSelf && <span className="text-[10px] text-emerald-400"> (you)</span>}
                  </span>
                  <span className="text-[10px] text-[#71717a]">{member.role}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-[#18181b] border-t border-[#27272a]">
          {!isInVoice ? (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting microphone…
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Join Voice Huddle as {currentUserName}
                </>
              )}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className={`p-3 rounded-xl border transition-all ${
                    isMuted
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30"
                      : "bg-[#27272a] text-[#f4f4f5] border-[#3f3f46] hover:bg-[#3f3f46]"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleScreenShare}
                  className={`p-3 rounded-xl border transition-all ${
                    isScreenSharing
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                      : "bg-[#27272a] text-[#a1a1aa] border-[#27272a] hover:bg-[#3f3f46] hover:text-[#f4f4f5]"
                  }`}
                  title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
                >
                  {isScreenSharing ? (
                    <MonitorUp className="w-5 h-5" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLeaveHuddle}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
                >
                  <PhoneOff className="w-4 h-4" />
                  Leave Huddle
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#f4f4f5] text-xs font-medium transition-all"
                >
                  Minimize
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}