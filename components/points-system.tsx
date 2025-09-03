"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, TrendingUp, Award, Users, Calendar, Trophy, Target, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getUsersWithPoints,
  getPointsStatistics,
  getPointTransactions,
  getBranches,
  type UserWithPoints,
  type Point,
  type Branch,
} from "@/lib/supabase"

interface PointTransaction extends Point {
  users?: {
    id: string;
    name: string;
    branch_id: string | null;
    branches: {
      id: string;
      name: string;
    } | null;
  } | null; // Tambahkan | null di sini
}

export function PointsSystem() {
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [employees, setEmployees] = useState<UserWithPoints[]>([])
  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    topPerformer: null as UserWithPoints | null,
    averagePoints: 0,
    totalPoints: 0,
  })
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [usersResult, statsResult, transactionsResult, branchesResult] = await Promise.all([
        getUsersWithPoints(selectedBranch),
        getPointsStatistics(selectedBranch),
        getPointTransactions(selectedBranch),
        getBranches(),
      ])

      if (usersResult.error) throw new Error(usersResult.error.message)
      if (statsResult.error) throw new Error(statsResult.error.message)
      if (transactionsResult.error) throw new Error(transactionsResult.error.message)
      if (branchesResult.error) throw new Error(branchesResult.error.message)

      setEmployees(usersResult.data)
      setStatistics(statsResult.data)
      setPointTransactions(transactionsResult.data)
      setBranches(branchesResult.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data")
      console.error("Error fetching points data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedBranch])

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Award className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getPointTypeColor = (type: string) => {
    switch (type) {
      case "earned":
        return "bg-green-100 text-green-800"
      case "bonus":
        return "bg-blue-100 text-blue-800"
      case "redeemed":
        return "bg-orange-100 text-orange-800"
      case "penalty":
        return "bg-red-100 text-red-800"
      case "deducted":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPointTypeText = (type: string | null | undefined) => {
    if (!type) {
    return "Tanpa Kategori"; // Berikan teks default jika tipe kosong
  }
  switch (type) {
    case "reward":
      return "Hadiah"
    case "penalty":
      return "Penalti"
    case "earned":
      return "Diperoleh"
    case "bonus":
      return "Bonus"
    case "deducted":
      return "Dikurangi"
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); 
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Memuat data sistem poin...</span>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Poin</h1>
          <p className="text-muted-foreground">Leaderboard dan pencapaian semua karyawan</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua Cabang" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statistics.topPerformer?.name || "-"}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.topPerformer?.total_points?.toLocaleString() || 0} poin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Poin</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.averagePoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Poin per karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Poin</CardTitle>
            <Star className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{statistics.totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Semua karyawan</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">Pencapaian</TabsTrigger>
          <TabsTrigger value="history">Riwayat Poin</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Cari karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <Card
                key={employee.id}
                className={`${(employee.rank || 0) <= 3 ? "border-2 border-yellow-200 bg-yellow-50/50" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-2 -right-2">{getRankIcon(employee.rank || 0)}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{employee.name}</h3>
                      <p className="text-muted-foreground text-sm">{employee.role || "Karyawan"}</p>
                     <p className="text-xs text-muted-foreground">{employee.branches?.name || "Tanpa Cabang"}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Poin:</span>
                      <span className="font-bold text-primary text-lg">
                        {(employee.total_points || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Bulan Ini:</span>
                      <span className="font-bold text-green-600">
                        +{(employee.monthly_points || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Peringkat:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">#{employee.rank || 0}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Email: {employee.email || "Tidak tersedia"}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Pencapaian Terbaru
              </CardTitle>
              <CardDescription>Daftar karyawan berdasarkan performa poin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEmployees.slice(0, 10).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.role || "Karyawan"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{(employee.total_points || 0).toLocaleString()} poin</p>
                      <p className="text-sm text-muted-foreground">Peringkat #{employee.rank}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Riwayat Poin Semua Karyawan
              </CardTitle>
              <CardDescription>Aktivitas poin terbaru dari semua karyawan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pointTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.users?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString("id-ID")} •{" "}
                        {transaction.users?.branches?.name || "Unknown Branch"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getPointTypeText(transaction.type)}>
                        {getPointTypeText(transaction.type)}
                      </Badge>
                      <p
                        className={`font-bold ${transaction.type === "penalty" || transaction.type === "deducted" ? "text-red-600" : "text-green-600"}`}
                      >
                        {transaction.type === "penalty" || transaction.type === "deducted" ? "-" : "+"}
                        {transaction.points_earned} poin
                      </p>
                    </div>
                  </div>
                ))}
                {pointTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Belum ada transaksi poin</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}