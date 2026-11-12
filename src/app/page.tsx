import React from "react";
import { cookies } from "next/headers";
import { getStaffOrAdminSessionFromCookies } from "@/lib/auth";
import { MailClientApp } from "@/components/MailClientApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = getStaffOrAdminSessionFromCookies(cookieStore);

  return (
    <MailClientApp
      initialMailbox={null}
      initialStaffEmail={session?.email || null}
    />
  );
}
