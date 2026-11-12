import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getStaffOrAdminSessionFromCookies } from "@/lib/auth";
import { listEmails } from "@/lib/db";
import {
  parseMailboxSegment,
  formatMailboxTitle,
} from "@/lib/mailbox-url";
import { MailClientApp } from "@/components/MailClientApp";

export const dynamic = "force-dynamic";

interface MailboxPageProps {
  params: Promise<{ mailbox: string }>;
}

export async function generateMetadata({
  params,
}: MailboxPageProps): Promise<Metadata> {
  const { mailbox } = await params;
  const parsed = parseMailboxSegment(mailbox);
  if (!parsed) {
    return { title: "inbxr" };
  }

  const cookieStore = await cookies();
  const session = getStaffOrAdminSessionFromCookies(cookieStore);
  if (!session) {
    return { title: "Sign in – inbxr" };
  }

  let unreadCount = 0;
  try {
    unreadCount = listEmails({ mailbox: parsed, folder: "inbox" }).unreadCount;
  } catch {
    // ignore db error during metadata generation
  }

  return {
    title: formatMailboxTitle(parsed, unreadCount),
  };
}

export default async function MailboxPage({ params }: MailboxPageProps) {
  const { mailbox } = await params;
  const parsed = parseMailboxSegment(mailbox);

  if (!parsed) {
    notFound();
  }

  const cookieStore = await cookies();
  const session = getStaffOrAdminSessionFromCookies(cookieStore);

  return (
    <MailClientApp
      initialMailbox={parsed}
      initialStaffEmail={session?.email || null}
    />
  );
}
