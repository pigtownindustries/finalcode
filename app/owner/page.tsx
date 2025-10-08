"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { OwnerDashboard } from "@/components/owner-dashboard"
import { PinAuthentication } from "@/components/pin-authentication"

export default function OwnerDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(true)

  useEffect(() => {
    // Always require PIN authentication - no persistence
    setIsAuthenticated(false)
    setShowPinDialog(true)

    // Clear any existing authentication data
    localStorage.removeItem("owner_auth_time")

    // Clear authentication when component unmounts (user navigates away)
    return () => {
      setIsAuthenticated(false)
    }
  }, [])

  const handlePinSuccess = () => {
    setIsAuthenticated(true)
    setShowPinDialog(false)
  }

  const handleCancel = () => {
    setIsAuthenticated(false)
    setShowPinDialog(true)
    window.history.back()
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <PinAuthentication isOpen={showPinDialog} onSuccess={handlePinSuccess} onCancel={handleCancel} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <OwnerDashboard />
    </DashboardLayout>
  )
}
