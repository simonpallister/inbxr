"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Menu,
  Search,
  X,
  Pencil,
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  Mail,
} from "lucide-react";
import type {
  EmailDetail,
  EmailSummary,
  MailboxSummary,
} from "@/lib/db";
import { formatMailboxTitle } from "@/lib/mailbox-url";
import { EmailListPane } from "./EmailListPane";
import { EmailReaderPane } from "./EmailReaderPane";
import { DemoControlsMenu } from "./DemoControlsMenu";

interface InboxShellProps {
  currentMailbox: string;
  domain: string;
  mailboxes: MailboxSummary[];
  allUnreadCount: number;
  allTotalCount: number;
  onSwitchMailbox: (mailbox: string) => void;
  onLogout: () => void;
  onRefreshMailboxes: () => void;
}

export function InboxShell({
  currentMailbox,
  domain,
  mailboxes,
  allUnreadCount,
  allTotalCount,
  onSwitchMailbox,
  onLogout,
  onRefreshMailboxes,
}: InboxShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [folder, setFolder] = useState<
    "inbox" | "starred" | "sent" | "drafts" | "trash"
  >("inbox");
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [selectedCheckedIds, setSelectedCheckedIds] = useState<Set<string>>(
    new Set()
  );

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const fetchEmailList = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingList(true);
      try {
        const params = new URLSearchParams({
          mailbox: currentMailbox,
          folder,
          search,
        });
        const res = await fetch(`/api/emails?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setEmails(data.emails || []);
        setUnreadCount(Number(data.unreadCount || 0));
        setStarredCount(Number(data.starredCount || 0));
        setTrashCount(Number(data.trashCount || 0));
      } finally {
        if (!silent) setIsLoadingList(false);
      }
    },
    [currentMailbox, folder, search]
  );

  useEffect(() => {
    setSelectedId(null);
    setSelectedEmail(null);
    setSelectedCheckedIds(new Set());
  }, [currentMailbox, folder]);

  useEffect(() => {
    document.title = formatMailboxTitle(currentMailbox, unreadCount);
  }, [currentMailbox, unreadCount]);

  useEffect(() => {
    fetchEmailList();
  }, [fetchEmailList]);

  // Real-time Server-Sent Events (SSE) subscription
  useEffect(() => {
    const es = new EventSource(
      `/api/stream?mailbox=${encodeURIComponent(currentMailbox)}`
    );

    es.addEventListener("email:new", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        fetchEmailList(true);
        onRefreshMailboxes();
        showToast(`New message from ${payload.fromName}: "${payload.subject}"`);
      } catch {
        fetchEmailList(true);
      }
    });

    es.addEventListener("persona:activity", () => {
      onRefreshMailboxes();
    });

    es.addEventListener("mailbox:updated", () => {
      fetchEmailList(true);
      onRefreshMailboxes();
    });

    return () => {
      es.close();
    };
  }, [currentMailbox, fetchEmailList, onRefreshMailboxes, showToast]);

  const handleSelectEmail = async (id: string) => {
    setSelectedId(id);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/emails/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const detail: EmailDetail = data.email;
      setSelectedEmail(detail);

      // Mark as read automatically when opened in reading pane
      if (!detail.isRead) {
        await fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
        setEmails((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        onRefreshMailboxes();
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleStar = async (id: string, currentStarred: boolean) => {
    const nextStarred = !currentStarred;
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: nextStarred } : m))
    );
    if (selectedEmail?.id === id) {
      setSelectedEmail((prev) =>
        prev ? { ...prev, isStarred: nextStarred } : null
      );
    }
    await fetch(`/api/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: nextStarred }),
    });
    fetchEmailList(true);
  };

  const handleMarkUnread = async (id: string) => {
    await fetch(`/api/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: false }),
    });
    setSelectedId(null);
    setSelectedEmail(null);
    fetchEmailList(true);
    onRefreshMailboxes();
    showToast("Conversation marked as unread.");
  };

  const handleDeleteSingle = async (id: string) => {
    if (folder === "trash") {
      await fetch(`/api/emails/${id}`, { method: "DELETE" });
      showToast("Conversation deleted forever.");
    } else {
      await fetch(`/api/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "trash" }),
      });
      showToast("Conversation moved to Trash.");
    }
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedEmail(null);
    }
    fetchEmailList(true);
    onRefreshMailboxes();
  };

  const handleToggleCheck = (id: string) => {
    setSelectedCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedCheckedIds.size === emails.length) {
      setSelectedCheckedIds(new Set());
    } else {
      setSelectedCheckedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    const ids = Array.from(selectedCheckedIds);
    if (ids.length === 0) return;
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk-update",
        mailbox: currentMailbox,
        ids,
        updates: { isRead },
      }),
    });
    setSelectedCheckedIds(new Set());
    fetchEmailList(true);
    onRefreshMailboxes();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedCheckedIds);
    if (ids.length === 0) return;
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk-update",
        mailbox: currentMailbox,
        ids,
        updates:
          folder === "trash"
            ? { deletePermanently: true }
            : { folder: "trash" },
      }),
    });
    if (selectedId && selectedCheckedIds.has(selectedId)) {
      setSelectedId(null);
      setSelectedEmail(null);
    }
    setSelectedCheckedIds(new Set());
    fetchEmailList(true);
    onRefreshMailboxes();
    showToast(
      folder === "trash"
        ? `${ids.length} conversation(s) deleted forever.`
        : `${ids.length} conversation(s) moved to Trash.`
    );
  };

  const handleSeedInbox = async () => {
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed", mailbox: currentMailbox }),
    });
    await fetchEmailList(true);
    onRefreshMailboxes();
    showToast("Populated inbox with sample emails.");
  };

  const handleTriggerTestEmail = async () => {
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test-email", mailbox: currentMailbox }),
    });
  };

  const handleClearMailbox = async () => {
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear", mailbox: currentMailbox }),
    });
    setSelectedId(null);
    setSelectedEmail(null);
    setSelectedCheckedIds(new Set());
    await fetchEmailList(true);
    onRefreshMailboxes();
    showToast("Inbox cleared.");
  };

  const navItems: Array<{
    key: "inbox" | "starred" | "sent" | "drafts" | "trash";
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      key: "inbox",
      label: "Inbox",
      icon: <Inbox className="w-4 h-4" />,
      badge: unreadCount,
    },
    {
      key: "starred",
      label: "Starred",
      icon: <Star className="w-4 h-4" />,
      badge: starredCount,
    },
    {
      key: "sent",
      label: "Sent",
      icon: <Send className="w-4 h-4" />,
    },
    {
      key: "drafts",
      label: "Drafts",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "trash",
      label: "Trash",
      icon: <Trash2 className="w-4 h-4" />,
      badge: trashCount,
    },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f6f8fc] overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Menu + Brand */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="w-10 h-10 rounded-full hover:bg-[#e8eaed] flex items-center justify-center text-[#5f6368] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-lg bg-[#0b57d0] flex items-center justify-center shadow-2xs">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-normal text-[#444746] tracking-tight">
              inbxr
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center bg-[#eaf1fb] focus-within:bg-white focus-within:shadow-md rounded-full px-4 py-2.5 transition-all">
            <Search className="w-4 h-4 text-[#444746] mr-3 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in mail"
              className="w-full bg-transparent text-sm text-[#1f1f1f] placeholder-[#444746] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-full hover:bg-[#e8eaed] text-[#444746] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Disguised Apps Menu & Persona Switcher */}
        <DemoControlsMenu
          currentMailbox={currentMailbox}
          domain={domain}
          mailboxes={mailboxes}
          allUnreadCount={allUnreadCount}
          allTotalCount={allTotalCount}
          onSwitchMailbox={onSwitchMailbox}
          onLogout={onLogout}
          onSeedInbox={handleSeedInbox}
          onTriggerTestEmail={handleTriggerTestEmail}
          onClearMailbox={handleClearMailbox}
        />
      </header>

      {/* Main Content Area: Folder Rail + 2 Main Panes */}
      <div className="flex-1 flex min-h-0 pr-3 pb-3">
        {/* Left Folder Rail */}
        <aside
          className={`${
            sidebarCollapsed ? "w-16" : "w-60"
          } shrink-0 px-2 flex flex-col justify-between transition-all duration-150 select-none`}
        >
          <div>
            {/* Inert Vanity Compose Button */}
            <div className="mb-4 px-1">
              <button
                type="button"
                className={`flex items-center gap-3 bg-[#c2e7ff] hover:shadow-md text-[#001d35] font-medium text-sm rounded-2xl transition-all cursor-pointer ${
                  sidebarCollapsed
                    ? "w-12 h-12 justify-center"
                    : "px-5 py-4"
                }`}
              >
                <Pencil className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Compose</span>}
              </button>
            </div>

            {/* Folders */}
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const active = folder === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFolder(item.key)}
                    title={item.label}
                    className={`w-full flex items-center justify-between rounded-full text-sm transition-colors cursor-pointer ${
                      sidebarCollapsed
                        ? "w-10 h-10 mx-auto justify-center"
                        : "px-4 py-2"
                    } ${
                      active
                        ? "bg-[#d3e3fd] text-[#001d35] font-semibold"
                        : "text-[#444746] hover:bg-[#e8eaed]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!sidebarCollapsed &&
                      typeof item.badge === "number" &&
                      item.badge > 0 && (
                        <span className="text-xs font-semibold">
                          {item.badge}
                        </span>
                      )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 2 Main Panes Container (Split-pane list + reader) */}
        <main className="flex-1 flex min-w-0 bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-[#e1e5ea] overflow-hidden">
          {/* Pane 1: Email List */}
          <div className="w-[360px] md:w-[400px] lg:w-[440px] shrink-0 h-full">
            <EmailListPane
              emails={emails}
              selectedId={selectedId}
              selectedCheckedIds={selectedCheckedIds}
              folder={folder}
              isCatchAll={currentMailbox === "__all__"}
              isLoading={isLoadingList}
              onSelectEmail={handleSelectEmail}
              onToggleCheck={handleToggleCheck}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleStar={handleToggleStar}
              onRefresh={() => fetchEmailList(false)}
              onBulkMarkRead={handleBulkMarkRead}
              onBulkDelete={handleBulkDelete}
            />
          </div>

          {/* Pane 2: Email Reading Pane */}
          <div className="flex-1 min-w-0 h-full">
            <EmailReaderPane
              email={selectedEmail}
              isLoading={isLoadingDetail}
              onToggleStar={handleToggleStar}
              onMarkUnread={handleMarkUnread}
              onDelete={handleDeleteSingle}
            />
          </div>
        </main>
      </div>

      {/* Bottom-left Gmail-style toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-[#202124] text-white text-xs px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <span className="truncate">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#8ab4f8] hover:underline font-medium shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
