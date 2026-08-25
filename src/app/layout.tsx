import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Dashboard fonts (used by /os + /login via shadcn tokens)
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Portfolio fonts
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://sherrybuilds.com"),
  title: {
    default: "Shehryar Irfan — AI Automation Engineer · Berlin",
    template: "%s · Shehryar Irfan",
  },
  description:
    "AI Automation Engineer building production LLM systems — RAG pipelines, autonomous agents, full observability. Open to Werkstudent roles in Berlin.",
  openGraph: {
    title: "Shehryar Irfan — AI Automation Engineer · Berlin",
    description:
      "Production LLM systems — RAG pipelines, autonomous agents, full observability. Open to Werkstudent roles in Berlin.",
    url: "https://sherrybuilds.com",
    siteName: "Shehryar Irfan",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shehryar Irfan — AI Automation Engineer · Berlin",
    description:
      "Production LLM systems — RAG pipelines, autonomous agents, full observability.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
