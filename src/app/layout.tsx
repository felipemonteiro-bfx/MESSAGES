import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { BottomNav } from "@/components/shared/BottomNav";
import { CommandPalette } from "@/components/shared/CommandPalette";
import DisguiseProvider from "@/components/shared/DisguiseProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardião de Notas - Gestão Patrimonial IA",
  description: "O seu consultor inteligente de garantias, seguros e patrimônio durável.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Guardião",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <DisguiseProvider>
          <CommandPalette />
          {children}
          <BottomNav />
          <Toaster position="top-center" richColors />
        </DisguiseProvider>
      </body>
    </html>
  );
}
