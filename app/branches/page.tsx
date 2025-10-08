import { DashboardLayout } from "@/components/dashboard-layout"
import BranchManagement from "@/components/branch-management"  // Ubah ke default import

export default function BranchesPage() {
  return (
    <DashboardLayout>
      <BranchManagement />
    </DashboardLayout>
  )
}