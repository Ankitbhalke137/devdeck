"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, PhoneOff, Users, Radio, Sparkles, Volume2, ShieldCheck, Share2 } from "lucide-react";
import { chatStore, VoiceParticipant } from "@/lib/chatStore";
import { useSession } from "next-auth/react";

interface VoiceHuddleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceHuddleModal({ isOpen, onClose }: VoiceHuddleModalProps) {
  const { data: session } = useSession();
  const [participants, setParticipants] = useState<VoiceParticipant[]>(chatStore.getVoiceMembers());
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 18, 30, 22, 14, 28, 16]);

  const currentUserId = session?.user?.id || session?.user?.email || "current-user";
  const currentUserName = session?.user?.name || "You (Developer)";
  const currentUserAvatar = session?.user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  useEffect(() => {
    return chatStore.subscribe(() => {
      setParticipants(chatStore.getVoiceMembers());
    });
  }, []);

  // Voice animation wave effect when speaking
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setWaveHeights((prev) =>
        prev.map(() => Math.floor(Math.random() * 24) + 8)
      );
    }, 150);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
    chatStore.toggleMute(currentUserId);
  };

  const handleLeaveHuddle = () => {
    chatStore.leaveVoice(currentUserId);
    onClose();
  };

  const handleJoin = () => {
    chatStore.joinVoice({
      id: currentUserId,
      name: currentUserName,
      avatar: currentUserAvatar,
    });
  };

  const isInVoice = participants.some((p) => p.id === currentUserId);

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
                  Live WebRTC
                </span>
              </h3>
              <p className="text-xs text-[#71717a]">Low-latency spatial audio channel</p>
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
          {/* Animated soundwaves */}
          <div className="h-16 flex items-center justify-center gap-1.5 px-6 mb-4">
            {waveHeights.map((h, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isMuted ? "bg-[#3f3f46] h-2" : "bg-gradient-to-t from-emerald-500 to-indigo-500"
                }`}
                style={{ height: isMuted ? "6px" : `${h}px` }}
              />
            ))}
          </div>

          {/* Participant Avatars in Huddle */}
          <div className="grid grid-cols-3 gap-4 w-full mt-2">
            {participants.map((member) => (
              <div
                key={member.id}
                className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
                  member.isSpeaking
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
                  {member.isSpeaking && (
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
                </span>
                <span className="text-[10px] text-[#71717a]">{member.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-[#18181b] border-t border-[#27272a]">
          {!isInVoice ? (
            <button
              onClick={handleJoin}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Mic className="w-4 h-4" />
              Join Voice Huddle as {currentUserName}
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
                  onClick={() => setIsScreenSharing((prev) => !prev)}
                  className={`p-3 rounded-xl border transition-all ${
                    isScreenSharing
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                      : "bg-[#27272a] text-[#a1a1aa] border-[#27272a] hover:bg-[#3f3f46] hover:text-[#f4f4f5]"
                  }`}
                  title="Share Screen"
                >
                  <Share2 className="w-5 h-5" />
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
