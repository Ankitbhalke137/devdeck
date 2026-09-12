"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  Radio,
  Brain,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutGrid, label: "Custom drag-and-drop grid layouts" },
  { icon: ShieldCheck, label: "Tasks, links & settings that persist" },
  { icon: Radio, label: "Live team chat & voice huddles" },
  { icon: Brain, label: "Multi-model AI assistant" },
];

export function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // null = still checking, true = real Google provider configured, false = not configured.
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const providers = (await res.json()) as Record<string, { type?: string }>;
        if (!cancelled) {
          setGoogleAvailable(
            !!providers.google &&
              (providers.google.type === "oauth" || providers.google.type === "oidc")
          );
        }
      } catch {
        if (!cancelled) setGoogleAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setAuthError(
        "Google sign-in failed. Check that your Google OAuth client is valid and that the redirect URI is registered in Google Cloud Console."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isCheckingGoogle = googleAvailable === null;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#09090b] text-[#f4f4f5]">
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              DevDeck
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                OS v1.0
              </span>
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-2">
              Your all-in-one developer command center
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-6">
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 mb-5">
              <p className="text-xs text-[#d4d4d8] font-medium mb-3">
                Sign in to open your workspace:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#a1a1aa]">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <span key={f.label} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <Icon className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                      {f.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {authError && (
              <div className="mb-4 flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading || isCheckingGoogle || googleAvailable === false}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-sm rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCheckingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
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
              )}
              {isCheckingGoogle
                ? "Checking sign-in options…"
                : "Continue with Google"}
            </button>

            {googleAvailable === false && (
              <p className="mt-3 text-[10px] text-center text-[#71717a] leading-snug px-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  Google login is not configured. Add{" "}
                  <code className="font-mono text-[#a1a1aa]">AUTH_GOOGLE_ID</code> and{" "}
                  <code className="font-mono text-[#a1a1aa]">AUTH_GOOGLE_SECRET</code> to{" "}
                  <code className="font-mono text-[#a1a1aa]">.env.local</code> (plus the
                  redirect URI in Google Cloud Console) to enable sign-in.
                </span>
              </p>
            )}
          </div>

          <p className="mt-5 text-center text-[11px] text-[#71717a] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Secured with HTTP-only session tokens. OAuth 2.0 compliant.
          </p>
        </div>
      </div>
    </div>
  );
}