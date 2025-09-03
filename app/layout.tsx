import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'PIGTOWN BARBERSHOP',
  description: 'Sistem manajemen modern untuk Pigtown Barbershop',
  
  // 🔑 Kode verifikasi Google Search Console ditambahkan di sini
  verification: {
    google: '4oRTIgQQMaRiefHG76icRvGzdI1bZVCJNCzEhPayLdc',
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