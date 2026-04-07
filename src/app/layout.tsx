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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
                if (settings.theme === 'light' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
                if (settings.themeColor && settings.themeColor !== '#818CF8') {
                  document.documentElement.style.setProperty('--accent', settings.themeColor);
                  document.documentElement.style.setProperty('--gradient-accent', 'linear-gradient(135deg, ' + settings.themeColor + ' 0%, #C084FC 100%)');
                }
                if (settings.fontFamily) {
                  document.documentElement.style.setProperty('--font-body', settings.fontFamily);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
