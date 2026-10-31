"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, Globe, User } from "lucide-react";
import type { MailboxSummary } from "@/lib/db";
import { getMailboxPath } from "@/lib/mailbox-url";

interface LoginScreenProps {
  domain: string;
  recentMailboxes: MailboxSummary[];
  allUnreadCount: number;
  onLogin: (username: string) => void;
}

export function LoginScreen({
  domain,
  recentMailboxes,
  allUnreadCount,
  onLogin,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen w-full bg-[#f0f4f9] flex flex-col justify-center items-center p-4 select-text">
      <div className="w-full max-w-[880px] bg-white rounded-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 md:p-11 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Left column: Google Workspace-style branding */}
        <div className="flex flex-col items-start">
          <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] flex items-center justify-center mb-6">
            <Mail className="w-6 h-6 text-[#0b57d0]" />
          </div>
          <h1 className="text-[32px] font-normal text-[#1f1f1f] leading-tight tracking-tight mb-3">
            Sign in
          </h1>
          <p className="text-[16px] text-[#444746] leading-relaxed">
            to continue to <span className="font-medium text-[#1f1f1f]">inbxr</span>
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8fafd] border border-[#e1e5ea] text-xs text-[#444746]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Domain: @{domain}</span>
          </div>
        </div>

        {/* Right column: Mailbox input + quick personas */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="mailbox-input"
                className="block text-xs font-medium text-[#444746] mb-2"
              >
                Mailbox name
              </label>
              <div
                className={`flex items-center rounded-lg border ${
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
                  className="w-full px-4 py-3.5 text-[16px] text-[#1f1f1f] placeholder-[#8e918f] focus:outline-none bg-transparent"
                />
                <span className="pr-4 pl-2 py-3.5 text-[15px] text-[#444746] bg-[#f8fafd] border-l border-[#e1e5ea] font-mono whitespace-nowrap select-none">
                  @{domain}
                </span>
              </div>
              {error ? (
                <p className="mt-1.5 text-xs text-[#b3261e]">{error}</p>
              ) : (
                <p className="mt-2 text-xs text-[#444746]">
                  Enter any persona name. Supports <code className="text-[#0b57d0]">+tag</code> sub-addressing automatically.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm px-6 py-2.5 rounded-full transition-colors cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Recent / Active Personas */}
          <div className="mt-8 pt-6 border-t border-[#e1e5ea]">
            <div className="text-xs font-medium text-[#444746] mb-3">
              Quick access mailboxes
            </div>
            <div className="flex flex-wrap gap-2">
              {recentMailboxes.slice(0, 6).map((m) => (
                <a
                  key={m.username}
                  href={getMailboxPath(m.username)}
                  onClick={(e) => {
                    if (
                      !e.metaKey &&
                      !e.ctrlKey &&
                      !e.shiftKey &&
                      e.button === 0
                    ) {
                      e.preventDefault();
                      onLogin(m.username);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c4c7c5] hover:bg-[#f0f4f9] hover:border-[#0b57d0] text-xs text-[#1f1f1f] transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#444746]" />
                  <span className="font-medium">{m.username}</span>
                  {m.unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#0b57d0] text-white text-[10px] font-semibold">
                      {m.unreadCount}
                    </span>
                  )}
                </a>
              ))}

              {recentMailboxes.length === 0 && (
                <a
                  href={getMailboxPath("jane.smith123")}
                  onClick={(e) => {
                    if (
                      !e.metaKey &&
                      !e.ctrlKey &&
                      !e.shiftKey &&
                      e.button === 0
                    ) {
                      e.preventDefault();
                      onLogin("jane.smith123");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c4c7c5] hover:bg-[#f0f4f9] text-xs text-[#1f1f1f] transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#444746]" />
                  <span>jane.smith123</span>
                </a>
              )}

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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#d3e3fd] bg-[#f8fafd] hover:bg-[#e8f0fe] text-xs text-[#0b57d0] font-medium transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>All Mailboxes (Catch-All)</span>
                {allUnreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#0b57d0] text-white text-[10px] font-semibold">
                    {allUnreadCount}
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between w-full max-w-[880px] px-2 text-xs text-[#444746]">
        <span>English (United States)</span>
        <div className="flex items-center gap-6">
          <span>Help</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  );
}
