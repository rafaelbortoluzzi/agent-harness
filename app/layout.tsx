import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  JetBrains_Mono,
  VT323,
} from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] })
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '700'],
  subsets: ['latin'],
})
const vt323 = VT323({ variable: '--font-vt323', weight: '400', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Agent Harness',
  description: 'Local-first AI agent environment manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrains.variable} ${plexMono.variable} ${vt323.variable} h-full antialiased dark`}
    >
      <body className="ah-body">{children}</body>
    </html>
  )
}
