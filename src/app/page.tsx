import React from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { MailClientApp } from "@/components/MailClientApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  return (
    <MailClientApp
      initialMailbox={null}
      initialStaffEmail={session?.email || null}
    />
  );
}
