"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  Camera,
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  Play,
  Calendar,
  MapPin,
  LogOut,
  Users,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  branch: string
  branchId: string
  date: string
  shift: "pagi" | "siang" | "malam"
  checkIn?: string
  checkOut?: string
  breakStart?: string
  breakEnd?: string
  totalBreakTime: number
  totalWorkingHours: number
  status: "present" | "absent" | "late" | "on-break" | "checked-out"
  photo?: string
  location: string
}

interface DailyAttendanceSummary {
  employeeId: string
  employeeName: string
  date: string
  shifts: AttendanceRecord[]
  totalDailyHours: number
  totalDailyBreaks: number
  currentStatus: "present" | "absent" | "on-break" | "checked-out"
  canCheckIn: boolean // Can check in to new branch/shift
}

interface Employee {
  id: string
  name: string
  position: string
  branch: string
  branchId: string
  avatar?: string
  selectedBranch?: string
}

interface Branch {
  id: string
  name: string
}

interface BranchShift {
  id: string
  name: string
  start_time: string
  end_time: string
  type: string
  startTime?: string
  endTime?: string
}

async function getBranchShifts(branchId: string): Promise<{ data: BranchShift[] | null; error: any }> {
  try {
    const { data: branchData, error } = await supabase
      .from("branches")
      .select("shifts, operating_hours")
      .eq("id", branchId)
      .single()

    if (error) {
      console.error("Error fetching branch data:", error)
      return { data: null, error }
    }

    // Parse shifts from JSON column
    let shifts: BranchShift[] = []

    if (branchData?.shifts && Array.isArray(branchData.shifts) && branchData.shifts.length > 0) {
      shifts = branchData.shifts
    } else if (branchData?.operating_hours) {
      // Create default shifts based on operating hours if no specific shifts defined
      const { open, close } = branchData.operating_hours
      shifts = [
        {
          id: "1",
          name: "Shift Pagi",
          start_time: open || "09:00",
          end_time: close || "21:00",
          type: "pagi",
        },
      ]
    }

    console.log("[v0] Loaded shifts from database:", shifts)
    return { data: shifts, error: null }
  } catch (error) {
    console.error("Error in getBranchShifts:", error)
    return { data: null, error }
  }
}

export function AttendanceSystem() {
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false) // Renamed from isShiftDialogOpen
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedShift, setSelectedShift] = useState<"pagi" | "siang" | "malam">("pagi")
  const [selectedCheckInBranch, setSelectedCheckInBranch] = useState("") // Added for check-in branch selection
  const [attendanceAction, setAttendanceAction] = useState<"check-in" | "check-out" | "break-start" | "break-end">(
    "check-in",
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraStoppedRef = useRef(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [dailySummaries, setDailySummaries] = useState<DailyAttendanceSummary[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchShifts, setBranchShifts] = useState<BranchShift[]>([])
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [branchIdMap, setBranchIdMap] = useState<Map<string, string>>(new Map())
  const [isBranchWarningOpen, setIsBranchWarningOpen] = useState(false)

  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking")
  const [showCameraPermissionDialog, setShowCameraPermissionDialog] = useState(false)

  const loadEmployeesAndBranches = useCallback(async () => {
    try {
      const { data: usersData, error: usersError } = await supabase.from("users").select("*").eq("status", "active")

      if (usersError) {
        console.error("Error loading users:", usersError)
        const fallbackBranchIdMap = new Map([
          ["Cabang Sudirman", "branch-1"],
          ["Cabang Kemang", "branch-2"],
          ["Cabang Senayan", "branch-3"],
          ["Cabang Kelapa Gading", "branch-4"],
        ])
        setBranchIdMap(fallbackBranchIdMap)

        setEmployees([
          { id: "1", name: "Ahmad Rizki", position: "Manager", branch: "Cabang Sudirman", branchId: "branch-1" },
          { id: "2", name: "Budi Santoso", position: "Senior Barber", branch: "Cabang Kemang", branchId: "branch-2" },
          { id: "3", name: "Dedi Kurniawan", position: "Barber", branch: "Cabang Senayan", branchId: "branch-3" },
          {
            id: "4",
            name: "Eko Prasetyo",
            position: "Junior Barber",
            branch: "Cabang Kelapa Gading",
            branchId: "branch-4",
          },
          { id: "5", name: "Fajar Nugroho", position: "Barber", branch: "Cabang Sudirman", branchId: "branch-1" },
        ])
        setBranches([
          { id: "branch-1", name: "Cabang Sudirman" },
          { id: "branch-2", name: "Cabang Kemang" },
          { id: "branch-3", name: "Cabang Senayan" },
          { id: "branch-4", name: "Cabang Kelapa Gading" },
        ])
        return
      }

      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .eq("status", "active")

      const branchNameMap = new Map()
      const branchIdMap = new Map()
      if (!branchesError && branchesData && branchesData.length > 0) {
        branchesData.forEach((branch: any) => {
          branchNameMap.set(branch.id, branch.name)
          branchIdMap.set(branch.name, branch.id) // Map name to ID for reverse lookup
        })
        const branchList = branchesData.map((b: any) => ({ id: b.id, name: b.name }))
        setBranches(branchList)
        setBranchIdMap(branchIdMap)
      } else {
        const fallbackBranchIdMap = new Map([
          ["Cabang Sudirman", "branch-1"],
          ["Cabang Kemang", "branch-2"],
          ["Cabang Senayan", "branch-3"],
          ["Cabang Kelapa Gading", "branch-4"],
        ])
        setBranchIdMap(fallbackBranchIdMap)
        setBranches([
          { id: "branch-1", name: "Cabang Sudirman" },
          { id: "branch-2", name: "Cabang Kemang" },
          { id: "branch-3", name: "Cabang Senayan" },
          { id: "branch-4", name: "Cabang Kelapa Gading" },
        ])
      }

      if (usersData && usersData.length > 0) {
        const employeeList = usersData.map((user: any) => ({
          id: user.id,
          name: user.name,
          position: user.role || "Employee",
          branch: branchNameMap.get(user.branch_id) || "Unknown Branch",
          branchId: user.branch_id, // Store the actual branch UUID
          avatar: user.avatar,
        }))
        setEmployees(employeeList)
      } else {
        setEmployees([
          { id: "1", name: "Ahmad Rizki", position: "Manager", branch: "Cabang Sudirman", branchId: "branch-1" },
          { id: "2", name: "Budi Santoso", position: "Senior Barber", branch: "Cabang Kemang", branchId: "branch-2" },
          { id: "3", name: "Dedi Kurniawan", position: "Barber", branch: "Cabang Senayan", branchId: "branch-3" },
          {
            id: "4",
            name: "Eko Prasetyo",
            position: "Junior Barber",
            branch: "Cabang Kelapa Gading",
            branchId: "branch-4",
          },
          { id: "5", name: "Fajar Nugroho", position: "Barber", branch: "Cabang Sudirman", branchId: "branch-1" },
        ])
      }
    } catch (error) {
      console.error("Error loading employees and branches:", error)
      const fallbackBranchIdMap = new Map([
        ["Cabang Sudirman", "branch-1"],
        ["Cabang Kemang", "branch-2"],
        ["Cabang Senayan", "branch-3"],
        ["Cabang Kelapa Gading", "branch-4"],
      ])
      setBranchIdMap(fallbackBranchIdMap)

      setEmployees([
        { id: "1", name: "Ahmad Rizki", position: "Manager", branch: "Cabang Sudirman", branchId: "branch-1" },
        { id: "2", name: "Budi Santoso", position: "Senior Barber", branch: "Cabang Kemang", branchId: "branch-2" },
        { id: "3", name: "Dedi Kurniawan", position: "Barber", branch: "Cabang Senayan", branchId: "branch-3" },
        {
          id: "4",
          name: "Eko Prasetyo",
          position: "Junior Barber",
          branch: "Cabang Kelapa Gading",
          branchId: "branch-4",
        },
        { id: "5", name: "Fajar Nugroho", position: "Barber", branch: "Cabang Sudirman", branchId: "branch-1" },
      ])
      setBranches([
        { id: "branch-1", name: "Cabang Sudirman" },
        { id: "branch-2", name: "Cabang Kemang" },
        { id: "branch-3", name: "Cabang Senayan" },
        { id: "branch-4", name: "Cabang Kelapa Gading" },
      ])
    }
  }, [])

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
        *,
        branches:branch_id (
          id,
          name,
          shifts
        )
      `)
        .eq("date", selectedDate)

      if (error) {
        console.error("Error fetching attendance:", error)
        return
      }

      setAttendanceRecords(data || [])

      const employeeAttendanceMap = new Map()

      // Group attendance records by employee
      data?.forEach((record: any) => {
        const empId = record.user_id
        if (!employeeAttendanceMap.has(empId)) {
          employeeAttendanceMap.set(empId, [])
        }
        employeeAttendanceMap.get(empId).push(record)
      })

      const summaries = employees.map((emp) => {
        const employeeAttendance = employeeAttendanceMap.get(emp.id) || []

        const shifts: AttendanceRecord[] = employeeAttendance.map((attendanceData: any) => {
          let status: "present" | "absent" | "late" | "on-break" | "checked-out" = "absent"

          // Determine status based on current state
          if (attendanceData.status === "checked_in" && !attendanceData.check_out_time) {
            status = "present"
          } else if (attendanceData.status === "on_break") {
            status = "on-break"
          } else if (attendanceData.check_out_time) {
            status = "checked-out"
          } else {
            status = "absent"
          }

          let totalWorkingHours = 0
          if (attendanceData.check_in_time && attendanceData.check_out_time) {
            const checkIn = new Date(attendanceData.check_in_time)
            const checkOut = new Date(attendanceData.check_out_time)
            const workMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60)
            const breakMinutes = attendanceData.total_break_minutes || 0
            totalWorkingHours = Math.max(0, (workMinutes - breakMinutes) / 60)
          } else if (attendanceData.check_in_time && !attendanceData.check_out_time) {
            // Calculate current working hours for active shifts
            const checkIn = new Date(attendanceData.check_in_time)
            const now = new Date()
            const workMinutes = (now.getTime() - checkIn.getTime()) / (1000 * 60)
            const breakMinutes = attendanceData.total_break_minutes || 0
            totalWorkingHours = Math.max(0, (workMinutes - breakMinutes) / 60)
          }

          let totalBreakMinutes = attendanceData.total_break_minutes || 0
          if (attendanceData.break_start_time && attendanceData.break_end_time) {
            const breakStart = new Date(attendanceData.break_start_time)
            const breakEnd = new Date(attendanceData.break_end_time)
            const calculatedBreakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
            totalBreakMinutes = Math.max(totalBreakMinutes, calculatedBreakMinutes)
          }

          let shiftName = attendanceData.shift_type || "Unknown"
          if (attendanceData.branches?.shifts && Array.isArray(attendanceData.branches.shifts)) {
            const matchingShift = attendanceData.branches.shifts.find(
              (shift: any) => shift.type === attendanceData.shift_type,
            )
            if (matchingShift) {
              shiftName = matchingShift.name || matchingShift.type
            }
          }

          console.log("[v0] Employee status mapping:", {
            employeeName: emp.name,
            dbStatus: attendanceData.status,
            hasCheckOut: !!attendanceData.check_out_time,
            mappedStatus: status,
            totalWorkingHours: totalWorkingHours.toFixed(2),
            shiftName: shiftName,
            breakStartTime: attendanceData.break_start_time,
            breakEndTime: attendanceData.break_end_time,
            calculatedBreakMinutes: totalBreakMinutes,
          })

          return {
            id: attendanceData.id,
            employeeId: emp.id,
            employeeName: emp.name,
            branch: attendanceData.branches?.name || emp.branch,
            branchId: attendanceData.branch_id,
            date: selectedDate,
            shift: shiftName,
            checkIn: attendanceData.check_in_time,
            checkOut: attendanceData.check_out_time,
            breakStart: attendanceData.break_start_time,
            breakEnd: attendanceData.break_end_time,
            totalBreakTime: totalBreakMinutes,
            totalWorkingHours: totalWorkingHours,
            status,
            photo: attendanceData.check_in_photo || attendanceData.check_out_photo,
            location: attendanceData.branches?.name || emp.branch,
          }
        })

        const totalDailyHours = shifts.reduce((sum, shift) => sum + shift.totalWorkingHours, 0)
        const totalDailyBreaks = shifts.reduce((sum, shift) => sum + shift.totalBreakTime, 0)

        // Find the most recent active shift (without check_out_time)
        const activeShifts = shifts.filter((s) => s.status === "present" || s.status === "on-break")
        const mostRecentActiveShift = activeShifts.sort(
          (a, b) => new Date(b.checkIn || "").getTime() - new Date(a.checkIn || "").getTime(),
        )[0]

        const currentStatus = mostRecentActiveShift?.status || (shifts.length > 0 ? "checked-out" : "absent")

        const canCheckIn = !mostRecentActiveShift

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          date: selectedDate,
          shifts,
          totalDailyHours,
          totalDailyBreaks,
          currentStatus,
          canCheckIn,
        }
      })

      setDailySummaries(summaries)
    } catch (error) {
      console.error("Error in fetchAttendanceRecords:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data presensi",
        variant: "destructive",
      })
    }
  }, [selectedDate, employees, supabase, toast])

  const getAvailableShifts = useMemo(() => {
    if (!selectedCheckInBranch || branchShifts.length === 0) {
      return [{ value: "default", label: "Pilih cabang terlebih dahulu", time: "00:00 - 00:00" }]
    }

    return branchShifts.map((shift, index) => ({
      value: shift.type || shift.id || `shift_${index}`,
      label: `${shift.name} (${shift.startTime || shift.start_time} - ${shift.endTime || shift.end_time})`,
      time: `${shift.startTime || shift.start_time} - ${shift.endTime || shift.end_time}`,
    }))
  }, [selectedCheckInBranch, branchShifts])

  const loadBranchShifts = useCallback(async (branchId: string) => {
    if (!branchId) {
      setBranchShifts([])
      return
    }

    console.log("[v0] Loading real shifts for branch:", branchId)
    const { data: shifts, error } = await getBranchShifts(branchId)

    if (error) {
      console.error("[v0] Error loading branch shifts:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data shift cabang dari database",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Successfully loaded real branch shifts:", shifts)
    setBranchShifts(shifts || [])

    if (shifts && shifts.length > 0) {
      setSelectedShift(shifts[0].type || shifts[0].id || "pagi")
    }
  }, [])

  const checkCameraPermission = useCallback(async () => {
    try {
      console.log("[v0] Checking camera permission...")

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Kamera Tidak Didukung",
          description: "Browser Anda tidak mendukung akses kamera. Gunakan browser yang lebih baru.",
          variant: "destructive",
        })
        setCameraPermission("denied")
        return false
      }

      // Check current permission status
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
        console.log("[v0] Camera permission status:", permission.state)

        if (permission.state === "denied") {
          setCameraPermission("denied")
          setShowCameraPermissionDialog(true)
          return false
        } else if (permission.state === "granted") {
          setCameraPermission("granted")
          return true
        }
      }

      setCameraPermission("prompt")
      return true
    } catch (error) {
      console.error("[v0] Error checking camera permission:", error)
      setCameraPermission("prompt")
      return true
    }
  }, [])

  const startCamera = useCallback(async () => {
    cameraStoppedRef.current = false
    setIsCameraReady(false)

    const hasPermission = await checkCameraPermission()
    if (!hasPermission) {
      return
    }

    try {
      console.log("[v0] Requesting camera access...")

      // Show notification to user about camera permission
      toast({
        title: "Meminta Izin Kamera",
        description: "Silakan klik 'Allow' atau 'Izinkan' untuk menggunakan kamera.",
        duration: 5000,
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })

      console.log("[v0] Camera access granted, stream:", stream)
      console.log("[v0] Stream tracks:", stream.getTracks())
      setCameraPermission("granted")

      if (videoRef.current && !cameraStoppedRef.current) {
        console.log("[v0] Assigning stream to video element")
        videoRef.current.srcObject = stream

        videoRef.current.onloadedmetadata = async () => {
          console.log("[v0] Video metadata loaded")
          if (videoRef.current && !cameraStoppedRef.current) {
            try {
              await videoRef.current.play()
              console.log("[v0] Video playing successfully")
              setIsCameraReady(true)
              toast({
                title: "Kamera Siap",
                description: "Kamera berhasil diaktifkan dan siap digunakan.",
                duration: 3000,
              })
            } catch (playError) {
              console.error("[v0] Error playing video:", playError)
            }
          }
        }

        videoRef.current.oncanplay = () => {
          console.log("[v0] Video can start playing")
        }

        videoRef.current.onplaying = () => {
          console.log("[v0] Video is playing")
          setIsCameraReady(true)
        }

        videoRef.current.onerror = (error) => {
          console.error("[v0] Video element error:", error)
        }

        if (videoRef.current.readyState >= 1) {
          try {
            await videoRef.current.play()
            console.log("[v0] Video started playing immediately")
            setIsCameraReady(true)
          } catch (playError) {
            console.error("[v0] Error playing video immediately:", playError)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error accessing camera:", error)
      setCameraPermission("denied")
      setIsCameraReady(false)

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setShowCameraPermissionDialog(true)
        toast({
          title: "Izin Kamera Ditolak",
          description: "Anda perlu mengizinkan akses kamera untuk menggunakan fitur presensi.",
          variant: "destructive",
          duration: 8000,
        })
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        toast({
          title: "Kamera Tidak Ditemukan",
          description: "Tidak ada kamera yang terdeteksi pada perangkat Anda.",
          variant: "destructive",
        })
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        toast({
          title: "Kamera Sedang Digunakan",
          description: "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain dan coba lagi.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error Kamera",
          description:
            "Tidak dapat mengakses kamera. Pastikan browser memiliki izin kamera dan kamera tidak digunakan aplikasi lain.",
          variant: "destructive",
        })
      }
    }
  }, [checkCameraPermission])

  const stopCamera = useCallback(() => {
    if (cameraStoppedRef.current) return
    cameraStoppedRef.current = true
    setIsCameraReady(false)

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => {
          if (track.readyState === "live") {
            track.stop()
          }
        })
        videoRef.current.srcObject = null
      }
    } catch (e) {
      console.log("[v0] Error stopping camera:", e)
    }
  }, [])

  useEffect(() => {
    if (!isCameraOpen) {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isCameraOpen, stopCamera])

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    console.log("[v0] Capturing photo for:", selectedEmployee?.name)

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    let quality = 0.7
    let photoData = canvas.toDataURL("image/jpeg", quality)

    // Calculate approximate file size (base64 is ~33% larger than binary)
    let fileSizeKB = (photoData.length * 0.75) / 1024

    // Reduce quality until file size is under 50KB
    while (fileSizeKB > 50 && quality > 0.1) {
      quality -= 0.1
      photoData = canvas.toDataURL("image/jpeg", quality)
      fileSizeKB = (photoData.length * 0.75) / 1024
    }

    console.log("[v0] Photo compressed to:", Math.round(fileSizeKB), "KB with quality:", quality)

    setCapturedPhoto(photoData)
    setIsCameraOpen(false)

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [selectedEmployee])

  useEffect(() => {
    if (capturedPhoto && selectedEmployee) {
      console.log("[v0] Photo captured, processing attendance action:", attendanceAction)
      handleAttendanceAction(capturedPhoto)
      setCapturedPhoto(null) // Reset after processing
    }
  }, [capturedPhoto, selectedEmployee, attendanceAction])

  const handleAttendanceAction = async (photoUrl: string) => {
    if (!selectedEmployee) return

    try {
      setIsProcessing(true)

      if (attendanceAction === "check-in") {
        const branchToUse = selectedCheckInBranch || selectedEmployee.selectedBranch || ""
        console.log("[v0] Using branch for attendance:", branchToUse)
        console.log("[v0] Available branches:", Array.from(branchIdMap.keys()))

        if (!branchToUse) {
          throw new Error("Branch ID not found for selected branch: " + branchToUse + ". Please select a valid branch.")
        }

        let branchId = branchToUse

        // Check if branchToUse is already a valid branch ID (UUID format)
        const isValidBranchId = branches.some((branch) => branch.id === branchToUse)

        if (!isValidBranchId) {
          // If not a valid ID, try to get ID from branch name
          branchId = branchIdMap.get(branchToUse) || ""
        }

        if (!branchId) {
          throw new Error("Branch ID not found for selected branch: " + branchToUse + ". Please select a valid branch.")
        }

        const currentTime = new Date().toISOString()
        const currentDate = format(new Date(), "yyyy-MM-dd")

        const { error } = await supabase.from("attendance").insert({
          user_id: selectedEmployee.id,
          branch_id: branchId,
          date: currentDate,
          check_in_time: currentTime,
          status: "checked_in",
          check_in_photo: photoUrl,
          total_hours: 0,
          break_duration: 0,
        })

        if (error) throw error

        toast({
          title: "Check-in Berhasil",
          description: `${selectedEmployee.name} berhasil check-in di ${branchToUse}`,
        })
      } else if (attendanceAction === "check-out") {
        console.log("[v0] Looking for check-out record for employee:", selectedEmployee.id)
        console.log("[v0] Selected date:", selectedDate)
        console.log(
          "[v0] Available attendance records:",
          attendanceRecords.map((r) => ({ user_id: r.user_id, date: r.date, id: r.id })),
        )

        // Find the most recent record WITHOUT check_out_time (active shift)
        const activeRecords = attendanceRecords.filter(
          (record) => record.user_id === selectedEmployee.id && record.date === selectedDate && !record.check_out_time,
        )

        console.log("[v0] Active records (without check_out_time):", activeRecords)

        // Get the most recent active record
        const existingRecord = activeRecords.sort(
          (a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime(),
        )[0]

        if (!existingRecord?.id) {
          throw new Error("Tidak ada record check-in aktif untuk hari ini. Silakan check-in terlebih dahulu.")
        }

        console.log("[v0] Found active record for check-out:", existingRecord)

        const checkOutTime = new Date().toISOString()
        const checkInTime = new Date(existingRecord.check_in_time)
        const workDuration = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60) // hours
        const breakDuration = existingRecord.break_duration || 0
        const totalHours = Math.max(0, workDuration - breakDuration / 60) // Convert break minutes to hours

        const { error } = await supabase
          .from("attendance")
          .update({
            check_out_time: checkOutTime,
            check_out_photo: photoUrl,
            status: "checked_out",
            total_hours: totalHours,
          })
          .eq("id", existingRecord.id)

        if (error) throw error

        toast({
          title: "Check-out Berhasil",
          description: `${selectedEmployee.name} berhasil check-out. Total kerja: ${formatDetailedTime(totalHours)}`,
        })
      }

      await fetchAttendanceRecords()

      // Reset all states to allow new actions
      setSelectedEmployee(null)
      setSelectedCheckInBranch("")
      setAttendanceAction("check-in")
    } catch (error) {
      console.error("[v0] Attendance action error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses presensi",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      stopCamera()
      setIsCameraOpen(false)
      setIsCheckInDialogOpen(false)
    }
  }

  const handleBreakAction = async (action: "break-start" | "break-end") => {
    if (!selectedEmployee || isProcessing) return

    setIsProcessing(true)

    try {
      const summary = dailySummaries.find((s) => s.employeeId === selectedEmployee.id)
      const activeShift = summary?.shifts.find((s) => s.status === "present" || s.status === "on-break")

      if (!activeShift?.id) {
        throw new Error("Karyawan belum check-in di shift manapun")
      }

      const currentTime = new Date().toISOString()
      const updates: any = { updated_at: new Date().toISOString() }

      if (action === "break-start") {
        updates.break_start_time = currentTime
        updates.status = "on_break"
      } else {
        updates.break_end_time = currentTime
        updates.status = "checked_in"

        if (activeShift.breakStart) {
          const breakStart = new Date(activeShift.breakStart)
          const breakEnd = new Date(currentTime)
          const breakDuration = Math.round((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
          updates.total_break_minutes = (activeShift.totalBreakTime || 0) + breakDuration
        }
      }

      const { error } = await supabase.from("attendance").update(updates).eq("id", activeShift.id)

      if (error) throw error

      toast({
        title: action === "break-start" ? "Istirahat Dimulai" : "Istirahat Selesai",
        description: `${selectedEmployee.name} ${action === "break-start" ? "mulai istirahat" : "lanjut bekerja"}`,
      })

      await fetchAttendanceRecords()
    } catch (error) {
      console.error("Break action error:", error)
      toast({
        title: "Gagal menyimpan",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setSelectedEmployee(null)
    }
  }

  const checkBranchSelection = () => {
    if (selectedBranch === "all") {
      setIsBranchWarningOpen(true)
      return false
    }
    return true
  }

  const openCheckInDialog = (employee: Employee) => {
    if (isProcessing) return

    const summary = dailySummaries.find((s) => s.employeeId === employee.id)

    if (!summary?.canCheckIn) {
      toast({
        title: "Tidak Bisa Check-in",
        description: "Karyawan harus check-out dari shift sebelumnya terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setSelectedEmployee(employee)
    setSelectedCheckInBranch("")
    setIsCheckInDialogOpen(true)
  }

  const confirmCheckIn = () => {
    if (!selectedCheckInBranch) {
      toast({
        title: "Pilih Cabang",
        description: "Silakan pilih cabang terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    if (selectedEmployee) {
      setSelectedEmployee({
        ...selectedEmployee,
        selectedBranch: selectedCheckInBranch,
      })
    }

    console.log("[v0] Confirming check-in with branch:", selectedCheckInBranch)
    setAttendanceAction("check-in")
    setIsCheckInDialogOpen(false)
    setIsCameraOpen(true)
    setTimeout(startCamera, 100)
  }

  const handleBreakStart = (employee: Employee) => {
    if (isProcessing) return
    setSelectedEmployee(employee)
    handleBreakAction("break-start")
  }

  const handleBreakEnd = (employee: Employee) => {
    if (isProcessing) return
    setSelectedEmployee(employee)
    handleBreakAction("break-end")
  }

  const openCheckOutCamera = (employee: Employee) => {
    if (isProcessing) return
    setSelectedEmployee(employee)
    setAttendanceAction("check-out")
    setIsCameraOpen(true)
    setTimeout(startCamera, 100)
  }

  useEffect(() => {
    if (selectedCheckInBranch) {
      loadBranchShifts(selectedCheckInBranch)
    }
  }, [selectedCheckInBranch, loadBranchShifts])

  useEffect(() => {
    loadEmployeesAndBranches()
  }, [loadEmployeesAndBranches])

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendanceRecords()
    }
  }, [fetchAttendanceRecords, employees])

  useEffect(() => {
    if (isCameraOpen && !isCameraReady) {
      console.log("[v0] Camera dialog opened, starting camera...")
      startCamera()
    }
  }, [isCameraOpen, isCameraReady, startCamera])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "absent":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "late":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "on-break":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "checked-out":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "Hadir"
      case "absent":
        return "Tidak Hadir"
      case "late":
        return "Terlambat"
      case "on-break":
        return "Istirahat"
      case "checked-out":
        return "Pulang"
      default:
        return "Unknown"
    }
  }

  const getShiftText = (shift: string) => {
    switch (shift) {
      case "pagi":
        return "Pagi (08:00-16:00)"
      case "siang":
        return "Siang (12:00-20:00)"
      case "malam":
        return "Malam (20:00-04:00)"
      default:
        return "Unknown"
    }
  }

  const formatDetailedTime = (hours: number): string => {
    if (hours <= 0) return "00:00:00"

    const totalSeconds = Math.floor(hours * 3600)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const formatBreakTime = (minutes: number): string => {
    if (minutes <= 0) return "00:00:00"

    const roundedMinutes = Math.round(minutes * 100) / 100
    const totalSeconds = Math.floor(roundedMinutes * 60)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const allShifts = dailySummaries.flatMap((summary) => summary.shifts)
  const filteredShifts =
    selectedBranch === "all" ? allShifts : allShifts.filter((shift) => shift.branch === selectedBranch)

  console.log("[v0] Dashboard count calculation:", {
    selectedBranch,
    totalShifts: allShifts.length,
    filteredShifts: filteredShifts.length,
    shiftStatuses: filteredShifts.map((s) => ({ name: s.employeeName, status: s.status })),
  })

  const presentCount = filteredShifts.filter((r) => r.status === "present").length
  const absentCount = employees.length - filteredShifts.length // Employees with no attendance records
  const onBreakCount = filteredShifts.filter((r) => r.status === "on-break").length
  const checkedOutCount = filteredShifts.filter((r) => r.status === "checked-out").length

  console.log("[v0] Final counts:", { presentCount, absentCount, onBreakCount, checkedOutCount })

  const filteredSummaries = dailySummaries.filter((summary) => {
    if (selectedBranch === "all") return true
    // Show employee if they have ANY shift in the selected branch
    return summary.shifts.some((shift) => shift.branch === selectedBranch)
  })

  const [activeTab, setActiveTab] = useState("quick-action")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Presensi Karyawan</h1>
          <p className="text-muted-foreground">Kelola presensi karyawan dengan foto dan tracking waktu</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                <p className="text-sm text-muted-foreground">Hadir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                <p className="text-sm text-muted-foreground">Tidak Hadir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{onBreakCount}</p>
                <p className="text-sm text-muted-foreground">Istirahat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-600">{checkedOutCount}</p>
                <p className="text-sm text-muted-foreground">Sudah Pulang</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quick-action" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="quick-action">Aksi Cepat</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-action" className="space-y-6">
          <div className="grid gap-4">
            {filteredSummaries.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      {selectedBranch === "all"
                        ? "Belum Ada Data Presensi"
                        : `Belum Ada yang Bekerja di ${selectedBranch}`}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedBranch === "all"
                        ? "Belum ada karyawan yang melakukan presensi hari ini"
                        : `Belum ada karyawan yang bekerja di cabang ${selectedBranch} hari ini`}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              filteredSummaries.map((summary) => {
                const employee = employees.find((e) => e.id === summary.employeeId)
                if (!employee) return null

                return (
                  <Card key={summary.employeeId} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {employee.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{summary.employeeName}</h3>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-600">Total Hari Ini</div>
                          <div className="font-semibold text-lg text-blue-600">
                            {formatDetailedTime(summary.totalDailyHours)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {summary.shifts.length} shift
                            {summary.totalDailyBreaks > 0 && (
                              <span> • {formatBreakTime(summary.totalDailyBreaks)} total istirahat</span>
                            )}
                          </div>
                          {summary.currentStatus === "on-break" && (
                            <div className="text-xs text-orange-600 font-medium mt-1 bg-orange-50 px-2 py-1 rounded">
                              🟡 Sedang istirahat
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced break information display with more details */}
                      {summary.shifts.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Shift Hari Ini:</h4>
                          {summary.shifts
                            .sort((a, b) => new Date(a.checkIn || "").getTime() - new Date(b.checkIn || "").getTime())
                            .map((shift, index) => (
                              <div key={shift.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">
                                      Shift {index + 1} - {shift.branch}
                                    </span>
                                    <div className="text-gray-600">
                                      {shift.checkIn &&
                                        `Masuk: ${new Date(shift.checkIn).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        })}`}
                                      {shift.checkOut &&
                                        ` • Pulang: ${new Date(shift.checkOut).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        })}`}
                                    </div>
                                    <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                      <div className="text-xs font-medium text-blue-800 mb-1">Detail Istirahat:</div>
                                      {shift.breakStart ? (
                                        <>
                                          <div className="text-xs text-blue-700">
                                            Mulai:{" "}
                                            {new Date(shift.breakStart).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              second: "2-digit",
                                            })}
                                          </div>
                                          {shift.breakEnd ? (
                                            <div className="text-xs text-blue-700">
                                              Selesai:{" "}
                                              {new Date(shift.breakEnd).toLocaleTimeString("id-ID", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                              })}
                                            </div>
                                          ) : shift.status === "on-break" ? (
                                            <div className="text-xs text-orange-600 font-medium">
                                              🟡 Sedang istirahat sejak{" "}
                                              {new Date(shift.breakStart).toLocaleTimeString("id-ID", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-500">Istirahat belum selesai</div>
                                          )}
                                          {shift.totalBreakTime > 0 && (
                                            <div className="text-xs text-blue-700 font-medium">
                                              Total: {formatBreakTime(shift.totalBreakTime)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-xs text-gray-500">Tidak ada istirahat</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-blue-600">
                                      {formatDetailedTime(shift.totalWorkingHours)}
                                    </div>
                                    <Badge className={getStatusColor(shift.status)}>
                                      {shift.status === "present" && "Sedang Bekerja"}
                                      {shift.status === "on-break" && "Istirahat"}
                                      {shift.status === "checked-out" && "Sudah Pulang"}
                                      {shift.status === "absent" && "Belum Masuk"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {summary.canCheckIn && (
                          <Button
                            onClick={() => openCheckInDialog(employee)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Check In
                          </Button>
                        )}

                        {summary.currentStatus === "present" && (
                          <>
                            <Button
                              onClick={() => handleBreakStart(employee)}
                              disabled={isProcessing}
                              variant="outline"
                              className="border-orange-300 text-orange-700 hover:bg-orange-50 font-medium px-4 py-2 rounded-lg"
                            >
                              <Coffee className="w-4 h-4 mr-2" />
                              Istirahat
                            </Button>
                            <Button
                              onClick={() => openCheckOutCamera(employee)}
                              disabled={isProcessing}
                              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Check Out
                            </Button>
                          </>
                        )}

                        {summary.currentStatus === "on-break" && (
                          <Button
                            onClick={() => handleBreakEnd(employee)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Lanjut Kerja
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Riwayat Presensi
              </CardTitle>
              <CardDescription>Riwayat presensi karyawan dengan detail jam kerja</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dailySummaries.map((summary) => (
                  <Card key={`${summary.employeeId}-${summary.date}`} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {summary.employeeName
                              ? summary.employeeName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{summary.employeeName}</h3>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            summary.currentStatus === "present"
                              ? "bg-green-100 text-green-800"
                              : summary.currentStatus === "on-break"
                                ? "bg-yellow-100 text-yellow-800"
                                : summary.currentStatus === "checked-out"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {summary.currentStatus === "present"
                            ? "Hadir"
                            : summary.currentStatus === "on-break"
                              ? "Istirahat"
                              : summary.currentStatus === "checked-out"
                                ? "Pulang"
                                : "Tidak Hadir"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date and Shifts */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Tanggal:</span>
                          <span className="text-sm font-semibold">{summary.date}</span>
                        </div>
                      </div>

                      {/* Time Details */}
                      <div className="space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-green-600 font-medium mb-1">Check In</p>
                            <p className="text-sm font-bold text-green-800">
                              {summary.shifts.length > 0 && summary.shifts[0].checkIn
                                ? new Date(summary.shifts[0].checkIn).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "--:--:--"}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-600 font-medium mb-1">Check Out</p>
                            <p className="text-sm font-bold text-red-800">
                              {summary.shifts.length > 0 && summary.shifts[summary.shifts.length - 1].checkOut
                                ? new Date(summary.shifts[summary.shifts.length - 1].checkOut).toLocaleTimeString(
                                    "id-ID",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    },
                                  )
                                : "--:--:--"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium mb-1">Total Kerja</p>
                            <p className="text-sm font-bold text-blue-800">
                              {summary.totalDailyHours > 0 ? formatDetailedTime(summary.totalDailyHours) : "00:00:00"}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <p className="text-xs text-yellow-600 font-medium mb-1">Total Istirahat</p>
                            <p className="text-sm font-bold text-yellow-800">
                              {formatBreakTime(summary.totalDailyBreaks)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Multiple Shifts Details */}
                      {summary.shifts.length > 1 && (
                        <div className="pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Detail Multiple Shifts:</p>
                          <div className="space-y-2">
                            {summary.shifts.map((shift, index) => {
                              return (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-gray-800">{shift.branch}</span>
                                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                                        {shift.shift}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">
                                      {shift.checkIn
                                        ? new Date(shift.checkIn).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "--:--"}{" "}
                                      -{" "}
                                      {shift.checkOut
                                        ? new Date(shift.checkOut).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "--:--"}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {dailySummaries.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada data presensi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Check-in Karyawan
            </DialogTitle>
            <DialogDescription>
              Selamat datang, {selectedEmployee?.name}!
              <br />
              Pilih cabang dan shift kerja untuk memulai hari kerja Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Cabang Kerja
              </Label>
              <Select value={selectedCheckInBranch} onValueChange={setSelectedCheckInBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="🏢 Pilih cabang tempat kerja" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Shift Kerja
              </Label>
              <Select
                value={selectedShift}
                onValueChange={(value) => setSelectedShift(value)}
                disabled={!selectedCheckInBranch || branchShifts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih shift kerja" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableShifts.map((shift) => (
                    <SelectItem key={shift.value} value={shift.value} disabled={shift.value === "default"}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <div>
                          <div className="font-medium">{shift.label.split(" (")[0]}</div>
                          <div className="text-sm text-muted-foreground">{shift.time}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCheckInBranch && (
                <p className="text-xs text-muted-foreground">
                  Pilih cabang terlebih dahulu untuk melihat shift yang tersedia
                </p>
              )}
              {selectedCheckInBranch && branchShifts.length === 0 && (
                <p className="text-xs text-orange-600">
                  Tidak ada data shift untuk cabang ini. Hubungi admin untuk mengatur shift.
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Langkah Selanjutnya</p>
                  <p className="text-blue-700">
                    Setelah memilih cabang dan shift, Anda akan diminta mengambil foto sebagai bukti kehadiran. Pastikan
                    kamera berfungsi dengan baik dan pencahayaan cukup.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckInDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={confirmCheckIn} disabled={!selectedCheckInBranch || !selectedShift} className="gap-2">
              <Camera className="h-4 w-4" />
              Lanjut Ambil Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCameraPermissionDialog} onOpenChange={setShowCameraPermissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-red-500" />
              Izin Kamera Diperlukan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-3">
                Aplikasi presensi memerlukan akses kamera untuk mengambil foto sebagai bukti kehadiran.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-900 mb-2">Cara mengizinkan akses kamera:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                  <li>Klik ikon kamera di address bar browser</li>
                  <li>Pilih "Allow" atau "Izinkan"</li>
                  <li>Refresh halaman jika diperlukan</li>
                  <li>Coba buka kamera lagi</li>
                </ol>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCameraPermissionDialog(false)
                  // Try to start camera again
                  startCamera()
                }}
                className="flex-1"
              >
                Coba Lagi
              </Button>
              <Button variant="outline" onClick={() => setShowCameraPermissionDialog(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Ambil Foto Presensi
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <>
                  {attendanceAction === "check-in" && `Check-in untuk ${selectedEmployee.name}`}
                  {attendanceAction === "check-out" && `Check-out untuk ${selectedEmployee.name}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cameraPermission === "denied" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Izin kamera ditolak</span>
                </div>
                <p className="text-xs text-red-600 mt-1">Silakan izinkan akses kamera di pengaturan browser Anda.</p>
              </div>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
                onLoadedMetadata={async () => {
                  console.log("[v0] Video onLoadedMetadata triggered")
                  if (videoRef.current && !cameraStoppedRef.current) {
                    try {
                      await videoRef.current.play()
                      console.log("[v0] Video play from onLoadedMetadata successful")
                    } catch (error) {
                      console.error("[v0] Video play from onLoadedMetadata failed:", error)
                    }
                  }
                }}
                onCanPlay={() => console.log("[v0] Video onCanPlay triggered")}
                onPlaying={() => console.log("[v0] Video onPlaying triggered")}
                onError={(e) => console.error("[v0] Video onError:", e)}
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute top-2 right-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isCameraReady && cameraPermission === "granted"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCameraReady && cameraPermission === "granted" ? "bg-white" : "bg-white animate-pulse"
                    }`}
                  />
                  {cameraPermission === "denied" ? "Izin Ditolak" : isCameraReady ? "Siap" : "Loading..."}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 gap-2"
                disabled={isProcessing || !isCameraReady || cameraPermission !== "granted"}
              >
                <Camera className="h-4 w-4" />
                {isProcessing
                  ? "Memproses..."
                  : cameraPermission !== "granted"
                    ? "Izin Kamera Diperlukan"
                    : !isCameraReady
                      ? "Tunggu Kamera..."
                      : "Ambil Foto"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  stopCamera()
                  setIsCameraOpen(false)
                }}
                className="bg-transparent"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch Warning Dialog */}
      <Dialog open={isBranchWarningOpen} onOpenChange={setIsBranchWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Peringatan</DialogTitle>
            <DialogDescription>
              Anda memilih untuk melihat semua cabang. Ini akan menampilkan semua data presensi dari semua cabang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsBranchWarningOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AttendanceSystem