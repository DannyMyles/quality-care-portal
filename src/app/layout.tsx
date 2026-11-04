import type { Metadata } from "next"
import { Poppins, Comfortaa } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const poppins = Poppins({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Quality Care Portal",
  description: "Daily work and insight for Quality Care Trainers",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${comfortaa.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
