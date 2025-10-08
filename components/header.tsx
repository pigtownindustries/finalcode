"use client"

import { useState, useEffect } from "react"

interface User {
  name: string
  email: string
  role: string
}

interface HeaderProps {
  user: User
}

export default function Header({ user }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }, 1000)

    // Handle scroll effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      clearInterval(timer)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <header className={`sticky top-0 z-40 px-6 py-4 transition-all duration-300 ${
      isScrolled 
        ? "bg-gradient-to-r from-red-900 via-red-800 to-black shadow-xl border-b border-red-900 backdrop-blur-sm" 
        : "bg-gradient-to-r from-red-900 via-red-800 to-black border-b border-red-800"
    }`}>
      <div className="flex items-center justify-between">
        {/* Welcome Message dengan efek interaktif */}
        <div className="group cursor-pointer">
          <h1 className="text-2xl font-bold text-white transition-all duration-300 group-hover:scale-105">
           {" "}
            <span className="text-white"> {/* Diubah jadi putih solid */}
              {user.name || user.email}!
            </span>
          </h1>
          <p className="text-sm text-red-300/80 transition-all duration-300 group-hover:text-red-200 mt-1">
            {currentTime}
          </p>
        </div>

        {/* Sisi kanan sengaja dikosongkan */}
        <div className="w-10"> {/* Spacer minimal untuk balance */}</div>
      </div>

      {/* Progress Bar untuk waktu (efek visual) */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-red-500 to-red-700 animate-pulse w-full opacity-60" />
    </header>
  )
}