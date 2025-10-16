"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        // Handle specific error messages
        let errorMessage = error.message
        
        // Check for common error types
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Email atau password salah. Silakan coba lagi."
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Email belum diverifikasi. Periksa inbox Anda."
        }

        toast.error("Login Gagal", {
          description: errorMessage,
        })
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Get user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("email", data.user.email)
          .single()

        if (profileError) {
          toast.error("Error", {
            description: "Gagal mengambil data profil pengguna",
          })
          setIsLoading(false)
          return
        }

        // Store user session
        const userData = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          branch_id: userProfile.branch_id,
          loginTime: new Date().toISOString(),
        }

        localStorage.setItem("user", JSON.stringify(userData))

        toast.success("Login Berhasil", {
          description: `Selamat datang, ${userProfile.name}!`,
        })

        setTimeout(() => {
          router.push("/dashboard")
          setIsLoading(false)
        }, 100)
      }
    } catch (error) {
      console.error("Login error:", error)
      
      // Handle network errors specifically
      let errorMessage = "Terjadi kesalahan saat login"
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi."
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error("Koneksi Gagal", {
        description: errorMessage,
      })
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div>
      {/* Login Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Masuk Akun</h2>
        <p className="text-gray-600 text-sm">Silahkan masuk dengan akun Anda</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="user@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 transition-all duration-200 hover:border-gray-400"
            required
          />
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 pr-12 transition-all duration-200 hover:border-gray-400"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
              aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white mt-6 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </div>
          ) : (
            "Masuk Sekarang"
          )}
        </Button>
      </form>
    </div>
  )
}