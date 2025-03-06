import { Analytics } from "@vercel/analytics/react"
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

// ✅ Import fonts using `next/font/google`
import { Outfit, Quicksand } from "next/font/google"

// Load fonts with subsets for optimization
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "ProgressFlow",
  description: "Interactive flowchart teaching tool",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${quicksand.className} ${outfit.className}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
