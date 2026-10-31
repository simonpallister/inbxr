import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mail",
  description: "Webmail client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
