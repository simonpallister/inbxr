"use client";

import React, { useState } from "react";
import {
  Mail,
  ArrowRight,
  Zap,
  Eye,
  Layers,
  Code2,
  Globe,
} from "lucide-react";
import { getMailboxPath } from "@/lib/mailbox-url";

interface LoginScreenProps {
  domain: string;
  onLogin: (username: string) => void;
}

export function LoginScreen({ domain, onLogin }: LoginScreenProps) {
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
              email is sent—with no passwords, sign-ups, or mailbox setup.
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

        {/* Right column: Open an Inbox card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#e1e5ea] p-7 sm:p-8">
            <h2 className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
              Open an inbox
            </h2>
            <p className="text-xs text-[#444746] mt-1 mb-6 leading-relaxed">
              Enter any persona username to open its live inbox immediately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>
      </div>
    </div>
  );
}
