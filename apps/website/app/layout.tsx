import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "agentcmd - AI Coding Workflow Orchestration Platform",
  description:
    "Build AI coding workflows that actually work. Orchestrate AI agents with powerful workflow automation.",
  openGraph: {
    title: "agentcmd - AI Coding Workflow Orchestration Platform",
    description:
      "Build AI coding workflows that actually work. Orchestrate AI agents with powerful workflow automation.",
    images: ["/screenshots/workflows-dashboard.png"],
  },
  icons: [
    {
      rel: "icon",
      type: "image/svg+xml",
      sizes: "16x16",
      url: "/favicon-16.svg",
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      sizes: "32x32",
      url: "/favicon-32.svg",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <RootProvider>{children}</RootProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
