"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import type { EmailDetail } from "@/lib/db";

interface OriginalInspectorModalProps {
  email: EmailDetail;
  onClose: () => void;
}

export function OriginalInspectorModal({
  email,
  onClose,
}: OriginalInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<
    "links" | "headers" | "html" | "text"
  >("links");
  const [copied, setCopied] = useState(false);

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const regularLinks = email.extractedLinks.filter((l) => !l.isTrackingPixel);
  const trackingPixels = email.extractedLinks.filter((l) => l.isTrackingPixel);

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
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] mb-3">
                  Tracked CTA &amp; Body Links ({regularLinks.length})
                </h3>
                {regularLinks.length === 0 ? (
                  <p className="text-xs text-[#5f6368]">
                    No links found in this email.
                  </p>
                ) : (
                  <div className="border border-[#e1e5ea] rounded-xl overflow-hidden divide-y divide-[#e1e5ea]">
                    {regularLinks.map((link, idx) => (
                      <div key={idx} className="p-3.5 hover:bg-[#f8fafd] text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-semibold text-[#1f1f1f]">
                            {link.text}
                          </span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#0b57d0] hover:underline shrink-0"
                          >
                            <span>Test Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[#5f6368] break-all">
                          {link.url}
                        </div>
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
                    ))}
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
