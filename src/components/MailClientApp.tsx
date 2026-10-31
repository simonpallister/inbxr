"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { MailboxSummary } from "@/lib/db";
import {
  parseMailboxSegment,
  getMailboxPath,
  formatMailboxTitle,
} from "@/lib/mailbox-url";
import { LoginScreen } from "@/components/LoginScreen";
import { InboxShell } from "@/components/InboxShell";

interface MailClientAppProps {
  initialMailbox?: string | null;
}

const RECENT_MAILBOXES_STORAGE_KEY = "inbxr_recent_mailboxes";
const MAX_RECENT_MAILBOXES = 20;

function loadLocalRecentMailboxes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_MAILBOXES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => parseMailboxSegment(String(item)))
      .filter((m): m is string => Boolean(m && m !== "__all__"));
  } catch {
    return [];
  }
}

function saveLocalRecentMailbox(mailbox: string): string[] {
  const clean = parseMailboxSegment(mailbox);
  const current = loadLocalRecentMailboxes();
  if (!clean || clean === "__all__") return current;

  const updated = [clean, ...current.filter((m) => m !== clean)].slice(
    0,
    MAX_RECENT_MAILBOXES
  );
  try {
    window.localStorage.setItem(
      RECENT_MAILBOXES_STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // ignore storage errors
  }
  return updated;
}

function resolveMailboxFromWindow(): string | null {
  if (typeof window === "undefined") return null;

  const pathname = window.location.pathname;
  if (pathname && pathname !== "/") {
    const firstSegment = pathname.replace(/^\/+/, "").split("/")[0];
    const parsedFromPath = parseMailboxSegment(firstSegment);
    if (parsedFromPath) return parsedFromPath;
  }

  const params = new URLSearchParams(window.location.search);
  const queryCandidate =
    params.get("mailbox") ||
    params.get("inbox") ||
    params.get("address") ||
    params.get("to");
  if (queryCandidate) {
    const parsedFromQuery = parseMailboxSegment(queryCandidate);
    if (parsedFromQuery) return parsedFromQuery;
  }

  return null;
}

export function MailClientApp({ initialMailbox = null }: MailClientAppProps) {
  const [activeMailbox, setActiveMailbox] = useState<string | null>(
    initialMailbox
  );
  const [hydrated, setHydrated] = useState(Boolean(initialMailbox));
  const [domain, setDomain] = useState("inbxr.cloud");
  const [serverMailboxes, setServerMailboxes] = useState<MailboxSummary[]>([]);
  const [localRecentNames, setLocalRecentNames] = useState<string[]>([]);
  const [allUnreadCount, setAllUnreadCount] = useState(0);
  const [allTotalCount, setAllTotalCount] = useState(0);

  const fetchMailboxes = useCallback(async () => {
    try {
      const res = await fetch("/api/mailboxes");
      if (!res.ok) return;
      const data = await res.json();
      if (data.domain) setDomain(data.domain);
      setServerMailboxes(data.mailboxes || []);
      setAllUnreadCount(Number(data.allUnreadCount || 0));
      setAllTotalCount(Number(data.allTotalCount || 0));
    } catch {
      // ignore initial fetch error
    }
  }, []);

  useEffect(() => {
    const fromUrl = resolveMailboxFromWindow() ?? initialMailbox;
    const initialRecents =
      fromUrl && fromUrl !== "__all__"
        ? saveLocalRecentMailbox(fromUrl)
        : loadLocalRecentMailboxes();
    setLocalRecentNames(initialRecents);

    if (fromUrl) {
      setActiveMailbox(fromUrl);
      const canonicalPath = getMailboxPath(fromUrl);
      if (
        window.location.pathname !== canonicalPath ||
        window.location.search !== ""
      ) {
        window.history.replaceState(null, "", canonicalPath);
      }
    } else {
      setActiveMailbox(null);
    }
    fetchMailboxes();
    setHydrated(true);
  }, [initialMailbox, fetchMailboxes]);

  useEffect(() => {
    const handlePopState = () => {
      const fromUrl = resolveMailboxFromWindow();
      setActiveMailbox(fromUrl);
      if (fromUrl && fromUrl !== "__all__") {
        setLocalRecentNames(saveLocalRecentMailbox(fromUrl));
      }
      fetchMailboxes();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fetchMailboxes]);

  useEffect(() => {
    if (!activeMailbox) {
      document.title = formatMailboxTitle(null, 0);
    }
  }, [activeMailbox]);

  const handleLoginOrSwitch = async (username: string) => {
    const target =
      parseMailboxSegment(username) ??
      (username === "__all__" ? "__all__" : username.toLowerCase());
    const targetPath = getMailboxPath(target);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    setActiveMailbox(target);
    if (target !== "__all__") {
      setLocalRecentNames(saveLocalRecentMailbox(target));
    }
    await fetchMailboxes();
  };

  const handleLogout = () => {
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
    setActiveMailbox(null);
    document.title = formatMailboxTitle(null, 0);
    fetchMailboxes();
  };

  // Combine browser-local recent mailboxes with live server counts
  const mailboxesForDropdown = useMemo<MailboxSummary[]>(() => {
    const countsByUsername = new Map<string, MailboxSummary>();
    for (const m of serverMailboxes) {
      countsByUsername.set(m.username.toLowerCase(), m);
    }

    const orderedNames = [...localRecentNames];
    if (
      activeMailbox &&
      activeMailbox !== "__all__" &&
      !orderedNames.includes(activeMailbox)
    ) {
      orderedNames.unshift(activeMailbox);
    }

    return orderedNames.map((name) => {
      const serverStats = countsByUsername.get(name.toLowerCase());
      return {
        username: name,
        unreadCount: serverStats?.unreadCount ?? 0,
        totalCount: serverStats?.totalCount ?? 0,
        lastAccessedAt: serverStats?.lastAccessedAt ?? "",
      };
    });
  }, [localRecentNames, serverMailboxes, activeMailbox]);

  if (!hydrated) {
    return <div className="h-screen w-screen bg-[#f0f4f9]" />;
  }

  if (!activeMailbox) {
    return <LoginScreen domain={domain} onLogin={handleLoginOrSwitch} />;
  }

  return (
    <InboxShell
      currentMailbox={activeMailbox}
      domain={domain}
      mailboxes={mailboxesForDropdown}
      allUnreadCount={allUnreadCount}
      allTotalCount={allTotalCount}
      onSwitchMailbox={handleLoginOrSwitch}
      onLogout={handleLogout}
      onRefreshMailboxes={fetchMailboxes}
    />
  );
}
