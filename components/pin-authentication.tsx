"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2, User } from "lucide-react"
import { supabase, getCurrentUser } from "@/lib/supabase"
import Link from "next/link"

interface PinAuthenticationProps {
  isOpen: boolean
  onSuccess: (userData: any) => void  // Sekarang mengembalikan data user
  onCancel: () => void
  title?: string
  description?: string
}

export function PinAuthentication({
  isOpen,
  onSuccess,
  onCancel,
  title = "Autentikasi PIN",
  description = "Masukkan PIN 6 digit untuk melanjutkan"
}: PinAuthenticationProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [showPin, setShowPin] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lockoutCount, setLockoutCount] = useState(0) // Track berapa kali sudah terkena lockout
  const [showHelpInfo, setShowHelpInfo] = useState(false) // Tampilkan info bantuan
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const FIRST_MAX_ATTEMPTS = 5  // Percobaan pertama: 5 kali
  const SECOND_MAX_ATTEMPTS = 3 // Percobaan kedua: 3 kali
  const LOCK_DURATION = 180000 // 3 minutes in milliseconds

  // Tentukan max attempts berdasarkan lockout count
  const getCurrentMaxAttempts = () => {
    return lockoutCount === 0 ? FIRST_MAX_ATTEMPTS : SECOND_MAX_ATTEMPTS
  }

  useEffect(() => {
    if (isOpen) {
      // Reset state ketika modal dibuka
      setPin(["", "", "", "", "", ""])
      setAttempts(0)
      setIsLocked(false)
      setLockTimeRemaining(0)
      setIsLoading(false)
      setLockoutCount(0)
      setShowHelpInfo(false)

      // Focus ke input pertama
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isLocked && lockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setLockTimeRemaining(lockTimeRemaining - 1000)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isLocked && lockTimeRemaining <= 0) {
      setIsLocked(false)
      setAttempts(0)
      setPin(["", "", "", "", "", ""])
      // Jangan reset lockoutCount dan showHelpInfo agar tetap tahu ini percobaan kedua
    }
  }, [isLocked, lockTimeRemaining])

  // Fungsi untuk mencari user berdasarkan PIN - DISEDERHANAKAN
  const findUserByPin = async (pinValue: string): Promise<any> => {
    try {
      console.log('[PIN AUTH] Mencari user dengan PIN:', pinValue)

      // Query sederhana: cari user dengan PIN yang cocok
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pinValue)
        .limit(1)

      console.log('[PIN AUTH] Hasil pencarian:', data)

      // Jika ada data, ambil user pertama
      if (data && data.length > 0) {
        console.log('[PIN AUTH] ✅ User ditemukan:', data[0].name)
        return data[0]
      }

      console.log('[PIN AUTH] ❌ PIN tidak ditemukan di database')
      return null

    } catch (error) {
      console.error('[PIN AUTH] Error:', error)
      return null
    }
  }

  const handlePinChange = (index: number, value: string) => {
    if (isLocked || isLoading) return

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value

    setPin(newPin)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all fields are filled
    if (newPin.every((digit) => digit !== "") && newPin.join("").length === 6) {
      setTimeout(() => handleSubmit(newPin.join("")), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (isLocked || isLoading) return

    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        // Backspace ke input sebelumnya
        inputRefs.current[index - 1]?.focus()
      } else if (pin[index]) {
        // Clear current input
        const newPin = [...pin]
        newPin[index] = ""
        setPin(newPin)
      }
    }
  }

  const handleSubmit = async (pinValue?: string) => {
    if (isLocked || isLoading) return

    const currentPin = pinValue || pin.join("")
    const maxAttempts = getCurrentMaxAttempts()

    console.log('[PIN AUTH] Submitting PIN:', currentPin, 'Length:', currentPin.length)
    console.log('[PIN AUTH] Lockout count:', lockoutCount, 'Max attempts:', maxAttempts)

    if (currentPin.length !== 6) {
      toast({
        title: "PIN Tidak Lengkap",
        description: "Masukkan 6 digit PIN lengkap",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Cari user berdasarkan PIN
      const userData = await findUserByPin(currentPin)

      console.log('[PIN AUTH] Authentication result:', userData ? 'Success' : 'Failed')

      if (userData) {
        // PIN valid - kirim data user ke parent component
        toast({
          title: "Autentikasi Berhasil",
          description: `Selamat datang, ${userData.name || userData.email}!`,
        })
        onSuccess(userData)
      } else {
        // PIN tidak valid
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        console.log('[PIN AUTH] Failed attempts:', newAttempts, 'of', maxAttempts)

        if (newAttempts >= maxAttempts) {
          setIsLocked(true)
          setLockTimeRemaining(LOCK_DURATION)

          // Increment lockout count
          const newLockoutCount = lockoutCount + 1
          setLockoutCount(newLockoutCount)

          // Jika ini lockout kedua atau lebih, tampilkan info bantuan
          if (newLockoutCount >= 2) {
            setShowHelpInfo(true)
            toast({
              title: "Akses Diblokir",
              description: "Terlalu banyak percobaan gagal. Silakan hubungi admin untuk bantuan.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Akses Diblokir",
              description: `Terlalu banyak percobaan gagal. Coba lagi dalam 3 menit. Anda akan mendapat ${SECOND_MAX_ATTEMPTS} kesempatan lagi.`,
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "PIN Salah",
            description: `PIN tidak valid. Sisa percobaan: ${maxAttempts - newAttempts}`,
            variant: "destructive",
          })
        }

        // Clear PIN untuk percobaan berikutnya
        setPin(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      console.error("Authentication error:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat autentikasi. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Samakan perilaku tombol X dengan tombol Batal: selalu kembali ke menu sebelumnya
        onCancel()
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Memverifikasi PIN...</span>
            </div>
          )}

          {/* PIN Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Masukkan PIN</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowPin(!showPin)}
                disabled={isLoading}
              >
                {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              {pin.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el: HTMLInputElement | null) => {
                    inputRefs.current[index] = el
                  }}
                  type={showPin ? "text" : "password"}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold"
                  maxLength={1}
                  disabled={isLocked || isLoading}
                  inputMode="numeric"
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {/* Status Messages - Lockout dengan Info Bantuan */}
          {isLocked && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">Akses Diblokir</p>
                  <p className="text-red-600">Coba lagi dalam {formatTime(lockTimeRemaining)}</p>
                </div>
              </div>

              {/* Info Bantuan - Tampil setelah lockout kedua */}
              {showHelpInfo && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-900 mb-1">
                        Butuh Bantuan?
                      </h3>
                      <p className="text-xs text-amber-800 mb-2">
                        Jika Anda lupa PIN atau mengalami kendala, silakan hubungi admin untuk mendapatkan bantuan reset PIN.
                      </p>
                      <Link
                        href="https://www.instagram.com/bayuence_?igsh=MWFnNGEyc2xzcnBkOA=="
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Hubungi Admin untuk bantuan
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Info percobaan tersisa jika belum showHelpInfo */}
              {!showHelpInfo && lockoutCount === 1 && (
                <p className="text-xs text-center text-muted-foreground">
                  Setelah timer selesai, Anda akan mendapat {SECOND_MAX_ATTEMPTS} kesempatan terakhir.
                </p>
              )}
            </div>
          )}

          {!isLocked && attempts > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">PIN Salah</p>
                <p className="text-yellow-600">
                  Sisa percobaan: {getCurrentMaxAttempts() - attempts}
                  {lockoutCount > 0 && " (kesempatan terakhir)"}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 bg-transparent"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={() => handleSubmit()}
              className="flex-1 gap-2"
              disabled={isLocked || pin.join("").length !== 6 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <User className="h-4 w-4" />
              )}
              Masuk
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Gunakan PIN yang sudah terdaftar di sistem</p>
            <p>Semua user dengan PIN valid dapat mengakses</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}