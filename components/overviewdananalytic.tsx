"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Building2, PieChart as PieChartIcon, RefreshCw, BarChart3, Zap, Activity, Crown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart, Line, PieChart, Pie } from "recharts"
import { supabase, getApprovedExpenses, type Expense } from "@/lib/supabase"

// Warna modern untuk chart
const CHART_COLORS = {
  revenue: ['#6366f1', '#4f46e5'],
  transactions: ['#10b981', '#059669'],
  expenses: ['#ef4444', '#dc2626'],
  netProfit: ['#8b5cf6', '#7c3aed'],
  branches: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
}

interface OverviewAndAnalyticsProps {
  onRefreshData: () => void;
  realTimeEnabled: boolean;
}

export function OverviewAndAnalytics({ onRefreshData, realTimeEnabled }: OverviewAndAnalyticsProps) {
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]) // ✅ Ditambahkan
  const [branchPerformance, setBranchPerformance] = useState<any[]>([]) // ✅ Ditambahkan
  const [loading, setLoading] = useState(true)
  const [animationKey, setAnimationKey] = useState(0)

  // Custom Bar dengan efek 3D dan animasi
  const Animated3DBar = (props: any) => {
    const { fill, x, y, width, height } = props
    const [isAnimating, setIsAnimating] = useState(true)

    useEffect(() => {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 800)
      return () => clearTimeout(timer)
    }, [animationKey])

    return (
      <g>
        {/* Shadow effect untuk depth 3D */}
        <rect
          x={x + 4}
          y={y + 4}
          width={width}
          height={height}
          fill="rgba(0,0,0,0.2)"
          rx={6}
        />
        {/* Main bar dengan animasi */}
        <rect
          x={x}
          y={isAnimating ? y + height : y}
          width={width}
          height={isAnimating ? 0 : height}
          fill={fill}
          rx={6}
          style={{
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))'
          }}
        />
        {/* Top highlight untuk efek 3D */}
        <rect
          x={x}
          y={y}
          width={width}
          height={2}
          fill="rgba(255,255,255,0.4)"
          rx={1}
        />
      </g>
    )
  }

  // Setup real-time updates
  useEffect(() => {
    fetchDashboardData()

    if (realTimeEnabled) {
      const transactionsChannel = supabase
        .channel('overview-transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchDashboardData()
        })
        .subscribe()

      const expensesChannel = supabase
        .channel('overview-expenses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          fetchDashboardData()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(transactionsChannel)
        supabase.removeChannel(expensesChannel)
      }
    }
  }, [realTimeEnabled])

  const fetchApprovedExpenses = async () => {
    try {
      const { data, error } = await getApprovedExpenses();
      if (error) return [];
      
      return (data || []).map((expense: any) => ({
        id: expense.id,
        branch_id: expense.branch_id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount || 0,
        status: expense.status,
        expense_date: expense.expense_date || expense.created_at,
        notes: expense.notes,
        rejection_reason: expense.rejection_reason,
        created_at: expense.created_at,
        branch_name: expense.branches?.name || "Semua Cabang"
      }));
    } catch (error) {
      return [];
    }
  }

  const analyzeExpenseCategories = (expenses: any[]) => {
    const categoryMap = new Map<string, number>();
    expenses.forEach(expense => {
      const currentTotal = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, currentTotal + expense.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const approvedExpensesData = await fetchApprovedExpenses();
      setApprovedExpenses(approvedExpensesData); // ✅ Sekarang sudah didefinisikan
      setExpenseCategories(analyzeExpenseCategories(approvedExpensesData));

      const [transactionsRes, usersRes, branchesRes, pointsRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("*").eq("role", "employee").order("name"),
        supabase.from("branches").select("*").eq("status", "active").order("name"),
        supabase.from("points").select("*").order("created_at", { ascending: false })
      ])

      const transactions = transactionsRes.data || []
      const users = usersRes.data || []
      const branches = branchesRes.data || []

      const getTransactionAmount = (transaction: any) => {
        return transaction.final_amount || transaction.total_amount || transaction.subtotal || 0
      }

      const isCompletedTransaction = (transaction: any) => {
        return transaction.payment_status === "completed"
      }

      const completedTransactions = transactions.filter(isCompletedTransaction)
      const totalRevenue = completedTransactions.reduce((sum: number, t: any) => sum + getTransactionAmount(t), 0)
      const totalExpenses = approvedExpensesData.reduce((sum: number, expense: any) => sum + expense.amount, 0)

      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      const monthlyTransactions = completedTransactions.filter((t: any) => {
        const date = new Date(t.created_at)
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      })

      const monthlyRevenue = monthlyTransactions.reduce((sum: number, t: any) => sum + getTransactionAmount(t), 0)
      const monthlyExpenses = approvedExpensesData.filter((expense: any) => {
        const date = new Date(expense.expense_date || expense.created_at)
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      }).reduce((sum: number, expense: any) => sum + expense.amount, 0)

      // Hitung branch performance
      const branchPerf = branches.map((branch: any) => {
        const branchTransactions = completedTransactions.filter((t: any) => t.branch_id === branch.id)
        const branchRevenue = branchTransactions.reduce((sum: number, t: any) => sum + getTransactionAmount(t), 0)
        const branchExpenses = approvedExpensesData
          .filter((expense: any) => expense.branch_id === branch.id)
          .reduce((sum: number, expense: any) => sum + expense.amount, 0)
        
        const netProfit = branchRevenue - branchExpenses
        const profitMargin = branchRevenue > 0 ? (netProfit / branchRevenue) * 100 : 0
        
        return {
          id: branch.id,
          name: branch.name,
          revenue: branchRevenue,
          transactions: branchTransactions.length,
          expenses: branchExpenses,
          netProfit: netProfit,
          profitMargin: profitMargin
        }
      }).sort((a: any, b: any) => b.revenue - a.revenue)

      setBranchPerformance(branchPerf); // ✅ Sekarang sudah didefinisikan

      const netProfit = totalRevenue - totalExpenses
      const monthlyNetProfit = monthlyRevenue - monthlyExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      const revenueChartData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        
        const dayTransactions = completedTransactions.filter((t: any) => {
          const transactionDate = new Date(t.created_at)
          return transactionDate.toISOString().split('T')[0] === dateStr
        })
        
        const dayRevenue = dayTransactions.reduce((sum: number, t: any) => sum + getTransactionAmount(t), 0)
        const dayExpenses = approvedExpensesData
          .filter((expense: any) => {
            const expenseDate = new Date(expense.expense_date || expense.created_at)
            return expenseDate.toISOString().split('T')[0] === dateStr
          })
          .reduce((sum: number, expense: any) => sum + expense.amount, 0)
        
        const dayNetProfit = dayRevenue - dayExpenses
        
        return {
          date: date.toLocaleDateString("id-ID", { weekday: "short" }),
          revenue: dayRevenue,
          expenses: dayExpenses,
          netProfit: dayNetProfit
        }
      })

      const stats = {
        totalRevenue,
        monthlyRevenue,
        totalTransactions: completedTransactions.length,
        monthlyTransactions: monthlyTransactions.length,
        totalExpenses,
        monthlyExpenses,
        netProfit,
        monthlyNetProfit,
        profitMargin
      }

      setDashboardStats(stats)
      setRevenueData(revenueChartData)
      setAnimationKey(prev => prev + 1)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const RevenueExpenseChart3D = () => {
    if (!revenueData.length) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada data revenue dan pengeluaran</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueData} key={animationKey}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="#e2e8f0" fontSize={12} />
            <YAxis stroke="#e2e8f0" fontSize={12} tickFormatter={(value) => `Rp${value/1000000}Jt`} />
            <Tooltip 
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}
              formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']}
            />
            <Legend />
            <Bar 
              dataKey="revenue" 
              name="Revenue"
              shape={<Animated3DBar />}
              fill={CHART_COLORS.revenue[0]}
            />
            <Bar 
              dataKey="expenses" 
              name="Pengeluaran"
              shape={<Animated3DBar />}
              fill={CHART_COLORS.expenses[0]}
            />
            <Line 
              type="monotone" 
              dataKey="netProfit" 
              name="Net Profit"
              stroke={CHART_COLORS.netProfit[0]}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.netProfit[0], strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, fill: CHART_COLORS.netProfit[1] }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const ExpenseCategoriesChart3D = () => {
    if (!expenseCategories.length) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada data kategori pengeluaran</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenseCategories}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
              dataKey="total"
              nameKey="category"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {expenseCategories.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS.branches[index % CHART_COLORS.branches.length]}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}
              formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Jumlah']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Overview & Analytics</h2>
            <p className="text-muted-foreground">Memuat data real-time...</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchDashboardData(); onRefreshData(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            📊 3D Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">Data real-time dengan visualisasi 3D modern</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { fetchDashboardData(); onRefreshData(); }} 
          className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Expense Chart 3D */}
        <Card className="col-span-2 bg-gradient-to-br from-slate-900/20 to-blue-900/20 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Revenue vs Expenses 3D
              </CardTitle>
              <CardDescription>Data real-time dengan efek 3D dan animasi</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart3D />
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-gradient-to-br from-slate-900/20 to-purple-900/20 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 text-purple-400" />
              Statistik Utama
            </CardTitle>
            <CardDescription>Ringkasan performa bisnis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardStats && [
              {
                title: "Total Revenue",
                value: `Rp ${dashboardStats.totalRevenue.toLocaleString('id-ID')}`,
                icon: TrendingUp,
                color: "from-blue-500 to-blue-600"
              },
              {
                title: "Total Expenses",
                value: `Rp ${dashboardStats.totalExpenses.toLocaleString('id-ID')}`,
                icon: TrendingDown,
                color: "from-red-500 to-red-600"
              },
              {
                title: "Net Profit",
                value: `Rp ${dashboardStats.netProfit.toLocaleString('id-ID')}`,
                subValue: `${dashboardStats.profitMargin.toFixed(1)}% Margin`,
                icon: DollarSign,
                color: "from-green-500 to-green-600"
              }
            ].map((stat, index) => (
              <div
                key={index}
                className={`p-4 bg-gradient-to-r ${stat.color} rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-105`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-white/80">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    {stat.subValue && (
                      <p className="text-sm text-white/60">{stat.subValue}</p>
                    )}
                  </div>
                  <stat.icon className="h-8 w-8 text-white/80" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expense Categories 3D */}
        <Card className="col-span-1 lg:col-span-3 bg-gradient-to-br from-slate-900/20 to-green-900/20 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChartIcon className="h-5 w-5 text-green-400" />
              Kategori Pengeluaran 3D
            </CardTitle>
            <CardDescription>Distribusi pengeluaran dengan visualisasi modern</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseCategoriesChart3D />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}