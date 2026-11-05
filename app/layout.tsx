import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookieTheme, currentUser, uiLang } from "@/lib/session";
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
  title: "Spend Traker",
  description: "Tus compras, SINPE y pagos del BAC anotados solos en tu presupuesto.",
};

export const viewport: Viewport = {
  themeColor: "#0F4C5C",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const lang = await uiLang(user);
  const theme = await cookieTheme();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
