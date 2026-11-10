import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cookieTheme, currentUser, uiLang } from "@/lib/session";
import "./globals.css";

const uiSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Spend Traker",
  description: "Tus compras, SINPE y pagos del BAC anotados solos en tu presupuesto.",
};

export const viewport: Viewport = {
  themeColor: "#0F4C5C",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const lang = await uiLang(user);
  const theme = await cookieTheme();
  return (
    <html lang={lang} className={`${uiSans.variable} ${uiMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
