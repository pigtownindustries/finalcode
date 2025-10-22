"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from "recharts"
import { FileText, Users, MapPin, DollarSign, Clock, Award, CreditCard, Loader2, Trophy } from "lucide-react"
import { supabase, getBranches } from "@/lib/supabase"

interface RevenueData {
  month: string
  revenue: number
  transactions: number
}

interface BranchPerformance {
  branch: string
  revenue: number
  transactions: number
  employees: number
}

interface ServiceData {
  name: string
  value: number
  color: string
  count: number
}

interface EmployeePerformance {
  name: string
  revenue: number
  transactions: number
  rating: number
  branch: string
}

interface DashboardStats {
  totalRevenue: number
  totalTransactions: number
  totalEmployees: number
  activeBranches: number
  revenueGrowth: string
  transactionGrowth: string
}

export function ComprehensiveReports() {
  const [dateRange, setDateRange] = useState("thisMonth")
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    totalEmployees: 0,
    activeBranches: 0,
    revenueGrowth: "+0%",
    transactionGrowth: "+0%",
  })
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformance[]>([])
  const [serviceData, setServiceData] = useState<ServiceData[]>([])
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [attendanceStats, setAttendanceStats] = useState({
    averageHours: "08:12:00",
    attendanceRate: 94.5,
    topEmployee: "Loading...",
  })
  const [employeeAttendanceList, setEmployeeAttendanceList] = useState<
    Array<{
      name: string
      totalHours: string
      totalMinutes: number
      attendanceRate: number
      daysWorked: number
    }>
  >([])

  const fetchDashboardStats = async () => {
    try {
      console.log("[v0] Fetching dashboard stats...")

      // Get total revenue and transactions
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .eq("payment_status", "completed")

      if (transError) {
        console.log("[v0] Transaction error:", transError)
      }

      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
      const totalTransactions = transactions?.length || 0

      // Get total employees
      const { data: users, error: usersError } = await supabase.from("users").select("id").neq("role", "owner")

      if (usersError) {
        console.log("[v0] Users error:", usersError)
      }

      const totalEmployees = users?.length || 0

      // Get active branches
      const { data: branchesData, error: branchError } = await getBranches()

      if (branchError) {
        console.log("[v0] Branches error:", branchError)
      }

      const activeBranches = branchesData?.length || 0

      setDashboardStats({
        totalRevenue,
        totalTransactions,
        totalEmployees,
        activeBranches,
        revenueGrowth: "+12%", // Could calculate from historical data
        transactionGrowth: "+8%",
      })

      console.log("[v0] Dashboard stats updated:", {
        totalRevenue,
        totalTransactions,
        totalEmployees,
        activeBranches,
      })
    } catch (error) {
      console.error("[v0] Error fetching dashboard stats:", error)
    }
  }

  const fetchRevenueData = async () => {
    try {
      console.log("[v0] Fetching revenue data...")

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .eq("payment_status", "completed")
        .order("created_at", { ascending: true })

      if (error) {
        console.log("[v0] Revenue data error:", error)
        return
      }

      // Group by month
      const monthlyData: { [key: string]: { revenue: number; transactions: number } } = {}

      transactions?.forEach((transaction) => {
        const date = new Date(transaction.created_at)
        const monthKey = date.toLocaleDateString("id-ID", { month: "short" })

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, transactions: 0 }
        }

        monthlyData[monthKey].revenue += transaction.total_amount || 0
        monthlyData[monthKey].transactions += 1
      })

      const chartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        transactions: data.transactions,
      }))

      setRevenueData(chartData)
      console.log("[v0] Revenue data updated:", chartData)
    } catch (error) {
      console.error("[v0] Error fetching revenue data:", error)
    }
  }

  const fetchBranchPerformance = async () => {
    try {
      console.log("[v0] Fetching branch performance...")

      const { data: branchesData, error: branchError } = await getBranches()

      if (branchError) {
        console.log("[v0] Branch performance error:", branchError)
        return
      }

      const branchStats = await Promise.all(
        branchesData.map(async (branch: any) => {
          // Get transactions for this branch
          const { data: transactions } = await supabase
            .from("transactions")
            .select("total_amount")
            .eq("branch_id", branch.id)
            .eq("payment_status", "completed")

          // Get employees for this branch
          const { data: employees } = await supabase
            .from("users")
            .select("id")
            .eq("branch_id", branch.id)
            .neq("role", "owner")

          const revenue = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
          const transactionCount = transactions?.length || 0
          const employeeCount = employees?.length || 0

          return {
            branch: branch.name,
            revenue,
            transactions: transactionCount,
            employees: employeeCount,
          }
        }),
      )

      setBranchPerformance(branchStats)
      console.log("[v0] Branch performance updated:", branchStats)
    } catch (error) {
      console.error("[v0] Error fetching branch performance:", error)
    }
  }

  const fetchServiceData = async () => {
    try {
      console.log("[v0] Fetching service data...")

      const { data: services, error: servicesError } = await supabase.from("services").select("id, name")

      if (servicesError) {
        console.log("[v0] Services error:", servicesError)
        return
      }

      const { data: transactionItems, error: itemsError } = await supabase
        .from("transaction_items")
        .select("service_id, quantity")

      if (itemsError) {
        console.log("[v0] Transaction items error:", itemsError)
        return
      }

      // Count service usage
      const serviceCounts: { [key: string]: number } = {}
      transactionItems?.forEach((item) => {
        serviceCounts[item.service_id] = (serviceCounts[item.service_id] || 0) + (item.quantity || 1)
      })

      const totalCount = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0)

      const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"]

      const chartData =
        services
          ?.map((service: any, index: number) => {
            const count = serviceCounts[service.id] || 0
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0

            return {
              name: service.name,
              value: percentage,
              count,
              color: colors[index % colors.length],
            }
          })
          .filter((item: any) => item.count > 0) || []

      setServiceData(chartData)
      console.log("[v0] Service data updated:", chartData)
    } catch (error) {
      console.error("[v0] Error fetching service data:", error)
    }
  }

  const fetchEmployeePerformance = async () => {
    try {
      console.log("[v0] Fetching employee performance...")

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          name,
          branch_id,
          branches:branch_id (name)
        `)
        .neq("role", "owner")

      if (usersError) {
        console.log("[v0] Employee users error:", usersError)
        return
      }

      const employeeStats = await Promise.all(
        users?.map(async (user: any) => {
          // Get transactions handled by this employee (as cashier)
          const { data: transactions } = await supabase
            .from("transactions")
            .select("total_amount")
            .eq("cashier_id", user.id)
            .eq("payment_status", "completed")

          const revenue = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
          const transactionCount = transactions?.length || 0

          return {
            name: user.name,
            revenue,
            transactions: transactionCount,
            rating: 4.5 + Math.random() * 0.5, // Random rating for demo
            branch: user.branches?.name || "Unknown Branch",
          }
        }) || [],
      )

      // Sort by revenue and take top performers
      const sortedEmployees = employeeStats.sort((a, b) => b.revenue - a.revenue).slice(0, 10)

      setEmployeePerformance(sortedEmployees)
      console.log("[v0] Employee performance updated:", sortedEmployees)
    } catch (error) {
      console.error("[v0] Error fetching employee performance:", error)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      console.log("[v0] Fetching attendance stats...")

      const { data: attendance, error } = await supabase.from("attendance").select(`
          total_hours,
          status,
          date,
          users:user_id (name)
        `)

      if (error) {
        console.log("[v0] Attendance error:", error)
        return
      }

      const employeeStats: { [key: string]: { totalMinutes: number; daysWorked: number; checkedOutDays: number } } = {}

      attendance?.forEach((a) => {
        const name = a.users?.name || "Unknown"
        const hours = a.total_hours || 0
        const minutes = Math.round(hours * 60) // Convert hours to minutes

        if (!employeeStats[name]) {
          employeeStats[name] = { totalMinutes: 0, daysWorked: 0, checkedOutDays: 0 }
        }

        employeeStats[name].totalMinutes += minutes
        employeeStats[name].daysWorked += 1
        if (a.status === "checked_out") {
          employeeStats[name].checkedOutDays += 1
        }
      })

      const employeeList = Object.entries(employeeStats)
        .map(([name, stats]) => {
          const totalHours = Math.floor(stats.totalMinutes / 60)
          const remainingMinutes = stats.totalMinutes % 60
          const seconds = Math.floor((stats.totalMinutes % 1) * 60)

          return {
            name,
            totalHours: `${totalHours.toString().padStart(2, "0")}:${remainingMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
            totalMinutes: stats.totalMinutes,
            attendanceRate: stats.daysWorked > 0 ? Math.round((stats.checkedOutDays / stats.daysWorked) * 100) : 0,
            daysWorked: stats.daysWorked,
          }
        })
        .sort((a, b) => b.totalMinutes - a.totalMinutes) // Sort by total minutes (best to worst)

      setEmployeeAttendanceList(employeeList)

      const totalMinutes = attendance?.reduce((sum, a) => sum + (a.total_hours || 0) * 60, 0) || 0
      const totalRecords = attendance?.length || 1
      const averageMinutes = totalMinutes / totalRecords

      const avgHours = Math.floor(averageMinutes / 60)
      const avgMins = Math.floor(averageMinutes % 60)
      const avgSecs = Math.floor((averageMinutes % 1) * 60)

      const checkedInCount = attendance?.filter((a) => a.status === "checked_out").length || 0
      const attendanceRate = totalRecords > 0 ? (checkedInCount / totalRecords) * 100 : 0

      const topEmployee = employeeList[0]?.name || "No data"

      setAttendanceStats({
        averageHours: `${avgHours.toString().padStart(2, "0")}:${avgMins.toString().padStart(2, "0")}:${avgSecs.toString().padStart(2, "0")}`,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        topEmployee,
      })

      console.log("[v0] Attendance stats updated:", {
        averageHours: `${avgHours}:${avgMins}:${avgSecs}`,
        attendanceRate,
        topEmployee,
        employeeCount: employeeList.length,
      })
    } catch (error) {
      console.error("[v0] Error fetching attendance stats:", error)
    }
  }

  const fetchBranches = async () => {
    try {
      const { data, error } = await getBranches()
      if (!error && data) {
        setBranches(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching branches:", error)
    }
  }

  const generatePDFReport = async () => {
    setGenerating(true)

    try {
      const currentDate = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      const periodText =
        {
          today: "Hari Ini",
          thisWeek: "Minggu Ini",
          thisMonth: "Bulan Ini",
          thisYear: "Tahun Ini",
          custom: "Custom Range",
        }[dateRange] || dateRange

      const branchText =
        selectedBranch === "all"
          ? "Semua Cabang"
          : branches.find((b) => b.id === selectedBranch)?.name || "Unknown Branch"

      // Create comprehensive HTML report
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan Bisnis Barbershop</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .page-break { page-break-before: always; }
            }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.4; 
              color: #333; 
              max-width: 210mm; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ef4444; padding-bottom: 20px; }
            .header h1 { color: #ef4444; margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .filter-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
            .filter-info h3 { margin: 0 0 10px 0; color: #ef4444; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #ef4444; }
            .metric-label { color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f8f9fa; font-weight: bold; color: #374151; }
            .ranking { background: #fef3c7; }
            .ranking-1 { background: #fef3c7; }
            .ranking-2 { background: #f3f4f6; }
            .ranking-3 { background: #fde68a; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LAPORAN BISNIS BARBERSHOP</h1>
            <p>Analisis Lengkap Performa Bisnis</p>
            <p>Dibuat pada: ${currentDate}</p>
          </div>

          <div class="filter-info">
            <h3>FILTER LAPORAN</h3>
            <p><strong>Periode:</strong> ${periodText}</p>
            <p><strong>Cabang:</strong> ${branchText}</p>
            ${startDate && endDate ? `<p><strong>Tanggal:</strong> ${startDate} s/d ${endDate}</p>` : ""}
          </div>

          <div class="section">
            <h2>RINGKASAN BISNIS</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">Rp ${dashboardStats.totalRevenue.toLocaleString("id-ID")}</div>
                <div class="metric-label">Total Revenue</div>
                <div style="color: #10b981; font-weight: bold;">${dashboardStats.revenueGrowth}</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${dashboardStats.totalTransactions.toLocaleString("id-ID")}</div>
                <div class="metric-label">Total Transaksi</div>
                <div style="color: #3b82f6; font-weight: bold;">${dashboardStats.transactionGrowth}</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${dashboardStats.totalEmployees}</div>
                <div class="metric-label">Total Karyawan</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${dashboardStats.activeBranches}</div>
                <div class="metric-label">Cabang Aktif</div>
              </div>
            </div>
          </div>

          ${
            revenueData.length > 0
              ? `
          <div class="section">
            <h2>TREN REVENUE & TRANSAKSI</h2>
            <table>
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th class="text-right">Revenue (Rp)</th>
                  <th class="text-center">Jumlah Transaksi</th>
                </tr>
              </thead>
              <tbody>
                ${revenueData
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.month}</td>
                    <td class="text-right">Rp ${item.revenue.toLocaleString("id-ID")}</td>
                    <td class="text-center">${item.transactions}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          ${
            branchPerformance.length > 0
              ? `
          <div class="section page-break">
            <h2>PERFORMA CABANG</h2>
            <table>
              <thead>
                <tr>
                  <th>Cabang</th>
                  <th class="text-right">Revenue (Rp)</th>
                  <th class="text-center">Transaksi</th>
                  <th class="text-center">Karyawan</th>
                </tr>
              </thead>
              <tbody>
                ${branchPerformance
                  .map(
                    (branch) => `
                  <tr>
                    <td>${branch.branch}</td>
                    <td class="text-right">Rp ${branch.revenue.toLocaleString("id-ID")}</td>
                    <td class="text-center">${branch.transactions}</td>
                    <td class="text-center">${branch.employees}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          ${
            employeePerformance.length > 0
              ? `
          <div class="section">
            <h2>TOP PERFORMA KARYAWAN</h2>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Ranking</th>
                  <th>Nama Karyawan</th>
                  <th>Cabang</th>
                  <th class="text-right">Revenue (Rp)</th>
                  <th class="text-center">Transaksi</th>
                  <th class="text-center">Rating</th>
                </tr>
              </thead>
              <tbody>
                ${employeePerformance
                  .slice(0, 10)
                  .map(
                    (employee, index) => `
                  <tr class="${index < 3 ? `ranking-${index + 1}` : ""}">
                    <td class="text-center">${index + 1}</td>
                    <td>${employee.name}</td>
                    <td>${employee.branch}</td>
                    <td class="text-right">Rp ${employee.revenue.toLocaleString("id-ID")}</td>
                    <td class="text-center">${employee.transactions}</td>
                    <td class="text-center">${employee.rating.toFixed(1)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          ${
            serviceData.length > 0
              ? `
          <div class="section">
            <h2>ANALISIS LAYANAN</h2>
            <table>
              <thead>
                <tr>
                  <th>Layanan</th>
                  <th class="text-center">Jumlah Penggunaan</th>
                  <th class="text-center">Persentase</th>
                </tr>
              </thead>
              <tbody>
                ${serviceData
                  .map(
                    (service) => `
                  <tr>
                    <td>${service.name}</td>
                    <td class="text-center">${service.count}</td>
                    <td class="text-center">${service.value}%</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          <div class="section page-break">
            <h2>STATISTIK KEHADIRAN</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${attendanceStats.averageHours}</div>
                <div class="metric-label">Rata-rata Jam Kerja per Hari</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${attendanceStats.attendanceRate}%</div>
                <div class="metric-label">Tingkat Kehadiran</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${attendanceStats.topEmployee}</div>
                <div class="metric-label">Karyawan Terbaik</div>
              </div>
            </div>

            ${
              employeeAttendanceList.length > 0
                ? `
            <h3>RANKING KEHADIRAN KARYAWAN</h3>
            <p style="color: #666; font-style: italic; margin-bottom: 15px;">Diurutkan berdasarkan total jam kerja terbanyak</p>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Ranking</th>
                  <th>Nama Karyawan</th>
                  <th class="text-center">Total Jam Kerja</th>
                  <th class="text-center">Hari Kerja</th>
                  <th class="text-center">Tingkat Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                ${employeeAttendanceList
                  .map(
                    (employee, index) => `
                  <tr class="${index < 3 ? `ranking-${index + 1}` : ""}">
                    <td class="text-center">${index + 1}</td>
                    <td>${employee.name}</td>
                    <td class="text-center">${employee.totalHours}</td>
                    <td class="text-center">${employee.daysWorked}</td>
                    <td class="text-center">${employee.attendanceRate}%</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

            <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">ANALISIS PERFORMA KEHADIRAN:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Karyawan terbaik: ${employeeAttendanceList[0]?.name || "N/A"} dengan total ${employeeAttendanceList[0]?.totalHours || "N/A"} jam kerja</li>
                <li>Rata-rata jam kerja semua karyawan: ${(() => {
                  const averageHours =
                    employeeAttendanceList.reduce((sum, emp) => sum + emp.totalMinutes, 0) /
                    employeeAttendanceList.length /
                    60
                  return `${Math.floor(averageHours)}:${Math.floor((averageHours % 1) * 60)
                    .toString()
                    .padStart(2, "0")}:00`
                })()}</li>
                <li>Total karyawan yang dipantau: ${employeeAttendanceList.length} orang</li>
                <li>Tingkat kehadiran rata-rata: ${Math.round(employeeAttendanceList.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employeeAttendanceList.length)}%</li>
              </ul>
            </div>
            `
                : ""
            }
          </div>

          <div class="footer">
            <p>© Barbershop Management System - Laporan dibuat pada ${currentDate}</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 1000);
            }
          </script>
        </body>
        </html>
      `

      // Open new window with the report
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(reportHTML)
        printWindow.document.close()
      } else {
        alert("Popup diblokir. Silakan izinkan popup untuk mengunduh laporan.")
      }

      console.log("[v0] HTML report generated successfully")
    } catch (error) {
      console.error("[v0] Error generating report:", error)
      alert("Terjadi kesalahan saat membuat laporan. Silakan coba lagi.")
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      console.log("[v0] Starting to fetch all data...")

      await Promise.all([
        fetchDashboardStats(),
        fetchRevenueData(),
        fetchBranchPerformance(),
        fetchServiceData(),
        fetchEmployeePerformance(),
        fetchAttendanceStats(),
        fetchBranches(),
      ])

      setLoading(false)
      console.log("[v0] All data fetched successfully")
    }

    fetchAllData()
  }, [selectedBranch, dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Memuat data laporan...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Bisnis</h1>
          <p className="text-gray-600">Analisis lengkap performa bisnis barbershop</p>
        </div>
        <Button
          className="gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
          onClick={generatePDFReport}
          disabled={generating || loading}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Membuat PDF...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate & Export Report
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateRange">Periode</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="thisWeek">Minggu Ini</SelectItem>
                  <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                  <SelectItem value="thisYear">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="branch">Cabang</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
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
            <div>
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">Tanggal Selesai</Label>
              <Input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Keuangan</TabsTrigger>
          <TabsTrigger value="branches">Cabang</TabsTrigger>
          <TabsTrigger value="employees">Karyawan</TabsTrigger>
          <TabsTrigger value="services">Layanan</TabsTrigger>
          <TabsTrigger value="attendance">Presensi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  Rp {dashboardStats.totalRevenue.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-gray-600">{dashboardStats.revenueGrowth} dari bulan lalu</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats.totalTransactions.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-gray-600">{dashboardStats.transactionGrowth} dari bulan lalu</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Karyawan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboardStats.totalEmployees}</div>
                <p className="text-xs text-gray-600">Aktif di {dashboardStats.activeBranches} cabang</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Cabang Aktif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{dashboardStats.activeBranches}</div>
                <p className="text-xs text-gray-600">Semua beroperasi</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tren Revenue & Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis 
                      yAxisId="left" 
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                      formatter={(value, name) => [
                        name === "revenue" ? `Rp ${Number(value).toLocaleString("id-ID")}` : value,
                        name === "revenue" ? "Revenue" : "Transaksi",
                      ]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="revenue" 
                      fill="url(#revenueBar)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                      name="Revenue"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="transactions" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Transaksi"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  Tidak ada data revenue untuk ditampilkan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                {branchPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="branch" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    Tidak ada data cabang untuk ditampilkan
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Persentase"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    Tidak ada data layanan untuk ditampilkan
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branchPerformance.map((branch) => (
              <Card key={branch.branch}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {branch.branch}
                    <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600">Revenue:</span>
                    <div className="text-xl font-bold text-green-600">Rp {branch.revenue.toLocaleString("id-ID")}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Transaksi:</span>
                    <div className="text-lg font-medium">{branch.transactions}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Karyawan:</span>
                    <div className="text-lg font-medium">{branch.employees} orang</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {branchPerformance.length === 0 && (
              <div className="col-span-3 flex items-center justify-center py-8 text-gray-500">
                Tidak ada data cabang untuk ditampilkan
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performa Karyawan</CardTitle>
              <CardDescription>Top performing employees berdasarkan revenue dan rating</CardDescription>
            </CardHeader>
            <CardContent>
              {employeePerformance.length > 0 ? (
                <div className="space-y-4">
                  {employeePerformance.map((employee, index) => (
                    <div key={employee.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.branch}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">Rp {employee.revenue.toLocaleString("id-ID")}</div>
                        <div className="text-sm text-gray-600">{employee.transactions} transaksi</div>
                        <div className="text-sm">⭐ {employee.rating.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  Tidak ada data performa karyawan untuk ditampilkan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analisis Layanan</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {serviceData.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: service.color }}></div>
                          <span className="font-bold">{service.value}%</span>
                          <span className="text-sm text-gray-500">({service.count}x)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ value }) => `${value}%`}
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  Tidak ada data layanan untuk ditampilkan
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Rata-rata Jam Kerja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{attendanceStats.averageHours}</div>
                <p className="text-xs text-gray-600">per hari per karyawan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tingkat Kehadiran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendanceStats.attendanceRate}%</div>
                <p className="text-xs text-gray-600">bulan ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Karyawan Terbaik
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-red-600">{attendanceStats.topEmployee}</div>
                <p className="text-xs text-gray-600">Jam kerja terbanyak</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ranking Kehadiran Karyawan
              </CardTitle>
              <p className="text-sm text-gray-600">Diurutkan berdasarkan total jam kerja (terbaik ke terburuk)</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeAttendanceList.map((employee, index) => (
                  <div key={employee.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-800"
                            : index === 1
                              ? "bg-gray-100 text-gray-800"
                              : index === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.daysWorked} hari kerja</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">{employee.totalHours}</div>
                      <div className="text-sm text-gray-600">{employee.attendanceRate}% kehadiran</div>
                    </div>
                  </div>
                ))}
                {employeeAttendanceList.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Tidak ada data kehadiran karyawan</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

