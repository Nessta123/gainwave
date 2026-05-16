import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 🔥 POPRAVEK: Uporabili smo relativno pot (dve piki) namesto afne (@)
import { LanguageProvider } from "../context/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🔥 DODANO: Viewport konfiguracija za mobilne aplikacije (PWA)
export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prepreči nadležno zoomiranje ob klikanju na telefonu
};

export const metadata: Metadata = {
  title: "Gain Wave Terminal", 
  description: "Global Trading Node and Social Feed",
  // 🔥 DODANO: Povezava do manifesta in tvoje čiste ikone
  manifest: '/manifest.json',
  icons: {
    icon: '/AppIcon.png',   // 🔥 Zamenjano na .png (univerzalna podpora!)
    apple: '/AppIcon.png',  // 🔥 Zamenjano na .png
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}