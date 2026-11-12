"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Shield,
  Lock,
  ArrowRight,
  Search,
  RefreshCw,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Inbox,
  MailOpen,
  MailWarning,
  X,
} from "lucide-react";
import type { AdminMailboxRow } from "@/lib/db";
import { getMailboxPath } from "@/lib/mailbox-url";

interface AdminDashboardProps {
  initialAuthenticated: boolean;
  initialDomain: string;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;

  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(ts).toLocaleDateString();
}

export function AdminDashboard({
  initialAuthenticated,
  initialDomain,
}: AdminDashboardProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [domain, setDomain] = useState(initialDomain);

  // Login form state
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Table & filter state
  const [mailboxes, setMailboxes] = useState<AdminMailboxRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMailboxes, setTotalMailboxes] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "total" | "unread" | "alpha">(
    "recent"
  );
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(
    null
  );
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    totalMailboxesWithMail: 0,
    totalInboxEmails: 0,
    totalUnreadEmails: 0,
    totalReadEmails: 0,
    totalTrashEmails: 0,
  });

  const fetchMailboxes = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        sort,
        includeEmpty: includeEmpty ? "1" : "0",
      });

      const res = await fetch(`/api/admin/mailboxes?${params.toString()}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      if (data.domain) setDomain(data.domain);
      setMailboxes(data.mailboxes || []);
      setTotalMailboxes(Number(data.totalMailboxes || 0));
      setTotalPages(Number(data.totalPages || 1));
      if (data.summary) {
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, page, pageSize, search, sort, includeEmpty]);

  useEffect(() => {
    if (authenticated) {
      fetchMailboxes();
    }
  }, [authenticated, fetchMailboxes]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLoginError("Enter the admin password");
      return;
    }

    setLoginBusy(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setLoginError(data.error || "Invalid admin password");
        return;
      }

      setPassword("");
      setAuthenticated(true);
    } catch {
      setLoginError("Network error while logging in");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAuthenticated(false);
    setMailboxes([]);
  };

  const handleDeleteMailbox = async (username: string) => {
    setDeletingUser(username);
    try {
      const res = await fetch(
        `/api/admin/mailboxes?mailbox=${encodeURIComponent(username)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setConfirmDeleteUser(null);
        await fetchMailboxes();
      }
    } finally {
      setDeletingUser(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen w-full bg-[#f0f4f9] flex flex-col justify-center items-center p-6 select-text">
        <div className="w-full max-w-md bg-white rounded-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#e1e5ea] p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2.5 select-none">
              <div className="w-9 h-9 rounded-xl bg-[#0b57d0] flex items-center justify-center shadow-xs">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
                inbxr
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </span>
          </div>

          <h1 className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
            Admin Backdoor Login
          </h1>
          <p className="text-xs text-[#444746] mt-1 mb-6 leading-relaxed">
            Sign in with your administrator password to inspect all mailboxes
            and bypass Dotdigital staff OTP verification.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-medium text-[#444746] mb-2"
              >
                Admin password
              </label>
              <div
                className={`flex items-center rounded-xl border ${
                  loginError
                    ? "border-[#b3261e] ring-1 ring-[#b3261e]"
                    : "border-[#747775] focus-within:border-[#0b57d0] focus-within:ring-1 focus-within:ring-[#0b57d0]"
                } bg-white overflow-hidden transition-all`}
              >
                <Lock className="w-4 h-4 text-[#5f6368] ml-3.5 shrink-0" />
                <input
                  id="admin-password-input"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  placeholder="Enter ADMIN_PASSWORD"
                  className="w-full px-3.5 py-3 text-sm text-[#1f1f1f] placeholder-[#8e918f] focus:outline-none bg-transparent"
                />
              </div>
              {loginError && (
                <p className="mt-1.5 text-xs text-[#b3261e]">{loginError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-60 text-white font-medium text-sm px-6 py-3 rounded-full transition-colors cursor-pointer shadow-xs"
            >
              <span>{loginBusy ? "Signing in..." : "Unlock Admin & Inboxes"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f6f8fc] text-[#1f1f1f] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e1e5ea] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2.5 select-none hover:opacity-90"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0b57d0] flex items-center justify-center shadow-2xs">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-semibold text-[#1f1f1f] tracking-tight">
              inbxr
            </span>
          </a>
          <span className="text-[#dadce0]">/</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#0b57d0] text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-medium text-[#3c4043] transition-colors"
          >
            <span>Main Launcher (/)</span>
          </a>
          <a
            href="/all"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#d3e3fd] bg-[#e8f0fe] hover:bg-[#d3e3fd] text-xs font-semibold text-[#0b57d0] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Catch-All Inbox (/all)</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-red-50 hover:text-[#b3261e] hover:border-red-200 text-xs font-medium text-[#5f6368] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-[#e1e5ea] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
              <span>Active Mailboxes</span>
              <Inbox className="w-4 h-4 text-[#0b57d0]" />
            </div>
            <div className="text-2xl font-semibold text-[#1f1f1f]">
              {summary.totalMailboxesWithMail}
            </div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">
              @{domain} inboxes with messages
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e1e5ea] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
              <span>Total Inbox Emails</span>
              <Mail className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-semibold text-[#1f1f1f]">
              {summary.totalInboxEmails}
            </div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">
              +{summary.totalTrashEmails} in trash
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e1e5ea] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
              <span>Unread Emails</span>
              <MailWarning className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-semibold text-[#0b57d0]">
              {summary.totalUnreadEmails}
            </div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">
              Awaiting open in reading pane
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e1e5ea] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
              <span>Read Emails</span>
              <MailOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold text-emerald-700">
              {summary.totalReadEmails}
            </div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">
              Opened at least once
            </div>
          </div>
        </div>

        {/* Mailboxes Table Card */}
        <div className="bg-white rounded-2xl border border-[#e1e5ea] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-[#e1e5ea] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-[#f0f4f9] rounded-full px-3.5 py-2">
              <Search className="w-4 h-4 text-[#5f6368] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter mailboxes by username..."
                className="w-full bg-transparent text-xs text-[#1f1f1f] placeholder-[#5f6368] focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-[#5f6368] hover:text-[#1f1f1f] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 text-xs text-[#444746] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeEmpty}
                  onChange={(e) => {
                    setIncludeEmpty(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-[#747775] text-[#0b57d0] focus:ring-[#0b57d0]"
                />
                <span>Include empty visited mailboxes</span>
              </label>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(
                    e.target.value as "recent" | "total" | "unread" | "alpha"
                  );
                  setPage(1);
                }}
                className="text-xs border border-[#dadce0] rounded-full px-3 py-1.5 bg-white text-[#3c4043] focus:outline-none focus:border-[#0b57d0]"
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="total">Sort: Most Emails</option>
                <option value="unread">Sort: Most Unread</option>
                <option value="alpha">Sort: Alphabetical (A–Z)</option>
              </select>

              <button
                type="button"
                onClick={fetchMailboxes}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-medium text-[#3c4043] cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafd] border-b border-[#e1e5ea] text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
                  <th className="py-3 px-4">Mailbox</th>
                  <th className="py-3 px-4 text-center">Unread</th>
                  <th className="py-3 px-4 text-center">Read</th>
                  <th className="py-3 px-4 text-center">Total (Inbox)</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4] text-sm">
                {mailboxes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 px-4 text-center text-xs text-[#5f6368]"
                    >
                      {loading
                        ? "Loading mailboxes..."
                        : "No mailboxes match your current filter."}
                    </td>
                  </tr>
                ) : (
                  mailboxes.map((row) => {
                    const inboxHref = getMailboxPath(row.username);
                    const lastActivity = row.lastEmailAt || row.lastAccessedAt;
                    const isConfirming = confirmDeleteUser === row.username;

                    return (
                      <tr
                        key={row.username}
                        className="hover:bg-[#f8fafd] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#0b57d0] font-semibold text-xs flex items-center justify-center shrink-0">
                              {row.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <a
                                href={inboxHref}
                                className="font-semibold text-[#1f1f1f] hover:text-[#0b57d0] hover:underline font-mono text-xs sm:text-sm"
                              >
                                {row.username}
                              </a>
                              <div className="text-[11px] text-[#5f6368] font-mono">
                                {row.username}@{domain}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {row.unreadCount > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-[#0b57d0] text-white text-xs font-semibold">
                              {row.unreadCount}
                            </span>
                          ) : (
                            <span className="text-xs text-[#8e918f]">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {row.readCount > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                              {row.readCount}
                            </span>
                          ) : (
                            <span className="text-xs text-[#8e918f]">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-xs text-[#1f1f1f]">
                            {row.totalInboxCount}
                          </span>
                          {row.trashCount > 0 && (
                            <span className="ml-1.5 text-[11px] text-[#5f6368]">
                              (+{row.trashCount} trash)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-[#444746]">
                          <div>{formatRelativeTime(lastActivity)}</div>
                          {lastActivity && (
                            <div className="text-[10px] text-[#8e918f]">
                              {new Date(lastActivity).toLocaleString()}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <a
                              href={inboxHref}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e8f0fe] hover:bg-[#d3e3fd] text-[#0b57d0] text-xs font-medium transition-colors"
                            >
                              <span>Open Inbox</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {!isConfirming ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteUser(row.username)
                                }
                                title={`Delete ${row.username} mailbox`}
                                className="p-1.5 rounded-full text-[#5f6368] hover:text-[#b3261e] hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-1">
                                <button
                                  type="button"
                                  disabled={deletingUser === row.username}
                                  onClick={() =>
                                    handleDeleteMailbox(row.username)
                                  }
                                  className="text-[11px] font-semibold text-[#b3261e] hover:underline px-1 cursor-pointer"
                                >
                                  {deletingUser === row.username
                                    ? "..."
                                    : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUser(null)}
                                  className="text-[11px] text-[#5f6368] hover:text-[#1f1f1f] px-1 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-[#f8fafd] border-t border-[#e1e5ea] flex flex-wrap items-center justify-between gap-3 text-xs text-[#444746]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#1f1f1f]">
                {mailboxes.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#1f1f1f]">
                {(page - 1) * pageSize + mailboxes.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#1f1f1f]">
                {totalMailboxes}
              </span>{" "}
              mailboxes
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] disabled:opacity-50 text-xs font-medium cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] disabled:opacity-50 text-xs font-medium cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
