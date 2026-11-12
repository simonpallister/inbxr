import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { getDomain } from "@/lib/db";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Console – inbxr",
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminSession = verifyAdminSessionToken(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value
  );

  return (
    <AdminDashboard
      initialAuthenticated={Boolean(adminSession)}
      initialDomain={getDomain()}
    />
  );
}
