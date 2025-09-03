import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'PIGTOWN BARBERSHOP',
  description: 'Sistem manajemen modern untuk Pigtown Barbershop',
  // 🔑 Tambahkan meta verifikasi GSC di sini
  other: {
    "google-site-verification": "kode-verifikasi-unik", // ganti dengan kode dari GSC
  },
  icons: {
    icon: [
      {
        url: '/images/pigtown-logo.png', // Path ke logo Pigtown
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/images/pigtown-logo.png', // Untuk perangkat Apple
        type: 'image/png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${GeistSans.className} ${GeistMono.className}`}>
      <head />
      <body>{children}</body>
    </html>
  )
}