"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Columns2,
  ArrowLeftRight,
  Lock,
  Unlock,
  Monitor,
  Smartphone,
  Code2,
  X,
  ChevronDown,
  Sparkles,
  User,
} from "lucide-react";
import type { EmailDetail, EmailSummary } from "@/lib/db";
import { OriginalInspectorModal } from "./OriginalInspectorModal";

interface EmailComparePaneProps {
  leftEmail: EmailDetail;
  rightEmail: EmailDetail | null;
  isLoadingRight: boolean;
  domainEmails: EmailSummary[];
  viewportMode: "desktop" | "mobile";
  onChangeViewportMode: (mode: "desktop" | "mobile") => void;
  onSelectLeftEmail: (id: string) => void;
  onSelectRightEmail: (id: string) => void;
  onSwapEmails: () => void;
  onExitCompare: () => void;
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

function formatShortTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface CompareColumnBodyProps {
  email: EmailDetail;
  otherEmail: EmailDetail | null;
  side: "left" | "right";
  domainEmails: EmailSummary[];
  viewportMode: "desktop" | "mobile";
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSelectEmailId: (id: string) => void;
  onOpenInspector: (email: EmailDetail) => void;
}

function CompareColumn({
  email,
  otherEmail,
  side,
  domainEmails,
  viewportMode,
  scrollContainerRef,
  onScroll,
  onSelectEmailId,
  onOpenInspector,
}: CompareColumnBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(560);

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

  useEffect(() => {
    setIframeHeight(560);
  }, [email.id]);

  useEffect(() => {
    const timer = setTimeout(() => syncIframeHeight(), 60);
    return () => clearTimeout(timer);
  }, [viewportMode, syncIframeHeight]);

  const handleIframeLoad = () => {
    syncIframeHeight();
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    doc.querySelectorAll("a[href]").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });

    doc.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", syncIframeHeight);
      img.addEventListener("error", syncIframeHeight);
    });

    if (typeof ResizeObserver !== "undefined" && doc.body) {
      const ro = new ResizeObserver(() => syncIframeHeight());
      ro.observe(doc.body);
    }
  };

  const subjectDiffers =
    otherEmail !== null && email.subject !== otherEmail.subject;
  const snippetDiffers =
    otherEmail !== null && email.snippet !== otherEmail.snippet;
  const recipientDiffers =
    otherEmail !== null && email.originalTo !== otherEmail.originalTo;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-white overflow-hidden">
      {/* Column Persona / Message Picker Bar */}
      <div className="px-4 py-2.5 bg-[#f8fafd] border-b border-[#e1e5ea] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
              side === "left"
                ? "bg-[#e8f0fe] text-[#0b57d0]"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {side === "left" ? "Variant A" : "Variant B"}
          </span>

          <div className="relative flex-1 min-w-0">
            <select
              value={email.id}
              onChange={(e) => onSelectEmailId(e.target.value)}
              className="w-full appearance-none bg-white border border-[#dadce0] hover:border-[#0b57d0] rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium text-[#1f1f1f] truncate focus:outline-none focus:ring-1 focus:ring-[#0b57d0] cursor-pointer"
            >
              {domainEmails.map((item) => {
                const tagPart = item.subAddressTag
                  ? ` (+${item.subAddressTag})`
                  : "";
                return (
                  <option key={item.id} value={item.id}>
                    {item.originalTo}
                    {tagPart} — {item.subject} (
                    {formatShortTimestamp(item.receivedAt)})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#5f6368] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenInspector(email)}
          title="Open Martech Inspector for this variant"
          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[11px] font-medium text-[#444746] transition-colors cursor-pointer shrink-0"
        >
          <Code2 className="w-3 h-3 text-[#0b57d0]" />
          <span>Inspector</span>
        </button>
      </div>

      {/* Scrollable Metadata + Email Body */}
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto divide-y divide-[#f1f3f4]"
      >
        {/* Compact Diff Header Card */}
        <div className="px-5 py-3.5 bg-white space-y-2 text-xs">
          {/* Recipient / Persona Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f1f3f4] text-[#1f1f1f] font-mono text-[11px] font-medium">
                <User className="w-3 h-3 text-[#5f6368]" />
                <span>{email.originalTo}</span>
              </span>
              {email.subAddressTag && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#e8f0fe] text-[#0b57d0] font-mono text-[10px] font-semibold">
                  +{email.subAddressTag}
                </span>
              )}
              {recipientDiffers && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                  Different Persona
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#5f6368]">
              {formatShortTimestamp(email.receivedAt)}
            </span>
          </div>

          {/* Subject Line with Diff Highlight */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">
                Subject
              </span>
              {subjectDiffers && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Personalized</span>
                </span>
              )}
            </div>
            <div
              className={`text-sm font-semibold text-[#1f1f1f] leading-snug break-words ${
                subjectDiffers
                  ? "bg-amber-50/70 -mx-2 px-2 py-1 rounded-lg border border-amber-200/80"
                  : ""
              }`}
            >
              {email.subject}
            </div>
          </div>

          {/* Preheader with Diff Highlight */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">
                Preheader
              </span>
              {snippetDiffers && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Personalized</span>
                </span>
              )}
            </div>
            <div
              className={`text-xs text-[#5f6368] line-clamp-2 ${
                snippetDiffers
                  ? "bg-amber-50/70 -mx-2 px-2 py-1 rounded-lg border border-amber-200/80 text-[#3c4043]"
                  : ""
              }`}
            >
              {email.snippet || "(No preheader text)"}
            </div>
          </div>
        </div>

        {/* Rendered Email Body */}
        <div className="p-4 bg-[#f8fafd]/40">
          {email.htmlBody ? (
            <div
              className={
                viewportMode === "mobile"
                  ? "mx-auto w-[375px] border border-[#dadce0] rounded-2xl shadow-xs overflow-hidden bg-white"
                  : "w-full bg-white rounded-xl border border-[#eceff1] overflow-hidden"
              }
            >
              <iframe
                key={email.id}
                ref={iframeRef}
                title={`${side}-${email.subject}`}
                srcDoc={prepareEmailHtmlDocument(email.htmlBody)}
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{ height: `${iframeHeight}px` }}
                className="w-full border-0 block"
              />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm text-[#1f1f1f] leading-relaxed font-sans p-4 bg-white rounded-xl border border-[#eceff1]">
              {email.textBody || "(Empty message body)"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmailComparePane({
  leftEmail,
  rightEmail,
  isLoadingRight,
  domainEmails,
  viewportMode,
  onChangeViewportMode,
  onSelectLeftEmail,
  onSelectRightEmail,
  onSwapEmails,
  onExitCompare,
}: EmailComparePaneProps) {
  const [syncScroll, setSyncScroll] = useState(true);
  const [inspectedEmail, setInspectedEmail] = useState<EmailDetail | null>(
    null
  );

  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const activeScrollSource = useRef<"left" | "right" | null>(null);
  const releaseScrollLockTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleLeftScroll = () => {
    if (!syncScroll || activeScrollSource.current === "right") return;
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;
    if (!leftEl || !rightEl) return;

    activeScrollSource.current = "left";
    rightEl.scrollTop = leftEl.scrollTop;

    if (releaseScrollLockTimer.current) {
      clearTimeout(releaseScrollLockTimer.current);
    }
    releaseScrollLockTimer.current = setTimeout(() => {
      activeScrollSource.current = null;
    }, 50);
  };

  const handleRightScroll = () => {
    if (!syncScroll || activeScrollSource.current === "left") return;
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;
    if (!leftEl || !rightEl) return;

    activeScrollSource.current = "right";
    leftEl.scrollTop = rightEl.scrollTop;

    if (releaseScrollLockTimer.current) {
      clearTimeout(releaseScrollLockTimer.current);
    }
    releaseScrollLockTimer.current = setTimeout(() => {
      activeScrollSource.current = null;
    }, 50);
  };

  // Count how many key elements differ between left and right
  const diffTags: string[] = [];
  if (rightEmail) {
    if (leftEmail.subject !== rightEmail.subject) diffTags.push("Subject");
    if (leftEmail.snippet !== rightEmail.snippet) diffTags.push("Preheader");
    if (
      (leftEmail.htmlBody || leftEmail.textBody) !==
      (rightEmail.htmlBody || rightEmail.textBody)
    ) {
      diffTags.push("Body Content");
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white select-text">
      {/* Top Comparison Control Bar */}
      <div className="h-12 px-4 border-b border-[#e1e5ea] bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e8f0fe] text-[#0b57d0] text-xs font-semibold">
            <Columns2 className="w-3.5 h-3.5" />
            <span>Side-by-Side Compare</span>
          </div>

          {rightEmail && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#5f6368]">
              {diffTags.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Differs in: {diffTags.join(", ")}</span>
                </span>
              ) : (
                <span className="text-[11px] text-[#5f6368]">
                  Identical subject &amp; body
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Controls: Sync Scroll, Swap, Desktop/Mobile, Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSyncScroll((v) => !v)}
            title={
              syncScroll
                ? "Synchronized scrolling is ON"
                : "Synchronized scrolling is OFF"
            }
            className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
              syncScroll
                ? "border-[#0b57d0]/40 bg-[#e8f0fe] text-[#0b57d0]"
                : "border-[#dadce0] bg-white text-[#5f6368] hover:bg-[#f1f3f4]"
            }`}
          >
            {syncScroll ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Sync Scroll</span>
          </button>

          <button
            type="button"
            disabled={!rightEmail}
            onClick={onSwapEmails}
            title="Swap Left & Right variants"
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] disabled:opacity-50 text-xs font-medium text-[#444746] transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swap</span>
          </button>

          {/* Desktop / Mobile Viewport Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-full border border-[#dadce0] bg-[#f8fafd]">
            <button
              type="button"
              onClick={() => onChangeViewportMode("desktop")}
              title="Desktop viewport (100%)"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                viewportMode === "desktop"
                  ? "bg-[#e8f0fe] text-[#0b57d0]"
                  : "text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewportMode("mobile")}
              title="Mobile viewport (375px)"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                viewportMode === "mobile"
                  ? "bg-[#e8f0fe] text-[#0b57d0]"
                  : "text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onExitCompare}
            title="Exit Side-by-Side Compare"
            className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-[#1f1f1f] hover:bg-[#3c4043] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Compare</span>
          </button>
        </div>
      </div>

      {/* 2 Side-by-Side Columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#e1e5ea]">
        <CompareColumn
          email={leftEmail}
          otherEmail={rightEmail}
          side="left"
          domainEmails={domainEmails}
          viewportMode={viewportMode}
          scrollContainerRef={leftScrollRef}
          onScroll={handleLeftScroll}
          onSelectEmailId={onSelectLeftEmail}
          onOpenInspector={(m) => setInspectedEmail(m)}
        />

        {isLoadingRight ? (
          <div className="flex-1 h-full flex items-center justify-center text-xs text-[#5f6368] bg-[#f8fafd]/50">
            Loading comparison message...
          </div>
        ) : rightEmail ? (
          <CompareColumn
            email={rightEmail}
            otherEmail={leftEmail}
            side="right"
            domainEmails={domainEmails}
            viewportMode={viewportMode}
            scrollContainerRef={rightScrollRef}
            onScroll={handleRightScroll}
            onSelectEmailId={onSelectRightEmail}
            onOpenInspector={(m) => setInspectedEmail(m)}
          />
        ) : (
          <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-[#f8fafd]/50">
            <Columns2 className="w-8 h-8 text-[#c4c7c5] mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-[#3c4043]">
              No second email available to compare
            </p>
            <p className="text-xs text-[#5f6368] mt-1 max-w-xs">
              Send or trigger another email to any persona on this domain to
              compare them side-by-side.
            </p>
          </div>
        )}
      </div>

      {inspectedEmail && (
        <OriginalInspectorModal
          email={inspectedEmail}
          onClose={() => setInspectedEmail(null)}
        />
      )}
    </div>
  );
}
