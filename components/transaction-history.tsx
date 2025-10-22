"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Download, Eye, RefreshCw, Trash2, Edit, Plus, Minus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  supabase, 
  setupTransactionsRealtime, 
  Transaction, 
  Branch, 
  subscribeToEvents,
  broadcastTransactionEvent
} from "../lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface TransactionItem {
  id: string
  service_id: string
  quantity: number
  unit_price: number
  total_price: number
  service?: {
    name: string
    price: number
  }
}

interface EditTransactionData {
  customer_name: string
  payment_method: string
  payment_status: string
  notes: string
  discount_amount: number
  discount_type: "percentage" | "fixed"
  discount_value: string
  discount_reason: string
  items: TransactionItem[]
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)

  // State untuk filter
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBranch, setFilterBranch] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // Filter waktu yang fleksibel
  const [dateFilter, setDateFilter] = useState("today")
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split("T")[0])
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split("T")[0])

  // State untuk modal detail
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // State untuk modal edit
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<EditTransactionData>({
    customer_name: "",
    payment_method: "cash",
    payment_status: "completed",
    notes: "",
    discount_amount: 0,
    discount_type: "percentage",
    discount_value: "",
    discount_reason: "",
    items: []
  })

  // State untuk modal export
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split("T")[0])
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split("T")[0])
  const [exportLoading, setExportLoading] = useState(false)
  const [exportBranch, setExportBranch] = useState("all")

  // State untuk fitur hapus
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false)

  // State untuk status dinamis
  const [statuses, setStatuses] = useState<string[]>([])
  const [services, setServices] = useState<any[]>([])

  const { toast } = useToast()

  const fetchBranches = async () => {
    try {
      setBranchesLoading(true)
      const { data, error } = await supabase.from("branches").select("id, name").order("name")
      if (error) throw error
      setBranches(data || [])
    } catch (error) {
      console.error("Error fetching branches:", error)
      toast({ title: "Error", description: "Gagal memuat data cabang.", variant: "destructive" })
    } finally {
      setBranchesLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("id, name, price")
      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase.from("transactions").select("payment_status")
      if (error) throw error
      if (data) {
        const uniqueStatuses = [...new Set(data.map((tx) => tx.payment_status).filter(Boolean))]
        setStatuses(uniqueStatuses)
      }
    } catch (error) {
      console.error("Error fetching statuses:", error)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let startDate: string = now.toISOString().split("T")[0]
    let endDate: string = now.toISOString().split("T")[0]

    switch (dateFilter) {
      case "today":
        startDate = now.toISOString().split("T")[0]
        endDate = startDate
        break

      case "this_week":
        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        startDate = startOfWeek.toISOString().split("T")[0]

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endDate = endOfWeek.toISOString().split("T")[0]
        break

      case "this_month":
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`
        break

      case "custom":
        startDate = customStartDate
        endDate = customEndDate
        break
    }

    return { startDate, endDate }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      const { startDate, endDate } = getDateRange()

      console.log("Fetching transactions for date range:", startDate, "to", endDate)

      let query = supabase
        .from("transactions")
        .select(`
          *,
          branches!left(id, name),
          cashier:users!cashier_id(id, name),
          transaction_items(*, services(name, price))
        `)
        .gte("created_at", `${startDate}T00:00:00+00:00`)
        .lte("created_at", `${endDate}T23:59:59+00:00`)
        .order("created_at", { ascending: false })

      if (filterBranch !== "all") {
        query = query.eq("branch_id", filterBranch)
      }

      const { data: transactionsData, error } = await query

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log("Fetched transactions:", transactionsData?.length || 0)

      if (transactionsData && transactionsData.length > 0) {
        const enrichedTransactions = transactionsData.map((transaction) => ({
          ...transaction,
          cashier: transaction.cashier ? { name: transaction.cashier.name } : null,
          branch: transaction.branches ? { name: transaction.branches.name } : null,
        }))

        setTransactions(enrichedTransactions)
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error Database",
        description: error instanceof Error ? error.message : "Gagal memuat data transaksi.",
        variant: "destructive",
      })
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return
    
    try {
      const { error: itemsError } = await supabase
        .from("transaction_items")
        .delete()
        .eq("transaction_id", transactionToDelete.id)

      if (itemsError) throw itemsError

      const { error: transactionError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionToDelete.id)

      if (transactionError) throw transactionError

      // 🔥 KIRIM BROADCAST EVENT UNTUK SEMUA KOMPONEN
      await broadcastTransactionEvent('transaction_deleted', {
        transaction_id: transactionToDelete.id,
        branch_id: transactionToDelete.branch_id
      })

      toast({
        title: "Berhasil",
        description: `Transaksi #${transactionToDelete.transaction_number} telah dihapus.`,
      })

      await fetchTransactions()
      
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus transaksi.",
        variant: "destructive",
      })
    } finally {
      setIsConfirmDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  const handleOpenEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setEditData({
      customer_name: transaction.customer_name || "",
      payment_method: transaction.payment_method || "cash",
      payment_status: transaction.payment_status || "completed",
      notes: transaction.notes || "",
      discount_amount: transaction.discount_amount || 0,
      discount_type: "percentage",
      discount_value: "",
      discount_reason: "",
      items: transaction.transaction_items || []
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedTransaction) return

    setIsEditing(true)
    try {
      // Update transaction data
      const { error: transactionError } = await supabase
        .from("transactions")
        .update({
          customer_name: editData.customer_name,
          payment_method: editData.payment_method,
          payment_status: editData.payment_status,
          notes: editData.notes,
          discount_amount: editData.discount_amount,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedTransaction.id)

      if (transactionError) throw transactionError

      // Update transaction items
      for (const item of editData.items) {
        const { error: itemError } = await supabase
          .from("transaction_items")
          .update({
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price
          })
          .eq("id", item.id)

        if (itemError) throw itemError
      }

      // 🔥 BROADCAST EVENT UNTUK UPDATE
      await broadcastTransactionEvent('transaction_updated', {
        transaction_id: selectedTransaction.id,
        branch_id: selectedTransaction.branch_id
      })

      toast({
        title: "Berhasil",
        description: `Transaksi #${selectedTransaction.transaction_number} berhasil diperbarui.`,
      })

      setShowEditModal(false)
      await fetchTransactions()

    } catch (error) {
      console.error("Error updating transaction:", error)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat memperbarui transaksi.",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return
    
    setEditData(prev => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        quantity: newQuantity,
        total_price: newQuantity * newItems[index].unit_price
      }
      return { ...prev, items: newItems }
    })
  }

  const updateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return
    
    setEditData(prev => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        unit_price: newPrice,
        total_price: newItems[index].quantity * newPrice
      }
      return { ...prev, items: newItems }
    })
  }

  const addNewItem = () => {
    setEditData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `new-${Date.now()}`,
          service_id: "",
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          service: { name: "Pilih Layanan", price: 0 }
        }
      ]
    }))
  }

  const removeItem = (index: number) => {
    setEditData(prev => {
      const newItems = [...prev.items]
      newItems.splice(index, 1)
      return { ...prev, items: newItems }
    })
  }

  const updateItemService = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    setEditData(prev => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        service_id: serviceId,
        unit_price: service.price,
        total_price: newItems[index].quantity * service.price,
        service: { name: service.name, price: service.price }
      }
      return { ...prev, items: newItems }
    })
  }

  useEffect(() => {
    fetchTransactions()
    fetchBranches()
    fetchStatuses()
    fetchServices()

    // 🔥 GUNAKAN SETUP GLOBAL YANG BARU
    const transactionsChannel = setupTransactionsRealtime(() => {
      console.log("Transaction change detected, refreshing data...")
      fetchTransactions()
    })

    // 🔥 LISTEN UNTUK BROADCAST EVENTS
    const globalChannel = subscribeToEvents((event, payload) => {
      console.log('Global event received:', event, payload)
      if (event === 'transaction_created' || event === 'transaction_deleted' || event === 'transaction_updated') {
        fetchTransactions()
      }
    })

    return () => {
      supabase.removeChannel(transactionsChannel)
      supabase.removeChannel(globalChannel)
    }
  }, [dateFilter, customStartDate, customEndDate, filterBranch])

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions()
    }, 30000)
    return () => clearInterval(interval)
  }, [dateFilter, customStartDate, customEndDate, filterBranch])

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cashier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBranch = filterBranch === "all" || transaction.branch_id === filterBranch
    const matchesStatus = filterStatus === "all" || transaction.payment_status === filterStatus
    return matchesSearch && matchesBranch && matchesStatus
  })

  const totalRevenue = filteredTransactions
    .filter((t) => t.payment_status === "completed")
    .reduce((sum, t) => sum + (t.total_amount || 0), 0)

  const totalTransactions = filteredTransactions.length
  const completedTransactions = filteredTransactions.filter((t) => t.payment_status === "completed").length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "refunded":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-blue-100 text-blue-800"
      case "qris":
        return "bg-red-100 text-red-800"
      case "debit":
        return "bg-orange-100 text-orange-800"
      case "credit":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "Tunai"
      case "qris":
        return "QRIS"
      case "debit":
        return "Kartu Debit"
      case "credit":
        return "Kartu Kredit"
      default:
        return method
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "completed":
        return "Selesai"
      case "refunded":
        return "Refund"
      case "pending":
        return "Pending"
      default:
        return status
    }
  }

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Hari Ini"
      case "this_week":
        return "Minggu Ini"
      case "this_month":
        return "Bulan Ini"
      case "custom":
        return "Rentang Custom"
      default:
        return "Hari Ini"
    }
  }

  const generatePDFReport = async () => {
    setExportLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({ title: "Fitur PDF Export", description: "Fitur export PDF sedang dalam pengembangan" })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({ title: "Error", description: "Gagal menghasilkan PDF", variant: "destructive" })
    } finally {
      setExportLoading(false)
      setShowExportModal(false)
    }
  }

  const openTransactionDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-xs md:text-sm text-gray-600">Kelola dan pantau semua transaksi dengan filter fleksibel</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={fetchTransactions} 
            disabled={loading} 
            className="gap-2 flex-1 sm:flex-none text-xs md:text-sm h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 flex-1 sm:flex-none text-xs md:text-sm h-9" 
            onClick={() => setShowExportModal(true)}
          >
            <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600 line-clamp-1">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-gray-900">{totalTransactions}</div>
            <p className="text-[10px] md:text-xs text-gray-600 truncate">{getDateFilterLabel()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600 line-clamp-1">Transaksi Selesai</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">{completedTransactions}</div>
            <p className="text-[10px] md:text-xs text-gray-600 truncate">berhasil diselesaikan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600 line-clamp-1">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-sm md:text-2xl font-bold text-blue-600 truncate">Rp {totalRevenue.toLocaleString("id-ID")}</div>
            <p className="text-[10px] md:text-xs text-gray-600 truncate">dari transaksi selesai</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600 line-clamp-2">Rata-rata Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-sm md:text-2xl font-bold text-red-600 truncate">
              Rp{" "}
              {completedTransactions > 0 ? Math.round(totalRevenue / completedTransactions).toLocaleString("id-ID") : 0}
            </div>
            <p className="text-[10px] md:text-xs text-gray-600 truncate">per transaksi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile Responsive */}
      <Card>
        <CardHeader className="p-3 md:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 lg:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 md:h-4 md:w-4" />
              <Input
                placeholder="Cari transaksi, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 md:pl-10 text-xs md:text-sm h-9 md:h-10"
              />
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="this_week">Minggu Ini</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="custom">Rentang Custom</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBranch} onValueChange={setFilterBranch} disabled={branchesLoading}>
              <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                <SelectValue placeholder={branchesLoading ? "Memuat..." : "Pilih Cabang"} />
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-xs md:text-sm h-9 md:h-10">
                <SelectValue placeholder="Pilih Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi - {getDateFilterLabel()}</CardTitle>
          <CardDescription>
            {loading
              ? "Memuat data..."
              : `Menampilkan ${filteredTransactions.length} transaksi dari total ${transactions.length} transaksi`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Memuat data transaksi...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {transactions.length === 0
                ? "Tidak ada transaksi dalam periode ini."
                : "Tidak ada transaksi yang sesuai dengan filter."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-medium text-gray-900">
                        {transaction.transaction_number || `TX-${transaction.id.slice(0, 8)}`}
                      </div>
                      <Badge className={getStatusColor(transaction.payment_status)}>
                        {formatStatus(transaction.payment_status)}
                      </Badge>
                      <Badge className={getPaymentMethodColor(transaction.payment_method)}>
                        {formatPaymentMethod(transaction.payment_method)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{formatTime(transaction.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => openTransactionDetail(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                        Detail
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-blue-600 hover:text-blue-700"
                        onClick={() => handleOpenEditModal(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-red-600 hover:text-red-700"
                        onClick={() => {
                          setTransactionToDelete(transaction)
                          setIsConfirmDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <div className="font-medium">{transaction.customer_name || "Tidak ada nama"}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Dilayani oleh:</span>
                      <div className="font-medium">{transaction.cashier?.name || "N/A"}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Cabang:</span>
                      <div className="font-medium">{transaction.branch?.name || "N/A"}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <div className="font-bold text-lg text-red-600">
                        Rp {transaction.total_amount?.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Laporan PDF</DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal dan cabang untuk laporan transaksi yang akan di-export ke PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Dari Tanggal</Label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Sampai Tanggal</Label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Cabang</Label>
              <Select value={exportBranch} onValueChange={setExportBranch}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Cabang" />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Batal
            </Button>
            <Button onClick={generatePDFReport} disabled={exportLoading} className="gap-2">
              {exportLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportLoading ? "Generating..." : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi {selectedTransaction?.transaction_number || selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID Transaksi</Label>
                  <p className="font-mono text-sm mt-1">
                    {selectedTransaction.transaction_number || selectedTransaction.id}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tanggal & Waktu</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedTransaction.created_at).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    <br />
                    <span className="text-gray-500">
                      {new Date(selectedTransaction.created_at).toLocaleTimeString("id-ID")}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Customer</Label>
                  <p className="font-medium mt-1">{selectedTransaction.customer_name || "Tidak ada nama"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Dilayani oleh</Label>
                  <p className="font-medium mt-1">{selectedTransaction.cashier?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cabang</Label>
                  <p className="font-medium mt-1">{selectedTransaction.branch?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedTransaction.payment_status)}>
                      {formatStatus(selectedTransaction.payment_status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Metode Pembayaran</Label>
                    <div className="mt-1">
                      <Badge className={getPaymentMethodColor(selectedTransaction.payment_method)}>
                        {formatPaymentMethod(selectedTransaction.payment_method)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Total Pembayaran</Label>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      Rp {selectedTransaction.total_amount?.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>
              {selectedTransaction.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Catatan</Label>
                  <p className="text-sm mt-1 p-3 bg-yellow-50 rounded-lg">{selectedTransaction.notes}</p>
                </div>
              )}
              {selectedTransaction.transaction_items && selectedTransaction.transaction_items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Items</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTransaction.transaction_items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{item.services?.name || `Item ${index + 1}`}</span>
                        <span>{item.quantity} x Rp {item.unit_price?.toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
            <DialogDescription>
              Edit detail transaksi {selectedTransaction?.transaction_number || selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Info Transaksi</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="payment">Pembayaran</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Customer</Label>
                    <Input
                      value={editData.customer_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Nama customer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cabang</Label>
                    <Input value={selectedTransaction.branch?.name || "N/A"} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Catatan transaksi"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Items Transaksi</Label>
                  <Button size="sm" onClick={addNewItem} className="gap-1">
                    <Plus className="h-4 w-4" /> Tambah Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editData.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Layanan</Label>
                          <Select
                            value={item.service_id}
                            onValueChange={(value) => updateItemService(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih layanan" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map(service => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name} - Rp {service.price.toLocaleString("id-ID")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Harga</Label>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(index, Number(e.target.value))}
                            placeholder="Harga"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                            className="w-16 text-center"
                            min="1"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Metode Pembayaran</Label>
                    <Select
                      value={editData.payment_method}
                      onValueChange={(value: any) => setEditData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="debit">Kartu Debit</SelectItem>
                        <SelectItem value="credit">Kartu Kredit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status Pembayaran</Label>
                    <Select
                      value={editData.payment_status}
                      onValueChange={(value: any) => setEditData(prev => ({ ...prev, payment_status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input
                    value={`Rp ${selectedTransaction.total_amount?.toLocaleString("id-ID")}`}
                    disabled
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isEditing} className="gap-2">
              {isEditing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda Yakin Ingin Menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus transaksi{" "}
              <span className="font-bold font-mono mx-1">
                {transactionToDelete?.transaction_number || transactionToDelete?.id}
              </span>{" "}
              secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTransaction} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ya, Hapus Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
