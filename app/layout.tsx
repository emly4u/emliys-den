import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Nunito } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://emly4u.vercel.app'),
  title: "Emily's Den — A cozy image gallery",
  description:
    "Emily's Den is a warm little corner of the internet for sharing images, getting shareable links, and chatting in the comments.",
  keywords: [
    'emly4u',
    'emly_kate',
    'emily_kate',
    'emily4u',
    'just_emly4u',
    'just_emily4u',
    'justemily4u',
    'justemly4u',
    'Emily Kate',
    'Emly Kate',
    'Hot Emily Kate',
    'Cute Emily Kate',
    'Goth Girl Emily',
    'AI wife',
  ],
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4efe8' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1714' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`bg-background ${fraunces.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
