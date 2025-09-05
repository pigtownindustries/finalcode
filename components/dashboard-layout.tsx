"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header" 
import { useIsMobile } from "@/hooks/use-mobile"

interface User {
  email: string
  role: string
  loginTime: string
  name?: string
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
    // Tambahkan delay kecil untuk animasi
    setTimeout(() => setIsLoaded(true), 100)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center transition-all duration-500">
        <div className="w-10 h-10 border-3 border-red-400/50 border-t-red-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 to-white transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} flex flex-col`}>
  <div className="flex flex-1 overflow-hidden">
    <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    <div className="flex-1 flex flex-col min-h-full">
      <Header user={user} />
      <main className="flex-1 overflow-auto p-4 md:p-6 transition-all duration-300">
        <div className="bg-white rounded-xl shadow-lg border border-red-100 p-4 md:p-6 transition-all duration-300 hover:shadow-xl hover:border-red-200 min-h-full">
          {children}
        </div>
      </main>
    </div>
  </div>
</div>
  )
}