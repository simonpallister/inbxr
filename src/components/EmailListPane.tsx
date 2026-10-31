"use client";

import React from "react";
import {
  RotateCw,
  Trash2,
  MailOpen,
  Mail,
  Star,
  Paperclip,
  Inbox,
  Send,
  FileText,
} from "lucide-react";
import type { EmailSummary } from "@/lib/db";

interface EmailListPaneProps {
  emails: EmailSummary[];
  selectedId: string | null;
  selectedCheckedIds: Set<string>;
  folder: "inbox" | "starred" | "sent" | "drafts" | "trash";
  isCatchAll: boolean;
  isLoading: boolean;
  onSelectEmail: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleStar: (id: string, currentStarred: boolean) => void;
  onDeleteEmail: (id: string) => void;
  onRefresh: () => void;
  onBulkMarkRead: (isRead: boolean) => void;
  onBulkDelete: () => void;
}

function formatListTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function EmailListPane({
  emails,
  selectedId,
  selectedCheckedIds,
  folder,
  isCatchAll,
  isLoading,
  onSelectEmail,
  onToggleCheck,
  onToggleSelectAll,
  onToggleStar,
  onDeleteEmail,
  onRefresh,
  onBulkMarkRead,
  onBulkDelete,
}: EmailListPaneProps) {
  const allChecked =
    emails.length > 0 && selectedCheckedIds.size === emails.length;
  const someChecked = selectedCheckedIds.size > 0;

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eceff1] select-none">
      {/* Gmail-style Action Toolbar */}
      <div className="h-12 px-3 border-b border-[#f1f3f4] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <label className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded-xs border-[#747775] accent-[#0b57d0] cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#444746] transition-colors cursor-pointer"
          >
            <RotateCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>

          {someChecked && (
            <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-[#e1e5ea]">
              <button
                type="button"
                onClick={() => onBulkMarkRead(true)}
                title="Mark as read"
                className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#444746] cursor-pointer"
              >
                <MailOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onBulkMarkRead(false)}
                title="Mark as unread"
                className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#444746] cursor-pointer"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onBulkDelete}
                title="Delete"
                className="w-8 h-8 rounded-full hover:bg-[#f1f3f4] flex items-center justify-center text-[#444746] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-[#5f6368] pr-1">
          {emails.length > 0 ? `1–${emails.length} of ${emails.length}` : "0 messages"}
        </div>
      </div>

      {/* Email rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f4]">
        {emails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#5f6368]">
            {folder === "sent" ? (
              <>
                <Send className="w-10 h-10 text-[#dadce0] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-[#3c4043]">
                  No sent messages
                </p>
                <p className="text-xs text-[#5f6368] mt-1">
                  Messages sent from this account will appear here.
                </p>
              </>
            ) : folder === "drafts" ? (
              <>
                <FileText className="w-10 h-10 text-[#dadce0] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-[#3c4043]">
                  No saved drafts
                </p>
              </>
            ) : (
              <>
                <Inbox className="w-10 h-10 text-[#dadce0] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-[#3c4043]">
                  Your {folder} is empty
                </p>
                <p className="text-xs text-[#5f6368] mt-1 max-w-xs">
                  Waiting for incoming emails. New messages will appear here in real time.
                </p>
              </>
            )}
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = email.id === selectedId;
            const isChecked = selectedCheckedIds.has(email.id);
            const unread = !email.isRead;

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors relative ${
                  isSelected
                    ? "bg-[#d3e3fd]/65"
                    : isChecked
                      ? "bg-[#e8f0fe]/70"
                      : unread
                        ? "bg-white hover:bg-[#f2f6fc]"
                        : "bg-[#f8fafd]/80 hover:bg-[#f2f6fc]"
                }`}
              >
                {/* Left selection bar indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0b57d0]" />
                )}

                {/* Checkbox & Star */}
                <div
                  className="flex items-center gap-1 pt-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCheck(email.id)}
                    className="w-4 h-4 rounded-xs border-[#747775] accent-[#0b57d0] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => onToggleStar(email.id, email.isStarred)}
                    className="p-1 rounded-full hover:bg-black/5 text-[#5f6368] cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        email.isStarred
                          ? "fill-[#f4b400] text-[#f4b400]"
                          : "text-[#c4c7c5] group-hover:text-[#747775]"
                      }`}
                    />
                  </button>
                </div>

                {/* Main sender, subject, preheader snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-[14px] truncate ${
                          unread
                            ? "font-bold text-[#1f1f1f]"
                            : "font-normal text-[#3c4043]"
                        }`}
                      >
                        {email.fromName}
                      </span>

                      {isCatchAll && (
                        <span className="px-1.5 py-0.2 rounded-xs bg-[#e8f0fe] text-[#0b57d0] text-[10px] font-mono shrink-0">
                          {email.mailbox}
                        </span>
                      )}

                      {email.subAddressTag && (
                        <span className="px-1.5 py-0.2 rounded-xs bg-[#f1f3f4] text-[#444746] text-[10px] font-mono shrink-0">
                          +{email.subAddressTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {email.hasAttachments && (
                        <Paperclip className="w-3.5 h-3.5 text-[#5f6368] group-hover:hidden" />
                      )}
                      <span
                        className={`text-xs whitespace-nowrap group-hover:hidden ${
                          unread
                            ? "font-semibold text-[#0b57d0]"
                            : "text-[#5f6368]"
                        }`}
                      >
                        {formatListTime(email.receivedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEmail(email.id);
                        }}
                        title={
                          folder === "trash" ? "Delete forever" : "Delete"
                        }
                        className="hidden group-hover:flex w-6 h-6 -my-1 rounded-full hover:bg-black/10 items-center justify-center text-[#444746] hover:text-[#1f1f1f] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject line */}
                  <div
                    className={`text-[13px] truncate mt-0.5 ${
                      unread
                        ? "font-semibold text-[#1f1f1f]"
                        : "font-normal text-[#3c4043]"
                    }`}
                  >
                    {email.subject}
                  </div>

                  {/* Preheader snippet */}
                  <div className="text-xs text-[#5f6368] truncate mt-0.5">
                    {email.snippet || "\u00A0"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
