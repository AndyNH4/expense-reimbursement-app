import { useState } from 'react'
import { StoreProvider } from '@/lib/store'
import Dashboard from '@/sections/dashboard'
import InvoiceCenter from '@/sections/invoice-center'
import ExpenseReports from '@/sections/expense-reports'
import { Toaster } from '@/components/ui/sonner'
import { LayoutDashboard, FileCheck2, ReceiptText, Landmark } from 'lucide-react'

const NAV = [
  { key: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { key: 'invoices', label: '发票中心', icon: FileCheck2 },
  { key: 'reports', label: '报销单', icon: ReceiptText },
]

export default function App() {
  const [view, setView] = useState('dashboard')

  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r bg-white">
          <div className="flex items-center gap-2.5 border-b px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">财务报销系统</p>
              <p className="text-xs text-muted-foreground">Expense & Invoice</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  view === n.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-accent'
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="border-t p-4 text-xs leading-relaxed text-muted-foreground">
            数据保存在浏览器本地，演示环境
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {view === 'dashboard' && <Dashboard onNavigate={setView} />}
            {view === 'invoices' && <InvoiceCenter />}
            {view === 'reports' && <ExpenseReports />}
          </div>
        </main>
      </div>
      <Toaster richColors position="top-center" />
    </StoreProvider>
  )
}
