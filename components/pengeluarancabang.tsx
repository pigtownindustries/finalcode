"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Building2,
  Zap,
  Wrench,
  ShoppingBag,
  Users,
  Car,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react"
import {
  getExpenses,
  getExpenseStatistics,
  createExpenseRequest,
  getBranches,
  type Branch,
  updateExpenseRequest,
  deleteExpenseRequest,
  supabase,
  setupGlobalEventsListener,
  broadcastTransactionEvent,
} from "@/lib/supabase"

interface Expense {
  id: string
  branch_id?: string
  category: string
  description: string
  amount: number
  status: "pending" | "approved" | "rejected" | "paid"
  expense_date: string
  receipt_url?: string
  notes?: string
  rejection_reason?: string
  created_at: string
  updated_at?: string
  branches?: { id: string; name: string }
}

export function PengeluaranCabang() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [statistics, setStatistics] = useState({
    totalExpenses: 0,
    averagePerTransaction: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null)

  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    branch_id: "",
    notes: "",
  })

  const categories = [
    { id: "utilities", name: "Utilitas", icon: Zap, color: "bg-yellow-100 text-yellow-800" },
    { id: "equipment", name: "Peralatan", icon: Wrench, color: "bg-blue-100 text-blue-800" },
    { id: "supplies", name: "Supplies", icon: ShoppingBag, color: "bg-green-100 text-green-800" },
    { id: "salary", name: "Gaji", icon: Users, color: "bg-purple-100 text-purple-800" },
    { id: "transportation", name: "Transportasi", icon: Car, color: "bg-orange-100 text-orange-800" },
    { id: "marketing", name: "Marketing", icon: FileText, color: "bg-pink-100 text-pink-800" },
    { id: "maintenance", name: "Maintenance", icon: Wrench, color: "bg-gray-100 text-gray-800" },
  ]

  useEffect(() => {
    loadData()
    setupRealtimeSubscription()
    
    const globalChannel = setupGlobalEventsListener((event, payload) => {
      if (event === 'expense_deleted' || event === 'expense_updated') {
        console.log('Expense event received:', event, payload)
        loadData()
      }
    })

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [selectedBranch])

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'expenses' 
        }, 
        (payload) => {
          console.log('🔄 Real-time update received:', payload)
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [expensesResult, statsResult, branchesResult] = await Promise.all([
        getExpenses(selectedBranch === "all" ? undefined : selectedBranch),
        getExpenseStatistics(selectedBranch === "all" ? undefined : selectedBranch),
        getBranches()
      ])

      if (expensesResult.data) setExpenses(expensesResult.data)
      if (statsResult.data) setStatistics(statsResult.data)
      if (branchesResult.data) setBranches(branchesResult.data)

    } catch (error) {
      console.error("Error loading expense data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesBranch = selectedBranch === "all" || expense.branch_id === selectedBranch
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory
    return matchesBranch && matchesCategory
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 hover:bg-green-100"
      case "pending": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "rejected": return "bg-red-100 text-red-800 hover:bg-red-100"
      case "paid": return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />
      case "pending": return <Clock className="h-4 w-4" />
      case "rejected": return <XCircle className="h-4 w-4" />
      case "paid": return <DollarSign className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved": return "Disetujui"
      case "pending": return "Menunggu Persetujuan"
      case "rejected": return "Ditolak"
      case "paid": return "Lunas"
      default: return "Unknown"
    }
  }

  const getCategoryInfo = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId) || categories[0]
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatInputNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const unformatInputNumber = (value: string) => {
    return value.replace(/\./g, "")
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? "Tanggal tidak valid" : date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    } catch {
      return "Tanggal tidak valid"
    }
  }

  const handleAddExpense = async () => {
    try {
      const expenseData = {
        ...newExpense,
        amount: Number.parseInt(unformatInputNumber(newExpense.amount)),
      }

      const result = await createExpenseRequest(expenseData)

      if (result.data) {
        await loadData()
        setNewExpense({
          description: "",
          amount: "",
          category: "",
          branch_id: "",
          notes: "",
        })
        setIsAddDialogOpen(false)
      }
    } catch (error) {
      console.error("Error creating expense:", error)
    }
  }

  const handleEditExpense = async () => {
    if (!currentExpense) return
    
    try {
      const expenseData = {
        ...currentExpense,
        amount: Number(currentExpense.amount),
      }

      const result = await updateExpenseRequest(currentExpense.id, expenseData)

      if (result.data) {
        await loadData()
        setIsEditDialogOpen(false)
        setCurrentExpense(null)
        await broadcastTransactionEvent('expense_updated', { expenseId: currentExpense.id })
      }
    } catch (error) {
      console.error("Error updating expense:", error)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpenseRequest(id)
      await loadData()
      await broadcastTransactionEvent('expense_deleted', { expenseId: id })
    } catch (error) {
      console.error("Error deleting expense:", error)
    }
  }

  const openEditDialog = (expense: Expense) => {
    setCurrentExpense(expense)
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (expense: Expense) => {
    setCurrentExpense(expense)
    setIsViewDialogOpen(true)
  }

  const totalExpenses = statistics.totalExpenses

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pengajuan Pengeluaran Outlet</h1>
          <p className="text-muted-foreground">
            Ajukan pengeluaran harian outlet - untuk pengeluaran besar &gt;Rp 1.000.000 hubungi owner
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Ajukan Pengeluaran
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajukan Pengeluaran Outlet</DialogTitle>
                <DialogDescription>
                  Ajukan pengeluaran harian outlet - untuk pengeluaran besar &gt;Rp 1.000.000 hubungi owner
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cabang</Label>
                  <Select
                    value={newExpense.branch_id}
                    onValueChange={(value) => setNewExpense({ ...newExpense, branch_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih cabang" />
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
                  <Label htmlFor="amount">Jumlah</Label>
                  <Input
                    id="amount"
                    value={newExpense.amount}
                    onChange={(e) => {
                      const formatted = formatInputNumber(e.target.value)
                      setNewExpense({ ...newExpense, amount: formatted })
                    }}
                    placeholder="500.000"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Deskripsi detail pengeluaran..."
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Catatan (Opsional)</Label>
                  <Textarea
                    id="notes"
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    placeholder="Catatan tambahan..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleAddExpense}>Ajukan Pengeluaran</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran Diajukan</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata per Pengajuan</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatPrice(statistics.averagePerTransaction)}</div>
            <p className="text-xs text-muted-foreground">Per transaksi</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 flex-wrap p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48 bg-white">
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
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Filter kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-red-50">
          <TabsTrigger value="list" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Daftar Pengajuan
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Per Kategori
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Belum ada pengajuan</h3>
                <p className="text-gray-500">Mulai dengan mengajukan pengeluaran pertama Anda</p>
              </CardContent>
            </Card>
          ) : (
            filteredExpenses.map((expense) => {
              const categoryInfo = getCategoryInfo(expense.category)
              const branchName = expense.branch_id 
                ? branches.find(b => b.id === expense.branch_id)?.name 
                : "Semua Cabang"
              
              return (
                <Card key={expense.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <categoryInfo.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 
                                className="font-semibold text-lg cursor-pointer hover:text-red-600 transition-colors"
                                onClick={() => openViewDialog(expense)}
                              >
                                {expense.description}
                              </h3>
                              <p className="text-sm text-muted-foreground">{expense.notes}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-red-600">{formatPrice(expense.amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(expense.expense_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
                              <Building2 className="h-3 w-3 text-red-600" />
                              <span className="text-red-700">{branchName}</span>
                            </div>
                            <Badge className={categoryInfo.color}>{categoryInfo.name}</Badge>
                            <Badge className={`${getStatusColor(expense.status)} flex items-center gap-1`}>
                              {getStatusIcon(expense.status)}
                              {getStatusText(expense.status)}
                            </Badge>
                          </div>
                          {expense.status === "rejected" && expense.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-sm text-red-700">
                                <strong>Alasan Penolakan:</strong> {expense.rejection_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {expense.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditDialog(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {expense.status !== "pending" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openViewDialog(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const categoryExpenses = filteredExpenses.filter((e) => e.category === category.id)
              const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
              return (
                <Card key={category.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <category.icon className="h-5 w-5" />
                      {category.name}
                    </CardTitle>
                    <CardDescription>{categoryExpenses.length} pengajuan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 mb-4">{formatPrice(categoryTotal)}</div>
                    <div className="space-y-2">
                      {categoryExpenses.slice(0, 3).map((expense) => (
                        <div key={expense.id} className="flex justify-between text-sm">
                          <span className="truncate">{expense.description}</span>
                          <span className="font-medium">{formatPrice(expense.amount)}</span>
                        </div>
                      ))}
                      {categoryExpenses.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{categoryExpenses.length - 3} lainnya</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pengajuan Pengeluaran</DialogTitle>
            <DialogDescription>
              Edit detail pengajuan pengeluaran
            </DialogDescription>
          </DialogHeader>
          {currentExpense && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={currentExpense.category}
                  onValueChange={(value) => setCurrentExpense({ ...currentExpense, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <category.icon className="h-4 w-4" />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cabang</Label>
                <Select
                  value={currentExpense.branch_id || ""}
                  onValueChange={(value) => setCurrentExpense({ ...currentExpense, branch_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang" />
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
                <Label htmlFor="edit-amount">Jumlah</Label>
                <Input
                  id="edit-amount"
                  value={formatInputNumber(currentExpense.amount.toString())}
                  onChange={(e) => {
                    const formatted = formatInputNumber(e.target.value)
                    setCurrentExpense({ ...currentExpense, amount: Number(unformatInputNumber(formatted)) })
                  }}
                  placeholder="500.000"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Textarea
                  id="edit-description"
                  value={currentExpense.description}
                  onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                  placeholder="Deskripsi detail pengeluaran..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-notes">Catatan (Opsional)</Label>
                <Textarea
                  id="edit-notes"
                  value={currentExpense.notes || ""}
                  onChange={(e) => setCurrentExpense({ ...currentExpense, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditExpense}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan Pengeluaran</DialogTitle>
          </DialogHeader>
          {currentExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Kategori</Label>
                  <p className="font-medium">
                    {getCategoryInfo(currentExpense.category).name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cabang</Label>
                  <p className="font-medium">
                    {currentExpense.branch_id 
                      ? branches.find(b => b.id === currentExpense.branch_id)?.name 
                      : "Semua Cabang"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jumlah</Label>
                  <p className="font-medium text-red-600">{formatPrice(currentExpense.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(currentExpense.status)}>
                    {getStatusText(currentExpense.status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tanggal Pengajuan</Label>
                  <p className="font-medium">{formatDate(currentExpense.expense_date)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Deskripsi</Label>
                <p className="font-medium">{currentExpense.description}</p>
              </div>
              {currentExpense.status === "rejected" && currentExpense.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <Label className="text-muted-foreground">Alasan Penolakan</Label>
                  <p className="font-medium text-red-700">{currentExpense.rejection_reason}</p>
                </div>
              )}
              {currentExpense.notes && (
                <div>
                  <Label className="text-muted-foreground">Catatan</Label>
                  <p className="font-medium">{currentExpense.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}