import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Tickets",
  description: "Pick your seats and book tickets for upcoming events",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Event Tickets</Link>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
