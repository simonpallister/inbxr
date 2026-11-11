"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  ArrowRight,
  Zap,
  Eye,
  Layers,
  Code2,
  Globe,
  ShieldCheck,
  KeyRound,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { getMailboxPath } from "@/lib/mailbox-url";

interface LoginScreenProps {
  domain: string;
  staffEmail: string | null;
  pendingMailbox?: string | null;
  onAuthenticated: (staffEmail: string) => void;
  onStaffSignOut: () => void;
  onLogin: (username: string) => void;
}

export function LoginScreen({
  domain,
  staffEmail,
  pendingMailbox = null,
  onAuthenticated,
  onStaffSignOut,
  onLogin,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  // Staff authentication state
  const [staffInput, setStaffInput] = useState("");
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [targetStaffEmail, setTargetStaffEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) {
      setAuthError(err);
      params.delete("auth_error");
      const nextSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (nextSearch ? `?${nextSearch}` : "")
      );
    }
  }, []);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedLocal = staffInput
      .trim()
      .toLowerCase()
      .split("@")[0]
      .replace(/[^a-z0-9._+-]/g, "");

    if (!cleanedLocal) {
      setAuthError("Enter your @dotdigital.com username");
      return;
    }

    const fullEmail = `${cleanedLocal}@dotdigital.com`;
    setAuthBusy(true);
    setAuthError("");
    setDevCodeHint(null);

    try {
      const nextPath = pendingMailbox
        ? getMailboxPath(pendingMailbox)
        : typeof window !== "undefined"
          ? window.location.pathname
          : "/";

      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fullEmail, nextPath }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Could not send verification code.");
        return;
      }

      setTargetStaffEmail(data.email || fullEmail);
      setAuthStep("code");
      setOtpCode("");
      if (data.devCode) {
        setDevCodeHint(String(data.devCode));
      }
    } catch {
      setAuthError("Network error while requesting verification code.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setAuthError("Enter the 6-digit code from your email");
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetStaffEmail,
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setAuthError(data.error || "Invalid verification code.");
        return;
      }

      onAuthenticated(data.email || targetStaffEmail);
    } catch {
      setAuthError("Network error while verifying code.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSubmitMailbox = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = username
      .trim()
      .toLowerCase()
      .split("@")[0]
      .replace(/[^a-z0-9._+-]/g, "");

    if (!cleaned) {
      setError("Enter a mailbox name (e.g. jane.smith123)");
      return;
    }
    setError("");
    onLogin(cleaned);
  };

  const features = [
    {
      icon: <Zap className="w-4 h-4 text-[#0b57d0]" />,
      title: "Instant Catch-All & +Tag Routing",
      description:
        "Send email to any username on the fly—no account creation needed. Sub-addressed emails (like jane+vip) route automatically with a tag badge.",
    },
    {
      icon: <Eye className="w-4 h-4 text-[#0b57d0]" />,
      title: "Authentic Open-Pixel & HTML Rendering",
      description:
        "Messages stream in live and render inside an isolated viewport only when opened, so 1×1 tracking pixels fire at the exact moment you click.",
    },
    {
      icon: <Code2 className="w-4 h-4 text-[#0b57d0]" />,
      title: "Built-In Martech Inspector",
      description:
        "Preview desktop and 375px mobile layouts, test List-Unsubscribe headers, and inspect extracted CTA links, decoded UTM parameters, and raw MIME.",
    },
    {
      icon: <Layers className="w-4 h-4 text-[#0b57d0]" />,
      title: "Multi-Tab Persona URLs",
      description:
        "Link directly to any inbox by adding the username to the URL so you can showcase multiple customer personas side-by-side in separate tabs.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#f0f4f9] flex flex-col justify-center items-center p-6 md:p-10 select-text overflow-y-auto">
      <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center my-auto">
        {/* Left column: What inbxr does & why */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2.5 select-none">
            <div className="w-10 h-10 rounded-xl bg-[#0b57d0] flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-[#1f1f1f] tracking-tight">
              inbxr
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1f1f1f] leading-tight tracking-tight">
              Zero-setup webmail for live email &amp; Martech demos.
            </h1>
            <p className="text-[15px] text-[#444746] leading-relaxed">
              Demonstrating email journeys, campaign triggers, and transactional
              flows with real inboxes is slow and cluttered.{" "}
              <strong className="font-medium text-[#1f1f1f]">inbxr</strong>{" "}
              provides a clean, Gmail-style inbox for any address the moment an
              email is sent—with no mailbox setup required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {features.map((item) => (
              <div
                key={item.title}
                className="bg-white/80 rounded-2xl p-4 border border-[#e1e5ea] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] flex items-center justify-center mb-2.5">
                  {item.icon}
                </div>
                <h2 className="text-sm font-semibold text-[#1f1f1f] mb-1">
                  {item.title}
                </h2>
                <p className="text-xs text-[#444746] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Staff Auth Card OR Open an Inbox Card */}
        <div className="lg:col-span-5">
          {!staffEmail ? (
            <div className="bg-white rounded-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#e1e5ea] p-7 sm:p-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#0b57d0] text-[11px] font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dotdigital Staff Access</span>
              </div>

              <h2 className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
                {authStep === "email"
                  ? "Verify your Dotdigital email"
                  : "Enter your verification code"}
              </h2>
              <p className="text-xs text-[#444746] mt-1 mb-6 leading-relaxed">
                {authStep === "email" ? (
                  <>
                    Sign in once with your{" "}
                    <span className="font-mono font-medium text-[#1f1f1f]">
                      @dotdigital.com
                    </span>{" "}
                    address to unlock <strong>inbxr</strong> on this browser for
                    90 days.
                    {pendingMailbox && (
                      <span className="block mt-1.5 text-[#0b57d0] font-medium">
                        After verifying, you&apos;ll go straight to{" "}
                        <code className="font-mono">
                          {pendingMailbox === "__all__"
                            ? "/all"
                            : `/${pendingMailbox}`}
                        </code>
                        .
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    We sent a 6-digit code and 1-click sign-in link to{" "}
                    <strong className="text-[#1f1f1f] font-medium">
                      {targetStaffEmail}
                    </strong>
                    .
                  </>
                )}
              </p>

              {authStep === "email" ? (
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="staff-email-input"
                      className="block text-xs font-medium text-[#444746] mb-2"
                    >
                      Work email address
                    </label>
                    <div
                      className={`flex items-center rounded-xl border ${
                        authError
                          ? "border-[#b3261e] ring-1 ring-[#b3261e]"
                          : "border-[#747775] focus-within:border-[#0b57d0] focus-within:ring-1 focus-within:ring-[#0b57d0]"
                      } bg-white overflow-hidden transition-all`}
                    >
                      <input
                        id="staff-email-input"
                        type="text"
                        autoFocus
                        value={staffInput}
                        onChange={(e) => {
                          setStaffInput(e.target.value);
                          if (authError) setAuthError("");
                        }}
                        placeholder="first.last"
                        className="w-full px-4 py-3 text-[15px] text-[#1f1f1f] placeholder-[#8e918f] focus:outline-none bg-transparent"
                      />
                      <span className="pr-3.5 pl-2.5 py-3 text-xs text-[#444746] bg-[#f8fafd] border-l border-[#e1e5ea] font-mono whitespace-nowrap select-none">
                        @dotdigital.com
                      </span>
                    </div>
                    {authError && (
                      <p className="mt-1.5 text-xs text-[#b3261e]">
                        {authError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-60 text-white font-medium text-sm px-6 py-3 rounded-full transition-colors cursor-pointer shadow-xs"
                  >
                    <span>
                      {authBusy ? "Sending code..." : "Send Verification Code"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="otp-code-input"
                      className="block text-xs font-medium text-[#444746] mb-2"
                    >
                      6-digit verification code
                    </label>
                    <div
                      className={`flex items-center rounded-xl border ${
                        authError
                          ? "border-[#b3261e] ring-1 ring-[#b3261e]"
                          : "border-[#747775] focus-within:border-[#0b57d0] focus-within:ring-1 focus-within:ring-[#0b57d0]"
                      } bg-white overflow-hidden transition-all`}
                    >
                      <KeyRound className="w-4 h-4 text-[#5f6368] ml-3.5 shrink-0" />
                      <input
                        id="otp-code-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ""));
                          if (authError) setAuthError("");
                        }}
                        placeholder="123456"
                        className="w-full px-3.5 py-3 text-lg font-mono tracking-[0.3em] text-[#1f1f1f] placeholder-[#8e918f] focus:outline-none bg-transparent"
                      />
                    </div>
                    {authError && (
                      <p className="mt-1.5 text-xs text-[#b3261e]">
                        {authError}
                      </p>
                    )}
                    {devCodeHint && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <strong>Dev Mode OTP:</strong>{" "}
                        <code className="font-mono font-bold">
                          {devCodeHint}
                        </code>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-60 text-white font-medium text-sm px-6 py-3 rounded-full transition-colors cursor-pointer shadow-xs"
                  >
                    <span>
                      {authBusy ? "Verifying..." : "Verify & Unlock for 90 Days"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep("email");
                        setAuthError("");
                        setOtpCode("");
                      }}
                      className="inline-flex items-center gap-1 text-[#5f6368] hover:text-[#1f1f1f] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Use a different email</span>
                    </button>

                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={handleRequestCode}
                      className="text-[#0b57d0] hover:underline font-medium cursor-pointer"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#e1e5ea] p-7 sm:p-8">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium truncate">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{staffEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={onStaffSignOut}
                  title="Sign out of Dotdigital staff session"
                  className="inline-flex items-center gap-1 text-[11px] text-[#5f6368] hover:text-[#b3261e] transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Lock</span>
                </button>
              </div>

              <h2 className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
                Open an inbox
              </h2>
              <p className="text-xs text-[#444746] mt-1 mb-6 leading-relaxed">
                Enter any persona username to open its live inbox immediately.
              </p>

              <form onSubmit={handleSubmitMailbox} className="space-y-4">
                <div>
                  <label
                    htmlFor="mailbox-input"
                    className="block text-xs font-medium text-[#444746] mb-2"
                  >
                    Mailbox address
                  </label>
                  <div
                    className={`flex items-center rounded-xl border ${
                      error
                        ? "border-[#b3261e] ring-1 ring-[#b3261e]"
                        : "border-[#747775] focus-within:border-[#0b57d0] focus-within:ring-1 focus-within:ring-[#0b57d0]"
                    } bg-white overflow-hidden transition-all`}
                  >
                    <input
                      id="mailbox-input"
                      type="text"
                      autoFocus
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="jane.smith123"
                      className="w-full px-4 py-3 text-[15px] text-[#1f1f1f] placeholder-[#8e918f] focus:outline-none bg-transparent"
                    />
                    <span className="pr-3.5 pl-2.5 py-3 text-xs text-[#444746] bg-[#f8fafd] border-l border-[#e1e5ea] font-mono whitespace-nowrap select-none">
                      @{domain}
                    </span>
                  </div>
                  {error ? (
                    <p className="mt-1.5 text-xs text-[#b3261e]">{error}</p>
                  ) : (
                    <p className="mt-2 text-[11px] text-[#5f6368]">
                      You can also open any inbox directly via{" "}
                      <code className="text-[#0b57d0] font-mono">
                        /{username.trim() || "username"}
                      </code>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm px-6 py-3 rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  <span>Open Inbox</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#e1e5ea]">
                <a
                  href={getMailboxPath("__all__")}
                  onClick={(e) => {
                    if (
                      !e.metaKey &&
                      !e.ctrlKey &&
                      !e.shiftKey &&
                      e.button === 0
                    ) {
                      e.preventDefault();
                      onLogin("__all__");
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#d3e3fd] bg-[#f8fafd] hover:bg-[#e8f0fe] text-xs text-[#0b57d0] font-medium transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>View All Domain Mailboxes (/all)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
