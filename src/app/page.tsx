"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { MailboxSummary } from "@/lib/db";
import { LoginScreen } from "@/components/LoginScreen";
import { InboxShell } from "@/components/InboxShell";

const STORAGE_KEY = "martech_demo_active_mailbox";

export default function HomePage() {
  const [activeMailbox, setActiveMailbox] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
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

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveMailbox(saved);
    }
    setHydrated(true);
    fetchMailboxes();
  }, [fetchMailboxes]);

  const handleLoginOrSwitch = async (username: string) => {
    const target = username === "__all__" ? "__all__" : username.toLowerCase();
    if (target !== "__all__") {
      try {
        const res = await fetch("/api/mailboxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: target }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.username) {
            window.localStorage.setItem(STORAGE_KEY, data.username);
            setActiveMailbox(data.username);
            setMailboxes(data.mailboxes || []);
            setAllUnreadCount(Number(data.allUnreadCount || 0));
            setAllTotalCount(Number(data.allTotalCount || 0));
            return;
          }
        }
      } catch {
        // fallback below
      }
    }
    window.localStorage.setItem(STORAGE_KEY, target);
    setActiveMailbox(target);
    fetchMailboxes();
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveMailbox(null);
    fetchMailboxes();
  };

  if (!hydrated) {
    return <div className="h-screen w-screen bg-[#f0f4f9]" />;
  }

  if (!activeMailbox) {
    return (
      <LoginScreen
        domain={domain}
        recentMailboxes={mailboxes}
        allUnreadCount={allUnreadCount}
        onLogin={handleLoginOrSwitch}
      />
    );
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
      onDomainUpdated={setDomain}
      onRefreshMailboxes={fetchMailboxes}
    />
  );
}
