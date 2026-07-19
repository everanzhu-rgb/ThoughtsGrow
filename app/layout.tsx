import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "序理 · 个人思维成长系统",
    description: "记录真实思考，重建思维结构，用证据看见长期成长。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "序理 · 个人思维成长系统",
      description: "记录真实思考，重建思维结构，用证据看见长期成长。",
      type: "website",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1536,
          height: 1024,
          alt: "序理 · 记录真实思考，用证据看见成长",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "序理 · 个人思维成长系统",
      description: "记录真实思考，重建思维结构，用证据看见长期成长。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
