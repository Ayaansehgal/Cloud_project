import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CloudVCS - Cloud-Native Version Control',
  description: 'AI-powered cloud-native version control system with blockchain integrity, real-time collaboration, and intelligent code review.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
