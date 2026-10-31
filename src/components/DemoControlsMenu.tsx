"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Trash2,
  Globe,
  Check,
  UserPlus,
  LogOut,
  Terminal,
  Copy,
} from "lucide-react";
import type { MailboxSummary } from "@/lib/db";
import { getMailboxPath } from "@/lib/mailbox-url";

interface DemoControlsMenuProps {
  currentMailbox: string;
  domain: string;
  mailboxes: MailboxSummary[];
  allUnreadCount: number;
  allTotalCount: number;
  onSwitchMailbox: (mailbox: string) => void;
  onLogout: () => void;
  onSeedInbox: () => Promise<void>;
  onTriggerTestEmail: () => Promise<void>;
  onClearMailbox: () => Promise<void>;
}

export function DemoControlsMenu({
  currentMailbox,
  domain,
  mailboxes,
  allUnreadCount,
  allTotalCount,
  onSwitchMailbox,
  onLogout,
  onSeedInbox,
  onTriggerTestEmail,
  onClearMailbox,
}: DemoControlsMenuProps) {
  const [appsOpen, setAppsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newPersonaInput, setNewPersonaInput] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const appsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(event.target as Node)) {
        setAppsOpen(false);
        setConfirmingClear(false);
      }
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarInitials =
    currentMailbox === "__all__"
      ? "ALL"
      : currentMailbox
          .slice(0, 2)
          .toUpperCase();

  const handleQuickSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPersonaInput
      .trim()
      .toLowerCase()
      .split("@")[0]
      .replace(/[^a-z0-9._+-]/g, "");
    if (!cleaned) return;
    setNewPersonaInput("");
    setAccountOpen(false);
    onSwitchMailbox(cleaned);
  };

  const copyWebhookSnippet = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : `https://${domain}`;
    const target =
      currentMailbox === "__all__" ? "jane.smith123" : currentMailbox;
    const cmd = `curl -X POST ${origin}/api/inbound -H "Content-Type: application/json" -d '{"to":"${target}@${domain}","fromName":"Acme Campaign","fromAddress":"news@acme.com","subject":"Exclusive Offer Inside","html":"<h1>Hello ${target}!</h1><p>Triggered via webhook.</p>"}'`;
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Disguised 9-dot Google Apps icon -> Martech Presenter Controls */}
      <div className="relative" ref={appsRef}>
        <button
          type="button"
          onClick={() => {
            setAppsOpen((v) => !v);
            setAccountOpen(false);
          }}
          title="Apps & Demo Controls"
          className="w-10 h-10 rounded-full hover:bg-[#e8eaed] flex items-center justify-center text-[#5f6368] transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM16,6c0,1.1 0.9,2 2,2s2,-0.9 2,-2 -0.9,-2 -2,-2 -2,0.9 -2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z" />
          </svg>
        </button>

        {appsOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[#f8fafd] rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.16)] border border-[#e1e5ea] p-4 z-50 select-text">
            <div className="bg-white rounded-2xl p-3.5 shadow-2xs space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5f6368] px-1">
                Presenter Demo Actions
              </div>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={async () => {
                  setBusyAction("test");
                  try {
                    await onTriggerTestEmail();
                    setAppsOpen(false);
                  } finally {
                    setBusyAction(null);
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#e8f0fe] hover:bg-[#d3e3fd] text-[#0b57d0] text-xs font-medium transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Trigger Live Campaign Email</div>
                  <div className="text-[11px] text-[#0b57d0]/80">
                    Fires HTML email with UTMs, preheader &amp; pixel
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={async () => {
                  setBusyAction("seed");
                  try {
                    await onSeedInbox();
                    setAppsOpen(false);
                  } finally {
                    setBusyAction(null);
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f3f4] text-[#1f1f1f] text-xs font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Seed Background Inbox</div>
                  <div className="text-[11px] text-[#5f6368]">
                    Add 3 realistic emails to current persona
                  </div>
                </div>
              </button>

              {currentMailbox !== "__all__" &&
                (!confirmingClear ? (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setConfirmingClear(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-[#b3261e] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">
                        Clear {currentMailbox} Inbox
                      </div>
                      <div className="text-[11px] text-[#b3261e]/80">
                        Wipe messages for a clean demo run
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50/90 border border-red-200 space-y-2.5">
                    <div className="text-xs font-medium text-[#b3261e]">
                      Delete all messages in{" "}
                      <span className="font-mono font-semibold">
                        {currentMailbox}@{domain}
                      </span>
                      ?
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => setConfirmingClear(false)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-xs font-medium text-[#3c4043] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={async () => {
                          setBusyAction("clear");
                          try {
                            await onClearMailbox();
                            setConfirmingClear(false);
                            setAppsOpen(false);
                          } finally {
                            setBusyAction(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#b3261e] hover:bg-[#8c1d18] text-white text-xs font-medium cursor-pointer"
                      >
                        {busyAction === "clear" ? "Clearing..." : "Confirm Clear"}
                      </button>
                    </div>
                  </div>
                ))}
              <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between text-[11px] text-[#5f6368]">
                <span className="inline-flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>SMTP Port 25 + /api/inbound</span>
                </span>
                <button
                  type="button"
                  onClick={copyWebhookSnippet}
                  className="inline-flex items-center gap-1 text-[#0b57d0] hover:underline font-medium cursor-pointer"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied cURL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Account Avatar / Quick Persona Switcher */}
      <div className="relative" ref={accountRef}>
        <button
          type="button"
          onClick={() => {
            setAccountOpen((v) => !v);
            setAppsOpen(false);
          }}
          className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] transition-colors cursor-pointer"
        >
          <span className="hidden sm:inline text-xs font-medium text-[#3c4043] max-w-[170px] truncate">
            {currentMailbox === "__all__"
              ? `all@${domain}`
              : `${currentMailbox}@${domain}`}
          </span>
          <span className="w-7 h-7 rounded-full bg-[#0b57d0] text-white text-xs font-semibold flex items-center justify-center">
            {avatarInitials}
          </span>
        </button>

        {accountOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[#e9eef6] rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.16)] border border-[#dadce0] p-3.5 z-50 select-text">
            <div className="text-center pb-3">
              <div className="text-xs font-medium text-[#444746]">
                {currentMailbox === "__all__"
                  ? `Catch-All (*@${domain})`
                  : `${currentMailbox}@${domain}`}
              </div>
              <div className="w-14 h-14 rounded-full bg-[#0b57d0] text-white text-lg font-semibold flex items-center justify-center mx-auto my-2.5 shadow-xs">
                {avatarInitials}
              </div>
              <div className="text-base font-normal text-[#1f1f1f]">
                {currentMailbox === "__all__"
                  ? "All Domain Mailboxes"
                  : `Hi, ${currentMailbox}!`}
              </div>
            </div>

            {/* Persona list */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#f1f3f4]">
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
                    onSwitchMailbox("__all__");
                    setAccountOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#f8fafd] transition-colors cursor-pointer ${
                  currentMailbox === "__all__" ? "bg-[#e8f0fe]/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left truncate">
                    <div className="font-medium text-[#1f1f1f]">
                      All Mailboxes (Catch-All)
                    </div>
                    <div className="text-[11px] text-[#5f6368]">
                      *@{domain} ({allTotalCount} msgs)
                    </div>
                  </div>
                </div>
                {allUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0b57d0] text-white text-[10px] font-semibold">
                    {allUnreadCount}
                  </span>
                )}
              </a>

              <div className="max-h-44 overflow-y-auto divide-y divide-[#f1f3f4]">
                {mailboxes.map((m) => {
                  const active = m.username === currentMailbox;
                  return (
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
                          onSwitchMailbox(m.username);
                          setAccountOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#f8fafd] transition-colors cursor-pointer ${
                        active ? "bg-[#e8f0fe]/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {m.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left truncate">
                          <div className="font-medium text-[#1f1f1f] truncate">
                            {m.username}
                          </div>
                          <div className="text-[11px] text-[#5f6368] truncate">
                            {m.username}@{domain}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m.unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#0b57d0] text-white text-[10px] font-semibold">
                            {m.unreadCount}
                          </span>
                        )}
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[#0b57d0]" />
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Quick jump to another persona */}
              <form
                onSubmit={handleQuickSwitch}
                className="p-2.5 bg-[#f8fafd] flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#5f6368] ml-1 shrink-0" />
                <input
                  type="text"
                  value={newPersonaInput}
                  onChange={(e) => setNewPersonaInput(e.target.value)}
                  placeholder="Switch to another mailbox..."
                  className="flex-1 min-w-0 text-xs bg-transparent px-1.5 py-1 focus:outline-none text-[#1f1f1f] placeholder-[#5f6368]"
                />
                {newPersonaInput.trim() && (
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-full bg-[#0b57d0] text-white text-[11px] font-medium cursor-pointer"
                  >
                    Go
                  </button>
                )}
              </form>
            </div>

            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                onLogout();
              }}
              className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-white hover:bg-[#f8fafd] text-xs font-medium text-[#1f1f1f] shadow-2xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#5f6368]" />
              <span>Sign out of mailbox</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
