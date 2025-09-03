"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Shield, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"

interface PinAuthenticationProps {
  isOpen: boolean
  onSuccess: () => void
  onCancel: () => void
}

export function PinAuthentication({ isOpen, onSuccess, onCancel }: PinAuthenticationProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [showPin, setShowPin] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const OWNER_PIN = "354313"
  const MAX_ATTEMPTS = 3
  const LOCK_DURATION = 300000 // 5 minutes in milliseconds

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
    }
  }, [isLocked, lockTimeRemaining])

  const handlePinChange = (index: number, value: string) => {
    if (isLocked) return

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
    if (isLocked) return

    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = (pinValue?: string) => {
    if (isLocked) return

    const currentPin = pinValue || pin.join("")

    if (currentPin.length !== 6) {
      toast({
        title: "PIN Tidak Lengkap",
        description: "Masukkan 6 digit PIN",
        variant: "destructive",
      })
      return
    }

    if (currentPin === OWNER_PIN) {
      toast({
        title: "Autentikasi Berhasil",
        description: "Selamat datang, Owner!",
      })
      onSuccess()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true)
        setLockTimeRemaining(LOCK_DURATION)
        toast({
          title: "Akses Diblokir",
          description: "Terlalu banyak percobaan gagal. Coba lagi dalam 5 menit.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "PIN Salah",
          description: `PIN tidak valid. Sisa percobaan: ${MAX_ATTEMPTS - newAttempts}`,
          variant: "destructive",
        })
      }

      // Clear PIN
      setPin(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
  <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
            Autentikasi Owner
          </DialogTitle>
          <DialogDescription className="text-center">
            Masukkan PIN 6 digit untuk mengakses dashboard owner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* PIN Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">PIN Owner</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPin(!showPin)}>
                {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              {pin.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el: HTMLInputElement | null) => {
                    inputRefs.current[index] = el;
                  }}
                  type={showPin ? "text" : "password"}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold"
                  maxLength={1}
                  disabled={isLocked}
                />
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {isLocked && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Akses Diblokir</p>
                <p className="text-red-600">Coba lagi dalam {formatTime(lockTimeRemaining)}</p>
              </div>
            </div>
          )}

          {!isLocked && attempts > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">PIN Salah</p>
                <p className="text-yellow-600">Sisa percobaan: {MAX_ATTEMPTS - attempts}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
              Batal
            </Button>
            <Button
              onClick={() => handleSubmit()}
              className="flex-1 gap-2"
              disabled={isLocked || pin.join("").length !== 6}
            >
              <Shield className="h-4 w-4" />
              Masuk
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
