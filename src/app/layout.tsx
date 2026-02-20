import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/dashboard/TopNav";
import SessionProvider from "@/components/SessionProvider";
import DittoChat from "@/components/shared/DittoChat";

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
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <SessionProvider>
          <TopNav />
          <main>
            {children}
          </main>
          <DittoChat />
        </SessionProvider>
      </body>
    </html>
  );
}
