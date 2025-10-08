"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, CheckCircle, XCircle, DollarSign, Plus, Eye, Calendar, Loader2, FileText, User } from "lucide-react"
import { getKasbonRequests, createKasbonRequest, getEmployees, type KasbonWithUser, type User } from "@/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export function KasbonSystem() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedKasbon, setSelectedKasbon] = useState<KasbonWithUser | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addKasbonLoading, setAddKasbonLoading] = useState(false)
  const [myKasbonRequests, setMyKasbonRequests] = useState<KasbonWithUser[]>([])
  const [allEmployees, setAllEmployees] = useState<User[]>([])

  const [newKasbon, setNewKasbon] = useState({
    user_id: "",
    amount: "",
    reason: "",
    due_date: "",
    notes: "",
  })


  const fetchKasbonData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Ambil SEMUA permintaan kasbon
      const kasbonResult = await getKasbonRequests() // Hapus filter
      if (kasbonResult.error) throw new Error(kasbonResult.error.message)
      setMyKasbonRequests(kasbonResult.data)

      // Ambil SEMUA karyawan
      const employeesResult = await getEmployees()
      if (employeesResult.error) throw new Error(employeesResult.error.message)
      setAllEmployees(employeesResult.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data")
      console.error("Error fetching kasbon data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKasbonData()
  }, [])

  const handleAddKasbon = async () => {
    try {
      setAddKasbonLoading(true)
      setError(null)

      if (!newKasbon.user_id || !newKasbon.amount || !newKasbon.reason) {
        setError("Mohon pilih karyawan, isi jumlah, dan alasan pengajuan")
        return
      }

      const result = await createKasbonRequest({
        user_id: newKasbon.user_id,
        amount: Number.parseFloat(parseInputCurrency(newKasbon.amount)),
        reason: newKasbon.reason,
        due_date: newKasbon.due_date || undefined,
        notes: newKasbon.notes || undefined,
      })

      if (result.error) throw new Error(result.error.message)

      setNewKasbon({
        user_id: "",
        amount: "",
        reason: "",
        due_date: "",
        notes: "",
      })
      setShowAddDialog(false)
      await fetchKasbonData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan kasbon")
    } finally {
      setAddKasbonLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "paid":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu Persetujuan"
      case "approved":
        return "Disetujui"
      case "rejected":
        return "Ditolak"
      case "paid":
        return "Sudah Dibayar"
      default:
        return "Unknown"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatInputCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    if (numericValue === "") return ""
    return new Intl.NumberFormat("id-ID").format(Number.parseInt(numericValue))
  }

  const parseInputCurrency = (formattedValue: string) => {
    return formattedValue.replace(/\D/g, "")
  }

  const myStats = {
    pending: myKasbonRequests.filter((k) => k.status === "pending").reduce((sum, k) => sum + k.amount, 0),
    approved: myKasbonRequests.filter((k) => k.status === "approved").reduce((sum, k) => sum + k.amount, 0),
    rejected: myKasbonRequests.filter((k) => k.status === "rejected").length,
    total: myKasbonRequests.reduce((sum, k) => sum + k.amount, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Memuat data kasbon Anda...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header - Responsif untuk semua perangkat */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kasbon Saya</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Kelola pengajuan kasbon dan lihat status persetujuan</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-300 text-sm md:text-base">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              Ajukan Kasbon Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Ajukan Kasbon Baru</DialogTitle>
              <DialogDescription className="text-sm md:text-base">Isi form berikut untuk mengajukan kasbon</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="employee" className="text-sm md:text-base">Karyawan *</Label>
                <Select
                  value={newKasbon.user_id}
                  onValueChange={(value) => setNewKasbon({ ...newKasbon, user_id: value })}
                  disabled={addKasbonLoading}
                >
                  <SelectTrigger id="employee" className="text-sm md:text-base">
                    <SelectValue placeholder="Pilih karyawan yang mengajukan" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id} className="text-sm md:text-base">
                        {employee.name} - ({employee.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount" className="text-sm md:text-base">Jumlah Kasbon *</Label>
                <Input
                  id="amount"
                  type="text"
                  placeholder="Masukkan jumlah kasbon"
                  value={formatInputCurrency(newKasbon.amount)}
                  onChange={(e) => {
                    const rawValue = parseInputCurrency(e.target.value)
                    setNewKasbon({ ...newKasbon, amount: rawValue })
                  }}
                  disabled={addKasbonLoading}
                  className="text-base md:text-lg"
                />
                {newKasbon.amount && (
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    Preview: {formatCurrency(Number(newKasbon.amount) || 0)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="reason" className="text-sm md:text-base">Alasan Kasbon *</Label>
                <Textarea
                  id="reason"
                  placeholder="Jelaskan alasan pengajuan kasbon (contoh: keperluan mendadak, biaya pengobatan, dll)"
                  value={newKasbon.reason}
                  onChange={(e) => setNewKasbon({ ...newKasbon, reason: e.target.value })}
                  disabled={addKasbonLoading}
                  rows={3}
                  className="text-sm md:text-base"
                />
              </div>
              <div>
                <Label htmlFor="due_date" className="text-sm md:text-base">Tanggal Jatuh Tempo (Opsional)</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newKasbon.due_date}
                  onChange={(e) => setNewKasbon({ ...newKasbon, due_date: e.target.value })}
                  disabled={addKasbonLoading}
                  className="text-sm md:text-base"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-sm md:text-base">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan untuk atasan"
                  value={newKasbon.notes}
                  onChange={(e) => setNewKasbon({ ...newKasbon, notes: e.target.value })}
                  disabled={addKasbonLoading}
                  rows={2}
                  className="text-sm md:text-base"
                />
              </div>
              <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addKasbonLoading} className="text-sm md:text-base">
                  Batal
                </Button>
                <Button onClick={handleAddKasbon} className="bg-red-600 hover:bg-red-700" disabled={addKasbonLoading} className="text-sm md:text-base">
                  {addKasbonLoading && <Loader2 className="h-4 w-4 mr-1 md:mr-2 animate-spin" />}
                  Ajukan Kasbon
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards - Responsif untuk semua perangkat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-yellow-500 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Menunggu Persetujuan</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{formatCurrency(myStats.pending)}</div>
            <p className="text-xs text-muted-foreground">
              {myKasbonRequests.filter((k) => k.status === "pending").length} pengajuan
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Disetujui</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(myStats.approved)}</div>
            <p className="text-xs text-muted-foreground">Siap dicairkan</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Ditolak</CardTitle>
            <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{myStats.rejected}</div>
            <p className="text-xs text-muted-foreground">Pengajuan ditolak</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Total Kasbon</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(myStats.total)}</div>
            <p className="text-xs text-muted-foreground">Sepanjang masa</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-4 md:space-y-6">
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="current" className="flex-1 text-xs md:text-sm">Kasbon Aktif</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs md:text-sm">Riwayat Kasbon</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <FileText className="h-4 w-4 md:h-5 md:w-5" />
                Kasbon Aktif Saya
              </CardTitle>
              <CardDescription className="text-sm md:text-base">Daftar kasbon yang sedang dalam proses atau sudah disetujui</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {myKasbonRequests
                  .filter((k) => k.status === "pending" || k.status === "approved")
                  .map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border rounded-lg md:rounded-xl bg-gradient-to-r from-white to-gray-50 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-0">
                        <div className="p-2 md:p-3 bg-primary/10 rounded-full">
                          <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base md:text-lg">{formatCurrency(request.amount)}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground font-medium">
                            Diajukan: {new Date(request.request_date).toLocaleDateString("id-ID")}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 md:max-w-96">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
                        <Badge className={`${getStatusColor(request.status)} font-semibold text-xs md:text-sm px-2 md:px-3 py-1`}>
                          {getStatusText(request.status)}
                        </Badge>
                        <Dialog
                          open={showDetailDialog && selectedKasbon?.id === request.id}
                          onOpenChange={(open) => {
                            setShowDetailDialog(open)
                            if (!open) setSelectedKasbon(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedKasbon(request)}
                              className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-xs md:text-sm"
                            >
                              <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              Detail
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] md:max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-lg md:text-xl">Detail Kasbon</DialogTitle>
                              <DialogDescription className="text-sm md:text-base">Informasi lengkap pengajuan kasbon Anda</DialogDescription>
                            </DialogHeader>
                            {selectedKasbon && (
                              <div className="space-y-3 md:space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                  <div className="space-y-1 md:space-y-2">
                                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Jumlah Kasbon</Label>
                                    <p className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                      {formatCurrency(selectedKasbon.amount)}
                                    </p>
                                  </div>
                                  <div className="space-y-1 md:space-y-2">
                                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Status</Label>
                                    <Badge className={`${getStatusColor(selectedKasbon.status)} font-semibold text-xs md:text-sm`}>
                                      {getStatusText(selectedKasbon.status)}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1 md:space-y-2">
                                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Tanggal Pengajuan</Label>
                                    <p className="text-sm md:text-base">
                                      {new Date(selectedKasbon.request_date).toLocaleDateString("id-ID")}
                                    </p>
                                  </div>
                                  {selectedKasbon.due_date && (
                                    <div className="space-y-1 md:space-y-2">
                                      <Label className="text-xs md:text-sm font-semibold text-gray-700">Jatuh Tempo</Label>
                                      <p className="text-sm md:text-base">
                                        {new Date(selectedKasbon.due_date).toLocaleDateString("id-ID")}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                  <Label className="text-xs md:text-sm font-semibold text-gray-700">Alasan Kasbon</Label>
                                  <p className="text-sm md:text-base bg-gray-50 p-3 rounded-lg">{selectedKasbon.reason}</p>
                                </div>
                                {selectedKasbon.notes && (
                                  <div className="space-y-1 md:space-y-2">
                                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Catatan</Label>
                                    <p className="text-sm md:text-base bg-gray-50 p-3 rounded-lg">{selectedKasbon.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                {myKasbonRequests.filter((k) => k.status === "pending" || k.status === "approved").length === 0 && (
                  <div className="text-center py-8 md:py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-base md:text-lg font-medium">Tidak ada kasbon aktif</p>
                    <p className="text-xs md:text-sm">Ajukan kasbon baru untuk memulai</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                Riwayat Kasbon
              </CardTitle>
              <CardDescription className="text-sm md:text-base">Semua pengajuan kasbon yang pernah Anda buat</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {myKasbonRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`p-2 rounded-full ${request.status === "approved"
                          ? "bg-green-100"
                          : request.status === "rejected"
                            ? "bg-red-100"
                            : request.status === "paid"
                              ? "bg-blue-100"
                              : "bg-yellow-100"
                          }`}
                      >
                        {request.status === "approved" ? (
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                        ) : request.status === "rejected" ? (
                          <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
                        ) : request.status === "paid" ? (
                          <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                        ) : (
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm md:text-base">{formatCurrency(request.amount)}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {new Date(request.request_date).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <Badge className={`${getStatusColor(request.status)} font-medium text-xs md:text-sm`}>
                        {getStatusText(request.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {myKasbonRequests.length === 0 && (
                  <div className="text-center py-8 md:py-12 text-muted-foreground">
                    <User className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-base md:text-lg font-medium">Belum ada riwayat kasbon</p>
                    <p className="text-xs md:text-sm">Riwayat pengajuan kasbon akan muncul di sini</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}