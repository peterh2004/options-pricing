import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vol Lab · Options Pricing & Strategy Analytics",
  description:
    "Black-Scholes, binomial trees, Monte Carlo, implied vol surfaces, and multi-leg strategy analytics. Built for traders and quants.",
};

// Runs before React hydrates. Reads the saved theme and sets the .dark class.
// Default is dark; we only flip to light if explicitly set. Prevents flash.
const THEME_FOUC_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('vollab-theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default class is `dark`; the FOUC script may remove it if user picked light.
  return (
    <html lang="en" className={`dark ${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_FOUC_SCRIPT }} />
      </head>
      <body className="font-sans bg-ink-950 text-ink-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
