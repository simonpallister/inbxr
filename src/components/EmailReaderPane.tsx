"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Star,
  Reply,
  Forward,
  MoreVertical,
  Trash2,
  Mail,
  ChevronDown,
  Paperclip,
  Download,
  Smartphone,
  Monitor,
  Code2,
  Printer,
  CheckCircle2,
} from "lucide-react";
import type { EmailDetail } from "@/lib/db";
import { OriginalInspectorModal } from "./OriginalInspectorModal";

interface EmailReaderPaneProps {
  email: EmailDetail | null;
  isLoading: boolean;
  onToggleStar: (id: string, currentStarred: boolean) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

function getAvatarBg(name: string): string {
  const palette = [
    "#0b57d0",
    "#00796b",
    "#7b1fa2",
    "#c2185b",
    "#e65100",
    "#33691e",
    "#283593",
    "#455a64",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function formatFullTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function prepareEmailHtmlDocument(rawHtml: string): string {
  const baseInjection = `
    <base target="_blank" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        overflow-x: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      img {
        max-width: 100%;
      }
    </style>
  `;

  if (/<head[\s>]/i.test(rawHtml)) {
    return rawHtml.replace(/<head([^>]*)>/i, `<head$1>${baseInjection}`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${baseInjection}</head><body>${rawHtml}</body></html>`;
}

export function EmailReaderPane({
  email,
  isLoading,
  onToggleStar,
  onMarkUnread,
  onDelete,
}: EmailReaderPaneProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [unsubscribedNotice, setUnsubscribedNotice] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(560);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetailsOpen(false);
    setMenuOpen(false);
    setUnsubscribedNotice(false);
    setIframeHeight(560);
  }, [email?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        detailsRef.current &&
        !detailsRef.current.contains(e.target as Node)
      ) {
        setDetailsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const syncIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;
    const body = doc.body;
    const html = doc.documentElement;
    if (!body || !html) return;

    const nextHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight,
      html.offsetHeight,
      360
    );
    setIframeHeight(nextHeight + 16);
  }, []);

  const handleIframeLoad = () => {
    syncIframeHeight();
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    // Ensure all links open in a new tab
    doc.querySelectorAll("a[href]").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });

    // Listen to images loading inside the email to recalculate height
    doc.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", syncIframeHeight);
      img.addEventListener("error", syncIframeHeight);
    });

    if (typeof ResizeObserver !== "undefined" && doc.body) {
      const ro = new ResizeObserver(() => syncIframeHeight());
      ro.observe(doc.body);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-white flex items-center justify-center text-xs text-[#5f6368]">
        Loading conversation...
      </div>
    );
  }

  if (!email) {
    return (
      <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-[#f8fafd] border border-[#e1e5ea] flex items-center justify-center mb-3">
          <Mail className="w-7 h-7 text-[#c4c7c5] stroke-[1.5]" />
        </div>
        <p className="text-sm font-normal text-[#5f6368]">
          No conversations selected
        </p>
      </div>
    );
  }

  const downloadableAttachments = email.attachments.filter((a) => !a.isInline);
  const recipientLocal = email.originalTo.split("@")[0] || email.mailbox;

  const handleUnsubscribeClick = () => {
    if (!email.listUnsubscribe) return;
    if (/^https?:\/\//i.test(email.listUnsubscribe)) {
      window.open(email.listUnsubscribe, "_blank", "noopener,noreferrer");
    }
    setUnsubscribedNotice(true);
  };

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-y-auto select-text">
      {/* Subject Header Bar */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <h1 className="text-[21px] font-normal text-[#1f1f1f] leading-snug break-words">
            {email.subject}
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs bg-[#e8eaed] text-[#3c4043] text-xs font-normal">
            Inbox
          </span>
          {viewportMode === "mobile" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#0b57d0] text-[11px] font-medium">
              <Smartphone className="w-3 h-3" />
              <span>Mobile 375px</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            title="Print"
            className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#444746] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unsubscribed banner if clicked */}
      {unsubscribedNotice && (
        <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-[#f1f3f4] text-xs text-[#3c4043] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            You have unsubscribed from{" "}
            <strong>{email.fromAddress}</strong> via List-Unsubscribe header.
          </span>
        </div>
      )}

      {/* Sender Info & Actions Row */}
      <div className="px-6 py-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Sender Avatar */}
          <div
            style={{ backgroundColor: getAvatarBg(email.fromName) }}
            className="w-10 h-10 rounded-full text-white font-medium text-sm flex items-center justify-center shrink-0 mt-0.5 select-none"
          >
            {email.fromName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold text-[#1f1f1f]">
                {email.fromName}
              </span>
              <span className="text-xs text-[#5f6368]">
                &lt;{email.fromAddress}&gt;
              </span>

              {/* Gmail-style List-Unsubscribe link next to sender */}
              {email.listUnsubscribe && !unsubscribedNotice && (
                <button
                  type="button"
                  onClick={handleUnsubscribeClick}
                  className="text-xs text-[#0b57d0] hover:underline font-medium cursor-pointer"
                >
                  Unsubscribe
                </button>
              )}
            </div>

            {/* "to me ▾" expandable header details */}
            <div className="relative mt-0.5" ref={detailsRef}>
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="inline-flex items-center gap-0.5 text-xs text-[#5f6368] hover:text-[#1f1f1f] cursor-pointer"
              >
                <span>to {recipientLocal}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {detailsOpen && (
                <div className="absolute left-0 mt-1.5 w-[360px] sm:w-[430px] bg-white rounded-xl shadow-xl border border-[#dadce0] p-4 z-30 text-xs space-y-1.5">
                  <div className="grid grid-cols-[75px_1fr] gap-2">
                    <span className="text-[#5f6368] text-right">from:</span>
                    <span className="text-[#1f1f1f] font-medium break-all">
                      {email.fromName} &lt;{email.fromAddress}&gt;
                    </span>
                  </div>
                  {email.replyTo && (
                    <div className="grid grid-cols-[75px_1fr] gap-2">
                      <span className="text-[#5f6368] text-right">
                        reply-to:
                      </span>
                      <span className="text-[#1f1f1f] break-all">
                        {email.replyTo}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-[75px_1fr] gap-2">
                    <span className="text-[#5f6368] text-right">to:</span>
                    <span className="text-[#1f1f1f] break-all">
                      {email.originalTo}
                    </span>
                  </div>
                  <div className="grid grid-cols-[75px_1fr] gap-2">
                    <span className="text-[#5f6368] text-right">date:</span>
                    <span className="text-[#1f1f1f]">
                      {formatFullTimestamp(email.receivedAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[75px_1fr] gap-2">
                    <span className="text-[#5f6368] text-right">subject:</span>
                    <span className="text-[#1f1f1f]">{email.subject}</span>
                  </div>
                  <div className="grid grid-cols-[75px_1fr] gap-2">
                    <span className="text-[#5f6368] text-right">
                      mailed-by:
                    </span>
                    <span className="text-[#1f1f1f]">
                      {email.fromAddress.split("@")[1] || "example.com"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side of sender row: Timestamp, Star, Reply (vanity), More ⋮ menu */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:inline text-xs text-[#5f6368] mr-1">
            {formatFullTimestamp(email.receivedAt)}
          </span>

          <button
            type="button"
            onClick={() => onToggleStar(email.id, email.isStarred)}
            title={email.isStarred ? "Starred" : "Not starred"}
            className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                email.isStarred
                  ? "fill-[#f4b400] text-[#f4b400]"
                  : "text-[#5f6368]"
              }`}
            />
          </button>

          {/* Inert vanity Reply icon button */}
          <button
            type="button"
            title="Reply"
            className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] cursor-pointer"
          >
            <Reply className="w-4 h-4" />
          </button>

          {/* Disguised ⋮ More menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              title="More"
              className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-[#dadce0] py-1.5 z-40 text-xs text-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <Reply className="w-4 h-4 text-[#5f6368]" />
                  <span>Reply</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <Forward className="w-4 h-4 text-[#5f6368]" />
                  <span>Forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMarkUnread(email.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#5f6368]" />
                  <span>Mark as unread</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(email.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-[#5f6368]" />
                  <span>Delete this message</span>
                </button>

                <div className="my-1 border-t border-[#e1e5ea]" />

                <button
                  type="button"
                  onClick={() => {
                    setViewportMode((m) =>
                      m === "desktop" ? "mobile" : "desktop"
                    );
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  {viewportMode === "desktop" ? (
                    <>
                      <Smartphone className="w-4 h-4 text-[#5f6368]" />
                      <span>Mobile viewport (375px)</span>
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4 text-[#5f6368]" />
                      <span>Desktop viewport (100%)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setInspectorOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-[#5f6368]" />
                  <span>Show original</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Body Container */}
      <div className="px-6 py-4 flex-1">
        {email.htmlBody ? (
          <div
            className={
              viewportMode === "mobile"
                ? "mx-auto w-[375px] border border-[#dadce0] rounded-2xl shadow-sm overflow-hidden bg-white"
                : "w-full"
            }
          >
            <iframe
              key={`${email.id}-${viewportMode}`}
              ref={iframeRef}
              title={email.subject}
              srcDoc={prepareEmailHtmlDocument(email.htmlBody)}
              onLoad={handleIframeLoad}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              style={{ height: `${iframeHeight}px` }}
              className="w-full border-0 block"
            />
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm text-[#1f1f1f] leading-relaxed font-sans py-2">
            {email.textBody || "(Empty message body)"}
          </div>
        )}

        {/* Downloadable Attachments */}
        {downloadableAttachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#e1e5ea]">
            <div className="text-xs font-semibold text-[#3c4043] mb-3 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>
                {downloadableAttachments.length}{" "}
                {downloadableAttachments.length === 1
                  ? "Attachment"
                  : "Attachments"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {downloadableAttachments.map((att) => (
                <a
                  key={att.id}
                  href={`/api/emails/${email.id}/attachments/${att.id}?download=1`}
                  className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] hover:border-[#0b57d0] transition-colors text-xs"
                >
                  <div>
                    <div className="font-medium text-[#1f1f1f] group-hover:text-[#0b57d0] truncate max-w-[200px]">
                      {att.filename}
                    </div>
                    <div className="text-[11px] text-[#5f6368]">
                      {formatBytes(att.size)}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[#5f6368] group-hover:text-[#0b57d0]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Authentic Gmail-style Bottom Vanity Reply / Forward Pills */}
        <div className="mt-8 pb-8 flex items-center gap-3 select-none">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-[#747775] hover:bg-[#f1f3f4] text-sm font-medium text-[#444746] transition-colors cursor-pointer"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-[#747775] hover:bg-[#f1f3f4] text-sm font-medium text-[#444746] transition-colors cursor-pointer"
          >
            <Forward className="w-4 h-4" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Disguised "Show Original" Modal */}
      {inspectorOpen && (
        <OriginalInspectorModal
          email={email}
          onClose={() => setInspectorOpen(false)}
        />
      )}
    </div>
  );
}
