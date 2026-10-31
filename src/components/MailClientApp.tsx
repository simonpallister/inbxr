"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([]);
  const [allUnreadCount, setAllUnreadCount] = useState(0);
  const [allTotalCount, setAllTotalCount] = useState(0);

  const fetchMailboxes = useCallback(async () => {
    try {
      const res = await fetch("/api/mailboxes");
      if (!res.ok) return;
      const data = await res.json();
      if (data.domain) setDomain(data.domain);
      setMailboxes(data.mailboxes || []);
      setAllUnreadCount(Number(data.allUnreadCount || 0));
      setAllTotalCount(Number(data.allTotalCount || 0));
    } catch {
      // ignore initial fetch error
    }
  }, []);

  const registerAndFetchMailbox = useCallback(
    async (mailbox: string) => {
      if (mailbox === "__all__") {
        await fetchMailboxes();
        return;
      }
      try {
        const res = await fetch("/api/mailboxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: mailbox }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.domain) setDomain(data.domain);
          setMailboxes(data.mailboxes || []);
          setAllUnreadCount(Number(data.allUnreadCount || 0));
          setAllTotalCount(Number(data.allTotalCount || 0));
          return;
        }
      } catch {
        // fallback below
      }
      await fetchMailboxes();
    },
    [fetchMailboxes]
  );

  useEffect(() => {
    const fromUrl = resolveMailboxFromWindow() ?? initialMailbox;
    if (fromUrl) {
      setActiveMailbox(fromUrl);
      const canonicalPath = getMailboxPath(fromUrl);
      if (
        window.location.pathname !== canonicalPath ||
        window.location.search !== ""
      ) {
        window.history.replaceState(null, "", canonicalPath);
      }
      registerAndFetchMailbox(fromUrl);
    } else {
      setActiveMailbox(null);
      fetchMailboxes();
    }
    setHydrated(true);
  }, [initialMailbox, fetchMailboxes, registerAndFetchMailbox]);

  useEffect(() => {
    const handlePopState = () => {
      const fromUrl = resolveMailboxFromWindow();
      setActiveMailbox(fromUrl);
      if (fromUrl) {
        registerAndFetchMailbox(fromUrl);
      } else {
        fetchMailboxes();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fetchMailboxes, registerAndFetchMailbox]);

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
    await registerAndFetchMailbox(target);
  };

  const handleLogout = () => {
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
    setActiveMailbox(null);
    document.title = formatMailboxTitle(null, 0);
    fetchMailboxes();
  };

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
      mailboxes={mailboxes}
      allUnreadCount={allUnreadCount}
      allTotalCount={allTotalCount}
      onSwitchMailbox={handleLoginOrSwitch}
      onLogout={handleLogout}
      onRefreshMailboxes={fetchMailboxes}
    />
  );
}
