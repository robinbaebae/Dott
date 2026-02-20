import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/dashboard/TopNav";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Ditto - Marketing AI Assistant",
  description: "AI assistant for solo marketers",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TopNav />
          <main>
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
