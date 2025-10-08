"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { LayoutDashboard, ShoppingCart, Camera, TrendingDown, LogOut, ChevronLeft, ChevronRight, Users, CreditCard } from "lucide-react"

interface User {
  email: string
  role: string
}

interface SidebarProps {
  user: User
}

const menuItems = [
  {
    title: "Cashier System",
    icon: ShoppingCart,
    href: "/dashboard",
    description: "Sistem kasir utama",
    color: "text-red-400"
  },
  {
    title: "Pengeluaran",
    icon: TrendingDown,
    href: "/expenses",
    description: "Manajemen pengeluaran",
    color: "text-blue-400"
  },
  {
    title: "Presensi",
    icon: Camera,
    href: "/attendance",
    description: "Sistem presensi foto",
    color: "text-green-400"
  },
  {
    title: "Poin",
    icon: CreditCard,
    href: "/points",
    description: "Sistem poin pelanggan",
    color: "text-purple-400"
  },
  {
    title: "Kasbon",
    icon: Users,
    href: "/kasbon",
    description: "Manajemen kasbon",
    color: "text-orange-400"
  },
  {
    title: "Owner Dashboard",
    icon: LayoutDashboard,
    href: "/owner",
    description: "Dashboard lengkap owner",
    color: "text-cyan-400"
  },
]

export default  function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div
      className={`fixed top-0 left-0 bg-gradient-to-b from-red-900 via-red-800 to-black transition-all duration-300 relative ${
        collapsed ? "w-20" : "w-64"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Modern Toggle Button - Floating Circle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={`absolute -right-4 top-6 z-50 bg-red-700 text-white hover:bg-red-600 rounded-full p-2 shadow-xl border-2 border-red-600 transition-all duration-300 transform hover:scale-110 ${
          isHovered ? "opacity-100" : "opacity-90"
        }`}
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      <div className="flex flex-col h-full bg-gradient-to-b from-red-900 via-red-800 to-black"> {/* Tambahkan gradient di sini juga */}
        {/* Header dengan gradient yang sama */}
        <div 
          className="p-4 transition-all duration-500 shrink-0" // Hapus bg-gradient khusus
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <div className="flex items-center justify-center gap-3 transition-all duration-500">
            {/* Logo dengan efek interaktif */}
            <div className={`transition-all duration-500 ${
              logoHovered ? "scale-125" : "scale-100"
            }`}>
              <Image
                src="/images/pigtown-logo.png"
                alt="Pigtown Logo"
                width={logoHovered ? 48 : 40}
                height={logoHovered ? 48 : 40}
                className="object-contain transition-all duration-500"
              />
            </div>
            
            {/* Teks yang hide saat hover atau collapsed */}
            <div className={`transition-all duration-500 overflow-hidden ${
              collapsed || logoHovered ? "opacity-0 scale-95 w-0" : "opacity-100 scale-100 w-auto"
            }`}>
              <div className="text-center">
                <h2 className="font-bold text-white text-lg whitespace-nowrap">PIGTOWN</h2>
                <p className="text-xs text-red-300 whitespace-nowrap">BARBERSHOP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Container dengan gradient yang sama */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-3 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-14 transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? "bg-red-700/80 text-white border-2 border-red-600 shadow-lg"
                      : "text-red-200 hover:text-white hover:bg-red-800/50 border border-transparent hover:border-red-600/50"
                  } ${collapsed ? "px-2" : "px-4"} rounded-xl`}
                  onClick={() => router.push(item.href)}
                >
                  <IconComponent className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                  {!collapsed && (
                    <div className="flex-1 text-left transition-all duration-300">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-red-300/80">{item.description}</div>
                    </div>
                  )}
                </Button>
              )
            })}
          </nav>
        </div>

        {/* Logout Button dengan gradient yang sama */}
        <div className="p-3 shrink-0"> {/* Hapus bg-black/20 */}
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-12 text-red-200 hover:text-white hover:bg-red-800/50 border border-transparent hover:border-red-600/50 transition-all duration-300 transform hover:scale-105 rounded-xl ${
              collapsed ? "px-2 justify-center" : "px-4"
            }`}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-red-400" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}