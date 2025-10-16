"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, CheckCircle, XCircle, Calendar, Eye, MapPin, Camera, Timer, Settings, Trash2, Download, Users, Sparkles, Zap, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { supabase, getEmployeeAttendanceWithPhotos, getEmployeePhotos } from "@/lib/supabase"
import type { Employee, Attendance, AttendanceWithDetails } from "@/lib/supabase"

interface KontrolPresensiProps {
  employees: Employee[]
}

interface PhotoItem {
  id: string
  attendanceId: string
  photoUrl: string
  photoType: 'check_in' | 'check_out'
  date: string
  time: string
  branchName: string
  shiftType: string
}

export function KontrolPresensi({ employees }: KontrolPresensiProps) {
  const [attendanceData, setAttendanceData] = useState<Record<string, any>>({})
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeePhotos, setEmployeePhotos] = useState<AttendanceWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  
  // Photo Manager State
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("")
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null)

  const loadAttendanceData = async () => {
    console.log("🔄 Loading attendance data...", employees.length, "employees")
    setLoading(true)
    const attendanceMap: Record<string, any> = {}

    for (const employee of employees) {
      try {
        const result = await getEmployeeAttendanceWithPhotos(employee.id, 30)
        attendanceMap[employee.id] = result
      } catch (error) {
        console.error(`❌ Error loading attendance for ${employee.name}:`, error)
        attendanceMap[employee.id] = {
          data: [],
          attendanceRate: 0,
          presentDays: 0,
          lateDays: 0,
          totalWorkDays: 0,
          overtimeHours: 0,
        }
      }
    }

    setAttendanceData(attendanceMap)
    setLoading(false)
  }

  const loadEmployeePhotos = async (employeeId: string) => {
    try {
      const result = await getEmployeeAttendanceWithPhotos(employeeId, 20)
      const photosData = result.data.filter((record) => record.check_in_photo || record.check_out_photo)
      setEmployeePhotos(photosData)
    } catch (error) {
      console.error("Error loading employee photos:", error)
      toast({
        title: "Error",
        description: "Gagal memuat foto presensi karyawan",
        variant: "destructive",
      })
    }
  }

  // Photo Manager Functions
  const loadEmployeePhotoManager = async (userId: string) => {
    try {
      const { data, error } = await getEmployeePhotos(userId)
      if (!error && data) {
        const photoItems: PhotoItem[] = []
        
        data.forEach((attendance: AttendanceWithDetails) => {
          if (attendance.check_in_photo) {
            photoItems.push({
              id: `${attendance.id}_checkin`,
              attendanceId: attendance.id,
              photoUrl: attendance.check_in_photo,
              photoType: 'check_in',
              date: attendance.date,
              time: attendance.check_in_time || '',
              branchName: attendance.branches?.name || 'Cabang Tidak Diketahui',
              shiftType: attendance.shift_type
            })
          }
          
          if (attendance.check_out_photo) {
            photoItems.push({
              id: `${attendance.id}_checkout`,
              attendanceId: attendance.id,
              photoUrl: attendance.check_out_photo,
              photoType: 'check_out',
              date: attendance.date,
              time: attendance.check_out_time || '',
              branchName: attendance.branches?.name || 'Cabang Tidak Diketahui',
              shiftType: attendance.shift_type
            })
          }
        })
        
        setPhotos(photoItems)
      }
    } catch (error) {
      console.error("Failed to load employee photos:", error)
      toast({
        title: "Error",
        description: "Gagal memuat foto presensi",
        variant: "destructive",
      })
    }
  }

  const handleOpenPhotoManager = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeId(employeeId)
    setSelectedEmployeeName(employeeName)
    setIsPhotoManagerOpen(true)
    loadEmployeePhotoManager(employeeId)
  }

  const handleClosePhotoManager = () => {
    setIsPhotoManagerOpen(false)
    setSelectedEmployeeId(null)
    setSelectedEmployeeName("")
    setPhotos([])
    setSelectedPhotos(new Set())
    setPreviewPhoto(null)
  }

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) return

    setDeleting(true)
    try {
      const photosToDelete = photos.filter(p => selectedPhotos.has(p.id))
      
      for (const photo of photosToDelete) {
        const updateData: any = {}
        if (photo.photoType === 'check_in') {
          updateData.check_in_photo = null
        } else {
          updateData.check_out_photo = null
        }

        const { error } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', photo.attendanceId)

        if (error) {
          console.error(`Error deleting photo for attendance ${photo.attendanceId}:`, error)
        }
      }

      // Reload photos
      if (selectedEmployeeId) {
        await loadEmployeePhotoManager(selectedEmployeeId)
      }
      
      setSelectedPhotos(new Set())
      loadAttendanceData() // Refresh main data
      
      toast({
        title: "Berhasil",
        description: `${photosToDelete.length} foto berhasil dihapus`,
      })
    } catch (error) {
      console.error("Error deleting photos:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus foto",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = async (photo: PhotoItem) => {
    setDeleting(true)
    try {
      const updateData: any = {}
      if (photo.photoType === 'check_in') {
        updateData.check_in_photo = null
      } else {
        updateData.check_out_photo = null
      }

      const { error } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', photo.attendanceId)

      if (error) {
        console.error(`Error deleting photo:`, error)
        throw error
      }

      // Reload photos
      if (selectedEmployeeId) {
        await loadEmployeePhotoManager(selectedEmployeeId)
      }
      
      loadAttendanceData() // Refresh main data
      
      toast({
        title: "Berhasil",
        description: "Foto berhasil dihapus",
      })
    } catch (error) {
      console.error("Error deleting photo:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus foto",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadPhoto = async (photoUrl: string, fileName: string) => {
    try {
      const response = await fetch(photoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Berhasil",
        description: "Foto berhasil diunduh",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengunduh foto",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadAttendanceData()

    // Setup real-time subscription
    const subscription = supabase
      .channel("attendance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        (payload) => {
          console.log("📡 Attendance change detected:", payload)
          loadAttendanceData() // Reload data when changes occur
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [employees])

  const getStatusBadge = (status: string) => {
    const variants = {
      checked_in: "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 border-0 animate-pulse",
      checked_out: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 border-0", 
      on_break: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 border-0",
      absent: "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25 border-0"
    }
    
    const labels = {
      checked_in: "🟢 Sedang Bekerja",
      checked_out: "🔵 Selesai Kerja", 
      on_break: "🟡 Istirahat",
      absent: "🔴 Tidak Hadir"
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gradient-to-r from-slate-500 to-gray-500 text-white"}>
        {labels[status as keyof typeof labels] || "❓ Unknown"}
      </Badge>
    )
  }

  const formatShiftTime = (shiftType: string) => {
    switch (shiftType) {
      case "pagi": return "🌅 Shift Pagi (08:00 - 16:00)"
      case "siang": return "☀️ Shift Siang (12:00 - 20:00)"
      case "malam": return "🌙 Shift Malam (20:00 - 04:00)"
      default: return "❓ Shift Tidak Diketahui"
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ""
    return timeString.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-cyan-50">
        <Card className="shadow-lg md:shadow-2xl border-0 bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl font-bold">
              <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm">
                <Clock className="h-5 w-5 md:h-8 md:w-8" />
              </div>
              Kontrol Presensi Karyawan
            </CardTitle>
            <CardDescription className="text-purple-100 text-sm md:text-lg">Memuat data presensi...</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-12">
            <div className="flex flex-col items-center justify-center space-y-4 md:space-y-6">
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-base md:text-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Sedang memuat data...
                </div>
                <div className="text-sm md:text-base text-gray-500">Mohon tunggu sebentar</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-cyan-50 p-3 md:p-6">
      <div className="space-y-4 md:space-y-8 max-w-7xl mx-auto">
        {/* Main Attendance Card */}
        <Card className="shadow-lg md:shadow-2xl border-0 bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl overflow-hidden transform hover:scale-[1.01] transition-all duration-500">
          <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden p-4 md:p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 animate-pulse"></div>
            <div className="relative z-10">
              <CardTitle className="flex items-center gap-2 md:gap-4 text-lg md:text-2xl lg:text-3xl font-bold mb-2">
                <div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 md:h-8 lg:h-10 md:w-8 lg:w-10" />
                </div>
                <span className="bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Kontrol Presensi Karyawan
                </span>
              </CardTitle>
              <CardDescription className="text-purple-100 text-xs md:text-sm lg:text-lg flex items-center gap-1 md:gap-2">
                <Zap className="h-4 w-4 md:h-5 md:w-5" />
                <span className="line-clamp-2">Pantau presensi dan foto karyawan secara real-time dengan fitur hapus foto yang fleksibel</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 lg:p-8">
            <div className="space-y-4 md:space-y-8">
              {employees.length === 0 ? (
                <div className="text-center py-12 md:py-20">
                  <div className="relative mb-6 md:mb-8">
                    <div className="w-20 h-20 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Users className="h-10 w-10 md:h-16 md:w-16 text-white" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-purple-400 to-cyan-400 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-gray-800 mb-2 md:mb-4">Belum ada data karyawan</p>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600">Silakan tambahkan data karyawan ke database untuk mulai menggunakan fitur ini</p>
                </div>
              ) : (
                employees.map((employee, index) => {
                  const attendance = attendanceData[employee.id] || {
                    attendanceRate: 0,
                    presentDays: 0,
                    lateDays: 0,
                    totalWorkDays: 0,
                    overtimeHours: 0,
                    data: [],
                  }

                  const latestAttendance = attendance.data?.[0] as AttendanceWithDetails

                  return (
                    <div 
                      key={employee.id} 
                      className="group relative p-4 md:p-6 lg:p-8 border-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-white to-gray-50 hover:from-purple-50 hover:to-cyan-50 shadow-md md:shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'slideInUp 0.6s ease-out forwards'
                      }}
                    >
                      {/* Gradient Border Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                      <div className="absolute inset-[1px] bg-gradient-to-br from-white to-gray-50 group-hover:from-purple-50 group-hover:to-cyan-50 rounded-2xl md:rounded-3xl"></div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8 mb-4 md:mb-8">
                          <div className="flex items-center gap-3 md:gap-6">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-14 w-14 md:h-16 lg:h-20 md:w-16 lg:w-20 ring-2 md:ring-4 ring-purple-200 group-hover:ring-purple-400 transition-all duration-300">
                                <AvatarImage src={employee.avatar || "/images/pigtown-logo.png"} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-base md:text-xl font-bold">
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-base md:text-xl lg:text-2xl text-gray-800 mb-1 truncate">{employee.name}</p>
                              <p className="text-xs md:text-sm lg:text-base text-gray-600 mb-2 md:mb-3 truncate">
                                {employee.role === "cashier" ? "💰 Kasir" : "👤 Karyawan"} • {employee.email}
                              </p>
                              {latestAttendance && (
                                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                  {getStatusBadge(latestAttendance.status)}
                                  {latestAttendance.branches && (
                                    <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600 bg-white/70 px-2 md:px-3 py-1 rounded-lg md:rounded-xl backdrop-blur-sm">
                                      <MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                                      <span className="font-medium truncate max-w-[100px] md:max-w-none">{latestAttendance.branches.name}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-center lg:text-right bg-gradient-to-br from-green-100 to-emerald-100 p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl flex-shrink-0">
                            <p className="text-xs md:text-sm text-green-700 font-medium mb-1 md:mb-2 flex items-center justify-center lg:justify-end gap-1 md:gap-2">
                              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="hidden md:inline">Tingkat Kehadiran</span>
                              <span className="md:hidden">Kehadiran</span>
                            </p>
                            <div className="flex items-center justify-center lg:justify-end gap-2 md:gap-3">
                              <div className="text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                {attendance.attendanceRate}%
                              </div>
                              <CheckCircle className="h-5 w-5 md:h-6 lg:h-8 md:w-6 lg:w-8 text-green-500" />
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
                          {[
                            { icon: CheckCircle, label: "Hadir", value: attendance.presentDays, suffix: "hari", color: "from-green-500 to-emerald-500", bg: "from-green-50 to-emerald-50" },
                            { icon: XCircle, label: "Terlambat", value: attendance.lateDays, suffix: "hari", color: "from-red-500 to-rose-500", bg: "from-red-50 to-rose-50" },
                            { icon: Timer, label: "Lembur", value: attendance.overtimeHours, suffix: "jam", color: "from-blue-500 to-cyan-500", bg: "from-blue-50 to-cyan-50" },
                            { icon: Calendar, label: "Total Hari", value: attendance.totalWorkDays, suffix: "hari", color: "from-amber-500 to-orange-500", bg: "from-amber-50 to-orange-50" }
                          ].map((stat, statIndex) => (
                            <div 
                              key={statIndex}
                              className={`relative text-center p-3 md:p-4 lg:p-6 bg-gradient-to-br ${stat.bg} rounded-xl md:rounded-2xl border-0 hover:shadow-lg transform hover:scale-105 transition-all duration-300 group/stat overflow-hidden`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover/stat:opacity-10 transition-opacity duration-300" style={{backgroundImage: `linear-gradient(135deg, ${stat.color})`}}></div>
                              <div className="relative z-10">
                                <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 mb-2 md:mb-4">
                                  <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                                    <stat.icon className="h-3 w-3 md:h-4 lg:h-5 md:w-4 lg:w-5 text-white" />
                                  </div>
                                  <span className="text-[10px] md:text-xs lg:text-sm font-semibold text-gray-700">{stat.label}</span>
                                </div>
                                <p className="text-xl md:text-2xl lg:text-3xl font-black text-gray-800 mb-0.5 md:mb-1">{stat.value}</p>
                                <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-500 font-medium">{stat.suffix} bulan ini</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Photos Section */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 border-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6">
                            <p className="font-bold text-sm md:text-base lg:text-xl text-gray-800 flex items-center gap-2 md:gap-3">
                              <Camera className="h-4 w-4 md:h-5 lg:h-6 md:w-5 lg:w-6 text-purple-600" />
                              <span className="line-clamp-1">Foto Presensi Terbaru</span>
                            </p>
                            <div className="flex gap-2 md:gap-4 w-full sm:w-auto">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 sm:flex-none gap-2 bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-300 rounded-lg md:rounded-xl shadow-md text-xs md:text-sm h-9 md:h-10"
                                    onClick={() => {
                                      setSelectedEmployee(employee)
                                      loadEmployeePhotos(employee.id)
                                    }}
                                  >
                                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    <span>Lihat Semua</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl border-0 bg-white/95 backdrop-blur-xl">
                                  <DialogHeader className="pb-4 md:pb-6">
                                    <DialogTitle className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                                      📸 Foto Presensi - {employee.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
                                    {employeePhotos.map((record, photoIndex) => (
                                      <div 
                                        key={record.id} 
                                        className="space-y-4 group/photo transform hover:scale-105 transition-all duration-300"
                                        style={{
                                          animationDelay: `${photoIndex * 50}ms`,
                                          animation: 'fadeInUp 0.5s ease-out forwards'
                                        }}
                                      >
                                        <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-cyan-100 rounded-2xl overflow-hidden shadow-lg group-hover/photo:shadow-2xl transition-all duration-300">
                                          {record.check_in_photo && (
                                            <img
                                              src={record.check_in_photo || "/placeholder.svg"}
                                              alt={`Check-in ${format(new Date(record.date), "dd/MM/yyyy", { locale: id })}`}
                                              className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500"
                                            />
                                          )}
                                          {!record.check_in_photo && record.check_out_photo && (
                                            <img
                                              src={record.check_out_photo || "/placeholder.svg"}
                                              alt={`Check-out ${format(new Date(record.date), "dd/MM/yyyy", { locale: id })}`}
                                              className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500"
                                            />
                                          )}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300"></div>
                                        </div>
                                        <div className="space-y-3 bg-white/70 backdrop-blur-sm p-4 rounded-xl">
                                          <p className="font-bold text-lg text-gray-800">
                                            {format(new Date(record.date), "dd MMM yyyy", { locale: id })}
                                          </p>
                                          <p className="text-gray-600 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            {record.branches?.name} • {formatShiftTime(record.shift_type)}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            {getStatusBadge(record.status)}
                                          </div>
                                          {record.check_in_time && (
                                            <p className="text-sm text-gray-600 font-medium">
                                              🔸 Masuk: {formatTime(record.check_in_time)}
                                            </p>
                                          )}
                                          {record.check_out_time && (
                                            <p className="text-sm text-gray-600 font-medium">
                                              🔹 Keluar: {formatTime(record.check_out_time)}
                                            </p>
                                          )}
                                          {record.total_hours && (
                                            <p className="text-sm text-gray-600 font-medium">
                                              ⏱️ Total: {record.total_hours.toFixed(1)} jam
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button
                                size="lg"
                                className="gap-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl"
                                onClick={() => handleOpenPhotoManager(employee.id, employee.name)}
                              >
                                <Settings className="h-5 w-5" />
                                Kelola Foto
                              </Button>
                            </div>
                          </div>
                          
                          {/* Photo Grid */}
                          <div className="grid grid-cols-4 gap-4">
                            {attendance.data?.slice(0, 4).map((record: AttendanceWithDetails, index: number) => (
                              <div 
                                key={record.id || index} 
                                className="group/thumb relative aspect-square bg-gradient-to-br from-purple-100 to-cyan-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                                style={{
                                  animationDelay: `${index * 100}ms`,
                                  animation: 'zoomIn 0.5s ease-out forwards'
                                }}
                              >
                                {record.check_in_photo || record.check_out_photo ? (
                                  <>
                                    <img
                                      src={record.check_in_photo || record.check_out_photo}
                                      alt={`Presensi ${format(new Date(record.date), "dd/MM", { locale: id })}`}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300">
                                      {format(new Date(record.date), "dd/MM", { locale: id })}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 group-hover/thumb:from-purple-200 group-hover/thumb:to-cyan-200 transition-all duration-300">
                                    <Camera className="h-10 w-10 text-gray-400 group-hover/thumb:text-gray-600 transition-colors duration-300" />
                                  </div>
                                )}
                                
                                {/* Floating badge */}
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-bold text-gray-700 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300">
                                  {record.check_in_photo && record.check_out_photo ? "✅" : record.check_in_photo ? "🔸" : record.check_out_photo ? "🔹" : "📷"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photo Manager Modal */}
        <Dialog open={isPhotoManagerOpen} onOpenChange={handleClosePhotoManager}>
          <DialogContent className="max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl md:rounded-3xl border-0 bg-white/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader className="pb-4 md:pb-8 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-t-2xl md:rounded-t-3xl -mt-6 -mx-6 px-4 md:px-8 py-4 md:py-6">
              <DialogTitle className="text-lg md:text-2xl lg:text-3xl font-bold flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm">
                  <Settings className="h-5 w-5 md:h-6 lg:h-8 md:w-6 lg:w-8" />
                </div>
                <span className="truncate">Manajemen Foto - {selectedEmployeeName}</span>
              </DialogTitle>
              <DialogDescription className="text-purple-100 text-xs md:text-sm lg:text-lg line-clamp-2">
                🎯 Kelola foto presensi karyawan - hapus foto individual atau dalam jumlah banyak
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 md:space-y-8 p-3 md:p-6">
              {/* Enhanced Controls */}
              <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl md:rounded-2xl p-3 md:p-6 border border-purple-200/50">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-6 w-full lg:w-auto">
                    <div className="flex items-center gap-2 md:gap-3 bg-white/70 backdrop-blur-sm px-3 md:px-4 py-2 rounded-lg md:rounded-xl w-full sm:w-auto">
                      <Checkbox 
                        checked={photos.length > 0 && selectedPhotos.size === photos.length}
                        onCheckedChange={handleSelectAll}
                        className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0"
                      />
                      <span className="font-bold text-xs md:text-sm lg:text-base text-gray-800 truncate">
                        Pilih Semua ({selectedPhotos.size}/{photos.length})
                      </span>
                    </div>
                    
                    {selectedPhotos.size > 0 && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold shadow-lg animate-bounce w-full sm:w-auto justify-center">
                        ✨ {selectedPhotos.size} foto dipilih
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 md:gap-4 w-full lg:w-auto">
                    {selectedPhotos.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="flex-1 lg:flex-none gap-2 md:gap-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-lg md:rounded-xl h-9 md:h-10 text-xs md:text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        <span className="truncate">{deleting ? "Menghapus..." : `Hapus ${selectedPhotos.size} Foto`}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Photo Grid */}
              {photos.length === 0 ? (
                <div className="text-center py-12 md:py-24">
                  <div className="relative mb-6 md:mb-8">
                    <div className="w-20 h-20 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                      <Camera className="h-10 w-10 md:h-16 md:w-16 text-white" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-ping opacity-30"></div>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-gray-800 mb-2 md:mb-4">
                    📷 Belum ada foto presensi
                  </p>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600">
                    Belum ada foto presensi untuk karyawan ini
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6">
                  {photos.map((photo, photoIndex) => (
                    <div 
                      key={photo.id} 
                      className="relative group/item transform hover:scale-105 transition-all duration-300"
                      style={{
                        animationDelay: `${photoIndex * 50}ms`,
                        animation: 'slideInUp 0.5s ease-out forwards'
                      }}
                    >
                      {/* Enhanced Selection Checkbox */}
                      <div className="absolute top-2 md:top-3 left-2 md:left-3 z-20">
                        <div className="bg-white/90 backdrop-blur-sm rounded-md md:rounded-lg p-0.5 md:p-1 shadow-lg">
                          <Checkbox
                            checked={selectedPhotos.has(photo.id)}
                            onCheckedChange={() => handleSelectPhoto(photo.id)}
                            className="w-5 h-5 border-2"
                          />
                        </div>
                      </div>

                      {/* Enhanced Photo Type Badge */}
                      <div className="absolute top-3 right-3 z-20">
                        <Badge 
                          className={`${photo.photoType === 'check_in' 
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg" 
                            : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                          } font-bold`}
                        >
                          {photo.photoType === 'check_in' ? '🔸 Masuk' : '🔹 Keluar'}
                        </Badge>
                      </div>

                      {/* Enhanced Photo Container */}
                      <div className="aspect-square bg-gradient-to-br from-purple-100 to-cyan-100 rounded-2xl overflow-hidden shadow-lg group-hover/item:shadow-2xl transition-all duration-300">
                        <img 
                          src={photo.photoUrl} 
                          alt={`${photo.photoType} ${format(new Date(photo.date), 'dd MMM yyyy', { locale: id })}`}
                          className="w-full h-full object-cover cursor-pointer group-hover/item:scale-110 transition-transform duration-500"
                          onClick={() => setPreviewPhoto(photo)}
                        />
                      </div>

                      {/* Enhanced Photo Info */}
                      <div className="p-4 space-y-2 bg-white/70 backdrop-blur-sm rounded-xl mt-3 border border-gray-200/50">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span>{format(new Date(photo.date), 'dd MMM yyyy', { locale: id })}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-cyan-600" />
                          <span className="font-medium">{formatTime(photo.time)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="truncate font-medium">{photo.branchName}</span>
                        </div>
                        
                        <p className="text-xs text-gray-500 font-medium">
                          {formatShiftTime(photo.shiftType)}
                        </p>
                      </div>

                      {/* Enhanced Action Buttons Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 rounded-2xl">
                        <Button
                          size="sm"
                          className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white hover:scale-110 transition-all duration-300 rounded-xl shadow-lg"
                          onClick={() => setPreviewPhoto(photo)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white hover:scale-110 transition-all duration-300 rounded-xl shadow-lg"
                          onClick={() => handleDownloadPhoto(
                            photo.photoUrl, 
                            `${selectedEmployeeName}_${photo.photoType}_${photo.date}_${photo.time}.jpg`
                          )}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          className="bg-red-500/90 backdrop-blur-sm text-white hover:bg-red-500 hover:scale-110 transition-all duration-300 rounded-xl shadow-lg"
                          onClick={() => handleDeleteSingle(photo)}
                          disabled={deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Photo Preview Modal */}
        {previewPhoto && (
          <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
            <DialogContent className="max-w-6xl rounded-3xl border-0 bg-white/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  🖼️ Preview Foto - {format(new Date(previewPhoto.date), 'dd MMM yyyy', { locale: id })}
                </DialogTitle>
                <DialogDescription className="text-lg text-gray-600">
                  {previewPhoto.photoType === 'check_in' ? '🔸 Foto Check-in' : '🔹 Foto Check-out'} - {formatTime(previewPhoto.time)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-8">
                <div className="flex justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                  <img 
                    src={previewPhoto.photoUrl} 
                    alt="Preview"
                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl"
                  />
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl p-6 border border-purple-200/50">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <p className="text-gray-700 font-bold flex items-center gap-3 text-lg">
                        <MapPin className="w-5 h-5 text-purple-600" />
                        {previewPhoto.branchName} • {formatShiftTime(previewPhoto.shiftType)}
                      </p>
                      <p className="text-gray-600 flex items-center gap-3 text-lg">
                        <Clock className="w-5 h-5 text-cyan-600" />
                        {format(new Date(previewPhoto.date), 'dd MMM yyyy', { locale: id })} - {formatTime(previewPhoto.time)}
                      </p>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleDownloadPhoto(
                          previewPhoto.photoUrl, 
                          `${selectedEmployeeName}_${previewPhoto.photoType}_${previewPhoto.date}_${previewPhoto.time}.jpg`
                        )}
                        className="gap-3 bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:scale-105 transition-all duration-300 rounded-xl shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </Button>
                      
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={() => {
                          handleDeleteSingle(previewPhoto)
                          setPreviewPhoto(null)
                        }}
                        disabled={deleting}
                        className="gap-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 hover:scale-105 transition-all duration-300 rounded-xl shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                        {deleting ? "🔄 Menghapus..." : "🗑️ Hapus"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}