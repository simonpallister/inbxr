"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Link2,
  Code,
  FileText,
  ListTree,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { EmailDetail, ExtractedLink } from "@/lib/db";
import { classifyEmailLink } from "@/lib/link-utils";

interface OriginalInspectorModalProps {
  email: EmailDetail;
  onClose: () => void;
}

function getStatusBadgeStyle(status: number | null, error?: string | null) {
  if (error || status === null) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (status >= 200 && status < 300) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-red-50 text-red-700 border-red-200";
}

export function OriginalInspectorModal({
  email,
  onClose,
}: OriginalInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<
    "links" | "headers" | "html" | "text"
  >("links");
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<ExtractedLink[]>(email.extractedLinks);
  const [isUnrollingAll, setIsUnrollingAll] = useState(false);
  const [unrollingUrl, setUnrollingUrl] = useState<string | null>(null);
  const [expandedHopsIdx, setExpandedHopsIdx] = useState<number | null>(null);

  useEffect(() => {
    setLinks(email.extractedLinks);
  }, [email.id, email.extractedLinks]);

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const regularLinks = links.filter((l) => !l.isTrackingPixel);
  const trackingPixels = links.filter((l) => l.isTrackingPixel);

  const safeRegularLinks = regularLinks.filter((l) => {
    const cat = classifyEmailLink(l.url, l.text);
    return cat !== "unsubscribe" && cat !== "preferences";
  });

  const uniqueSafeUrlsCount = new Set(safeRegularLinks.map((l) => l.url)).size;
  const unrolledCount = regularLinks.filter((l) => Boolean(l.unrolled)).length;

  const handleUnrollAllSafe = async () => {
    if (isUnrollingAll || unrollingUrl) return;
    setIsUnrollingAll(true);
    try {
      const res = await fetch(`/api/emails/${email.id}/unroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email?.extractedLinks) {
          setLinks(data.email.extractedLinks);
        }
      }
    } finally {
      setIsUnrollingAll(false);
    }
  };

  const handleUnrollSingleUrl = async (targetUrl: string) => {
    if (isUnrollingAll || unrollingUrl) return;
    setUnrollingUrl(targetUrl);
    try {
      const res = await fetch(`/api/emails/${email.id}/unroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email?.extractedLinks) {
          setLinks(data.email.extractedLinks);
        }
      }
    } finally {
      setUnrollingUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 select-text">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#dadce0] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e1e5ea] flex items-center justify-between bg-[#f8fafd]">
          <div>
            <h2 className="text-base font-semibold text-[#1f1f1f]">
              Original Message &amp; Martech Inspector
            </h2>
            <p className="text-xs text-[#5f6368] mt-0.5 truncate max-w-xl">
              {email.subject} &bull; Delivered to{" "}
              <span className="font-mono text-[#0b57d0]">
                {email.originalTo}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8eaed] flex items-center justify-center text-[#5f6368] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary metadata table (like Gmail "Show Original") */}
        <div className="px-6 py-3 bg-white border-b border-[#e1e5ea] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-[#f8fafd] border border-[#e1e5ea]">
            <div className="text-[11px] text-[#5f6368] uppercase font-medium">
              Preheader Extracted
            </div>
            <div className="text-[#1f1f1f] mt-1 line-clamp-2">
              {email.snippet || "(None)"}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8fafd] border border-[#e1e5ea]">
            <div className="text-[11px] text-[#5f6368] uppercase font-medium">
              List-Unsubscribe Header
            </div>
            <div className="text-[#1f1f1f] mt-1 truncate font-mono text-[11px]">
              {email.listUnsubscribe || "Not present"}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8fafd] border border-[#e1e5ea]">
            <div className="text-[11px] text-[#5f6368] uppercase font-medium">
              Open Tracking Pixels
            </div>
            <div className="text-[#1f1f1f] mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  trackingPixels.length > 0 ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              <span>
                {trackingPixels.length > 0
                  ? `${trackingPixels.length} pixel(s) fired on open`
                  : "No 1x1 pixel detected"}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-[#e1e5ea] flex items-center justify-between bg-[#f8fafd]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("links")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "links"
                  ? "border-[#0b57d0] text-[#0b57d0]"
                  : "border-transparent text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Links &amp; UTMs ({regularLinks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("headers")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "headers"
                  ? "border-[#0b57d0] text-[#0b57d0]"
                  : "border-transparent text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>MIME Headers ({Object.keys(email.rawHeaders).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("html")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "html"
                  ? "border-[#0b57d0] text-[#0b57d0]"
                  : "border-transparent text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw HTML</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "text"
                  ? "border-[#0b57d0] text-[#0b57d0]"
                  : "border-transparent text-[#5f6368] hover:text-[#1f1f1f]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plain-Text Fallback</span>
            </button>
          </div>

          {(activeTab === "html" || activeTab === "text") && (
            <button
              type="button"
              onClick={() =>
                copyContent(
                  activeTab === "html"
                    ? email.htmlBody || ""
                    : email.textBody || ""
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0b57d0] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to clipboard</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === "links" && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368]">
                      Tracked CTA &amp; Body Links ({regularLinks.length})
                    </h3>
                    <p className="text-[11px] text-[#5f6368] mt-0.5">
                      Unrolling follows ESP redirect wrappers (e.g.{" "}
                      <code className="font-mono text-[#1f1f1f]">ddlnk.net</code>
                      ) to reveal final URLs, HTTP status &amp; UTM tags while
                      skipping unsubscribe links.
                    </p>
                  </div>

                  {uniqueSafeUrlsCount > 0 && (
                    <button
                      type="button"
                      disabled={isUnrollingAll || unrollingUrl !== null}
                      onClick={handleUnrollAllSafe}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-60 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      {isUnrollingAll ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            Unrolling {uniqueSafeUrlsCount} unique URL
                            {uniqueSafeUrlsCount === 1 ? "" : "s"}...
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {unrolledCount > 0
                              ? `Re-Audit Safe Links (${uniqueSafeUrlsCount} unique)`
                              : `Unroll & Audit Safe Links (${uniqueSafeUrlsCount} unique)`}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {regularLinks.length === 0 ? (
                  <p className="text-xs text-[#5f6368]">
                    No links found in this email.
                  </p>
                ) : (
                  <div className="border border-[#e1e5ea] rounded-xl overflow-hidden divide-y divide-[#e1e5ea]">
                    {regularLinks.map((link, idx) => {
                      const category = classifyEmailLink(link.url, link.text);
                      const isProtected =
                        category === "unsubscribe" ||
                        category === "preferences";
                      const unrolled = link.unrolled;
                      const redirectCount = unrolled
                        ? Math.max(0, unrolled.hops.length - 1)
                        : 0;
                      const isThisUrlUnrolling =
                        unrollingUrl === link.url ||
                        (isUnrollingAll && !isProtected);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 hover:bg-[#f8fafd] text-xs transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="font-semibold text-[#1f1f1f]">
                                {link.text}
                              </span>

                              {category === "unsubscribe" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Unsubscribe (Skipped in bulk)</span>
                                </span>
                              )}

                              {category === "preferences" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Preferences (Skipped in bulk)</span>
                                </span>
                              )}

                              {category === "view_online" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                                  View Online
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                disabled={
                                  isUnrollingAll || unrollingUrl !== null
                                }
                                onClick={() => handleUnrollSingleUrl(link.url)}
                                className="inline-flex items-center gap-1 text-[#5f6368] hover:text-[#0b57d0] font-medium cursor-pointer disabled:opacity-50"
                                title={
                                  isProtected
                                    ? "Warning: Unrolling an unsubscribe link will request it via HTTP GET"
                                    : "Follow redirects and inspect destination URL"
                                }
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${
                                    isThisUrlUnrolling ? "animate-spin" : ""
                                  }`}
                                />
                                <span>
                                  {unrolled ? "Re-audit" : "Unroll"}
                                </span>
                              </button>

                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#0b57d0] hover:underline shrink-0 font-medium"
                              >
                                <span>Test Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          {/* Original href */}
                          <div className="mt-1 font-mono text-[11px] text-[#5f6368] break-all">
                            {link.url}
                          </div>

                          {/* Unrolled Destination & Audit Result */}
                          {unrolled && (
                            <div className="mt-2.5 p-2.5 rounded-lg bg-[#f8fafd] border border-[#e1e5ea] space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getStatusBadgeStyle(
                                      unrolled.finalStatus,
                                      unrolled.error
                                    )}`}
                                  >
                                    {unrolled.error ||
                                    !unrolled.finalStatus ||
                                    unrolled.finalStatus >= 400 ? (
                                      <AlertTriangle className="w-3 h-3" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    <span>
                                      {unrolled.finalStatus
                                        ? `HTTP ${unrolled.finalStatus}`
                                        : "Error"}
                                    </span>
                                  </span>

                                  <span className="text-[11px] text-[#5f6368]">
                                    {redirectCount === 0
                                      ? "Direct (0 redirects)"
                                      : `${redirectCount} redirect${
                                          redirectCount === 1 ? "" : "s"
                                        }`}
                                  </span>

                                  <span className="text-[11px] text-[#5f6368]">
                                    &bull; {unrolled.durationMs}ms
                                  </span>
                                </div>

                                {unrolled.hops.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedHopsIdx(
                                        expandedHopsIdx === idx ? null : idx
                                      )
                                    }
                                    className="text-[11px] text-[#0b57d0] hover:underline font-medium cursor-pointer"
                                  >
                                    {expandedHopsIdx === idx
                                      ? "Hide redirect chain"
                                      : "View redirect chain"}
                                  </button>
                                )}
                              </div>

                              {/* Final Destination URL */}
                              <div className="flex items-start gap-1.5 text-[11px]">
                                <ArrowRight className="w-3.5 h-3.5 text-[#0b57d0] shrink-0 mt-0.5" />
                                <a
                                  href={unrolled.finalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[#1f1f1f] hover:text-[#0b57d0] hover:underline break-all font-medium"
                                >
                                  {unrolled.finalUrl}
                                </a>
                              </div>

                              {unrolled.error && (
                                <div className="text-[11px] text-red-600">
                                  {unrolled.error}
                                </div>
                              )}

                              {/* Expandable hop trace */}
                              {expandedHopsIdx === idx &&
                                unrolled.hops.length > 1 && (
                                  <div className="pt-2 mt-1.5 border-t border-[#e1e5ea] space-y-1">
                                    {unrolled.hops.map((hop, hopIdx) => (
                                      <div
                                        key={hopIdx}
                                        className="flex items-start gap-2 text-[11px] font-mono text-[#5f6368]"
                                      >
                                        <span className="px-1.5 py-0.2 rounded bg-white border border-[#dadce0] text-[10px] text-[#3c4043] shrink-0">
                                          #{hopIdx + 1} ({hop.status})
                                        </span>
                                        <span className="break-all">
                                          {hop.url}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Extracted / Discovered UTM & Tracking Parameters */}
                          {Object.keys(link.utmParams).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(link.utmParams).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#e8f0fe] text-[#0b57d0] font-mono text-[11px]"
                                >
                                  <strong className="mr-1">{k}:</strong> {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Tracking Pixels ({trackingPixels.length})</span>
                </h3>
                {trackingPixels.length === 0 ? (
                  <p className="text-xs text-[#5f6368]">
                    No 1x1 tracking pixels detected in HTML.
                  </p>
                ) : (
                  <div className="border border-[#e1e5ea] rounded-xl overflow-hidden divide-y divide-[#e1e5ea]">
                    {trackingPixels.map((px, idx) => (
                      <div key={idx} className="p-3 bg-[#f8fafd] text-xs">
                        <div className="font-medium text-emerald-700 mb-1">
                          Fired automatically when message opened in reading pane
                        </div>
                        <div className="font-mono text-[11px] text-[#444746] break-all">
                          {px.url}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "headers" && (
            <div className="border border-[#e1e5ea] rounded-xl overflow-hidden divide-y divide-[#e1e5ea] text-xs">
              {Object.entries(email.rawHeaders).map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-1 md:grid-cols-4 p-3 hover:bg-[#f8fafd] gap-2"
                >
                  <div className="font-mono font-semibold text-[#444746] break-all">
                    {key}
                  </div>
                  <div className="md:col-span-3 font-mono text-[#1f1f1f] break-all">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "html" && (
            <pre className="p-4 rounded-xl bg-[#0f172a] text-[#e2e8f0] font-mono text-xs overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {email.htmlBody || "(No HTML body present)"}
            </pre>
          )}

          {activeTab === "text" && (
            <pre className="p-4 rounded-xl bg-[#f8fafd] border border-[#e1e5ea] text-[#1f1f1f] font-mono text-xs overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {email.textBody || "(No plain-text fallback present)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
