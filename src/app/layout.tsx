import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ServiceWorkerRegistration from "@/components/shared/ServiceWorkerRegistration";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noticias24h - Brasil e Mundo",
  description: "Portal de notícias atualizado 24 horas. Cobertura completa do Brasil e do mundo.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Noticias24h" },
};

export const viewport: Viewport = { 
  themeColor: "#ffffff", 
  width: "device-width", 
  initialScale: 1, 
  // Permitir zoom para acessibilidade (WCAG 1.4.4)
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
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
