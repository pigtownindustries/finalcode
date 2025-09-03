"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Check, X, Clock, DollarSign, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface KasbonRequest {
  id: string
  user_id: string
  amount: number
  reason: string
  status: "pending" | "approved" | "rejected" | "paid"
  created_at: string
  approved_at?: string
  approved_by?: string
  notes?: string
  user?: {
    name: string
    email: string
    role: string
  }
  approver?: {
    name: string
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function KasbonManagement() {
  const [kasbonRequests, setKasbonRequests] = useState<KasbonRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingKasbon, setEditingKasbon] = useState<KasbonRequest | null>(null)
  const [formData, setFormData] = useState({
    user_id: "",
    amount: "",
    reason: "",
    status: "pending" as "pending" | "approved" | "rejected" | "paid",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .neq("role", "owner")

      if (usersError) throw usersError
      setUsers(usersData || [])

      // Fetch kasbon requests
      const { data: kasbonData, error: kasbonError } = await supabase
        .from("kasbon")
        .select(`
          *,
          user:users!kasbon_user_id_fkey(name, email, role),
          approver:users!kasbon_approved_by_fkey(name)
        `)
        .order("created_at", { ascending: false })

      if (kasbonError) throw kasbonError
      setKasbonRequests(kasbonData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data kasbon",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected" | "paid", notes?: string) => {
    try {
      let currentUserId = null;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      } catch (authError) {
        console.log("[v0] Auth error, using fallback owner ID");
      }

      // Fallback to owner user from database if auth fails
      if (!currentUserId) {
        const { data: ownerData } = await supabase.from("users").select("id").eq("role", "owner").single();
        currentUserId = ownerData?.id;
      }

      if (!currentUserId) {
        throw new Error("Tidak dapat mengidentifikasi pengguna saat ini untuk approval.");
      }

      // ======================================================
      // DEBUGGING: Lihat ID siapa yang digunakan untuk approval
      console.log("Mencoba update dengan ID approver:", currentUserId);
      // ======================================================

      const { error } = await supabase
        .from("kasbon")
        .update({
          status,
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          notes: notes || undefined, // Gunakan undefined agar tidak menimpa dengan string kosong
        })
        .eq("id", id);

      if (error) throw error;

      const statusText = status === "approved" ? "disetujui" : status === "rejected" ? "ditolak" : "dibayar";
      toast({ title: "Berhasil", description: `Kasbon berhasil ${statusText}` });
      fetchData();
    } catch (error) {
      let errorMessage = "Gagal mengupdate status kasbon.";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Tampilkan error yang sebenarnya di console
      console.error("Error updating status:", JSON.stringify(error, null, 2)); 
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let currentUserId = null;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      } catch (authError) {
        console.log("[v0] Auth error, using fallback owner ID");
      }

      if (!currentUserId) {
        const { data: ownerData } = await supabase.from("users").select("id").eq("role", "owner").single();
        currentUserId = ownerData?.id;
      }

      const kasbonData = {
        user_id: formData.user_id,
        amount: Number(formData.amount),
        reason: formData.reason,
        status: formData.status,
        notes: formData.notes,
        ...(formData.status !== "pending" &&
          currentUserId && {
            approved_by: currentUserId,
            approved_at: new Date().toISOString(),
          }),
      };

      if (editingKasbon) {
        const { error } = await supabase.from("kasbon").update(kasbonData).eq("id", editingKasbon.id);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Kasbon berhasil diperbarui" });
      } else {
        const { error } = await supabase.from("kasbon").insert([
          {
            ...kasbonData,
          },
        ]);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Kasbon berhasil ditambahkan" });
      }

      setIsDialogOpen(false);
      setEditingKasbon(null);
      setFormData({ user_id: "", amount: "", reason: "", status: "pending", notes: "" });
      fetchData();
    } catch (error) {
      let errorMessage = "Gagal menyimpan kasbon.";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Tampilkan error yang sebenarnya di console
      console.error("Error saving kasbon:", JSON.stringify(error, null, 2)); 
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (kasbon: KasbonRequest) => {
    setEditingKasbon(kasbon)
    setFormData({
      user_id: kasbon.user_id,
      amount: kasbon.amount.toString(),
      reason: kasbon.reason,
      status: kasbon.status,
      notes: kasbon.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kasbon ini?")) return

    try {
      const { error } = await supabase.from("kasbon").delete().eq("id", id)

      if (error) throw error
      toast({ title: "Berhasil", description: "Kasbon berhasil dihapus" })
      fetchData()
    } catch (error) {
      console.error("Error deleting kasbon:", error)
      toast({
        title: "Error",
        description: "Gagal menghapus kasbon",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({ user_id: "", amount: "", reason: "", status: "pending", notes: "" })
    setEditingKasbon(null)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      paid: "outline",
    } as const

    const labels = {
      pending: "Menunggu",
      approved: "Disetujui",
      rejected: "Ditolak",
      paid: "Dibayar",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const totalPending = kasbonRequests.filter((k) => k.status === "pending").length
  const totalApproved = kasbonRequests.filter((k) => k.status === "approved").length
  const totalAmount = kasbonRequests.filter((k) => k.status === "approved").reduce((sum, k) => sum + k.amount, 0)
  const thisMonthRequests = kasbonRequests.filter(
    (k) => new Date(k.created_at).getMonth() === new Date().getMonth(),
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Management Kasbon</h2>
          <p className="text-muted-foreground">Kelola pengajuan kasbon dari karyawan</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kasbon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingKasbon ? "Edit Kasbon" : "Tambah Kasbon"}</DialogTitle>
              <DialogDescription>Kelola pengajuan kasbon karyawan</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="user_id">Karyawan</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Jumlah</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Masukkan jumlah kasbon"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reason">Alasan</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Jelaskan alasan kasbon"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Menunggu</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="paid">Dibayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">{editingKasbon ? "Perbarui" : "Tambah"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Menunggu Persetujuan</TabsTrigger>
          <TabsTrigger value="all">Semua Kasbon</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menunggu Persetujuan</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{thisMonthRequests}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kasbon Menunggu Persetujuan</CardTitle>
              <CardDescription>Kasbon yang perlu ditinjau dan disetujui</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kasbonRequests
                    .filter((k) => k.status === "pending")
                    .map((kasbon) => (
                      <TableRow key={kasbon.id}>
                        <TableCell>{new Date(kasbon.created_at).toLocaleDateString("id-ID")}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{kasbon.user?.name}</div>
                            <div className="text-sm text-muted-foreground">{kasbon.user?.role}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(kasbon.amount)}</TableCell>
                        <TableCell>{kasbon.reason}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(kasbon.id, "approved")}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(kasbon.id, "rejected")}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(kasbon)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semua Kasbon</CardTitle>
              <CardDescription>Riwayat lengkap semua pengajuan kasbon</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Disetujui Oleh</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kasbonRequests.map((kasbon) => (
                    <TableRow key={kasbon.id}>
                      <TableCell>{new Date(kasbon.created_at).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{kasbon.user?.name}</div>
                          <div className="text-sm text-muted-foreground">{kasbon.user?.role}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(kasbon.amount)}</TableCell>
                      <TableCell>{getStatusBadge(kasbon.status)}</TableCell>
                      <TableCell>{kasbon.reason}</TableCell>
                      <TableCell>{kasbon.approver?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {kasbon.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(kasbon.id, "paid")}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Bayar
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEdit(kasbon)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(kasbon.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
