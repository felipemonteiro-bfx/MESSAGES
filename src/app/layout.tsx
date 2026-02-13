import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ServiceWorkerRegistration from "@/components/shared/ServiceWorkerRegistration";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Notícias em Tempo Real",
  description: "Sua fonte diária de notícias e atualizações.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Notícias" },
};

export const viewport: Viewport = { 
  themeColor: "#ffffff", 
  width: "device-width", 
  initialScale: 1, 
  maximumScale: 1, 
  userScalable: false 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="light" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegistration />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
