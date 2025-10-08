import { DashboardLayout } from "@/components/dashboard-layout"
import { AttendanceSystem } from "@/components/attendance-system"

export default function AttendancePage() {
  return (
    <DashboardLayout>
      <AttendanceSystem />
    </DashboardLayout>
  )
}