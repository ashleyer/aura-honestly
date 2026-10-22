import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura, Honestly",
  description: "Aura readings as reflection, not perception. Show it something you chose; it tells you what it actually saw.",
};

export const viewport: Viewport = { themeColor: "#100f14", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Courier+Prime&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400;1,9..144,600&family=Inter:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
