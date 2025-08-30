import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kelly Yu Updates Hub | Global Fan Hub',
  description: 'Follow Kelly Yu Wenwen (于文文) across all platforms - Weibo, Douyin, Instagram, and more. Your one-stop destination for the latest updates.',
  keywords: ['Kelly Yu Wenwen', '于文文', 'Kelly Yu', 'Chinese singer', 'Weibo', 'Douyin', 'Instagram', 'updates'],
  authors: [{ name: 'Kelly Updates Hub' }],
  openGraph: {
    title: 'Kelly Yu Updates Hub',
    description: 'Follow Kelly Yu Wenwen across all social media platforms',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'zh_CN'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kelly Yu Updates Hub',
    description: 'Follow Kelly Yu Wenwen across all social media platforms'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  verification: {
    google: 'your-google-verification-code'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}