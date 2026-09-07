"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, ShieldCheck, Sparkles, Terminal, Cpu, LayoutGrid, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [demoName, setDemoName] = useState("Alex Developer");

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // First attempt genuine Google OAuth if configured, or fall back to demo account
      await signIn("google", { callbackUrl: "/" });
    } catch {
      await signIn("google-demo", {
        callbackUrl: "/",
        name: demoName,
        email: "alex.dev@googlemail.com",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoSignIn = async (name: string, email: string) => {
    setIsLoading(true);
    try {
      await signIn("google-demo", {
        callbackUrl: "/",
        name,
        email,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient effect */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#f4f4f5] flex items-center gap-2">
              DevDeck
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                OS v1.0
              </span>
            </h2>
            <p className="text-xs text-[#a1a1aa]">Your All-in-One Developer Command Center</p>
          </div>
        </div>

        {/* Value Prop */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3.5 mb-5 space-y-2">
          <p className="text-xs text-[#d4d4d8] font-medium">Sign in to sync your developer state:</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#a1a1aa]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Custom Grid Layouts
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Persistent Tasks & PRs
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Live Team Audio Huddles
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-Model AI Sessions
            </span>
          </div>
        </div>

        {/* Primary OAuth Button */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-sm rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {/* Google G Logo SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Quick Demo Profiles (for instant test without Google cloud setup) */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#27272a]" />
            <span className="flex-shrink mx-2 text-[11px] text-[#71717a] uppercase tracking-wider font-mono">
              Quick Instant Login (Demo)
            </span>
            <div className="flex-grow border-t border-[#27272a]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoSignIn("Alex (Senior Fullstack)", "alex.dev@googlemail.com")}
              className="px-3 py-2 text-xs bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-lg text-left transition-colors flex flex-col gap-0.5"
            >
              <span className="text-[#f4f4f5] font-medium truncate">Alex Developer</span>
              <span className="text-[10px] text-emerald-400">🟢 Ready to Code</span>
            </button>
            <button
              onClick={() => handleQuickDemoSignIn("Sarah (DevOps Lead)", "sarah.infra@googlemail.com")}
              className="px-3 py-2 text-xs bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-lg text-left transition-colors flex flex-col gap-0.5"
            >
              <span className="text-[#f4f4f5] font-medium truncate">Sarah Infrastructure</span>
              <span className="text-[10px] text-sky-400">⚡ In Voice Huddle</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-[11px] text-[#71717a]">
          Secured with HTTP-only session tokens. OAuth 2.0 compliant.
        </p>
      </div>
    </div>
  );
}
