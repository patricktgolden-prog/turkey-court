import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Nunito_Sans } from "next/font/google"
import "./globals.css"

const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" })
const body = Nunito_Sans({ subsets: ["latin"], variable: "--font-body" })

export const metadata: Metadata = {
  title: "Turkey Pardon Court · Ship AI Starter",
  description:
    "File a case for your turkey and an AI judge rules: pardoned or dinner. Built the safe way: sign-in, row rules, a server-side AI call, and a guardrail.",
}

export const viewport: Viewport = {
  themeColor: "#f8ecd4",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} bg-background`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  )
}
