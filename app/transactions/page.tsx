import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionHistory } from "@/components/transaction-history"

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <TransactionHistory />
    </DashboardLayout>
  )
}
