import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportStatusBadge, VerifyStatusBadge, fmtMoney, fmtDate } from '@/components/status-badges'
import { Wallet, FileCheck2, Hourglass, ShieldCheck, TrendingUp, ReceiptText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { state } = useStore()
  const { invoices, reports } = state

  const stats = useMemo(() => {
    const submitted = reports.filter((r) => r.status !== 'draft')
    return {
      totalReports: submitted.length,
      pending: reports.filter((r) => r.status === 'pending'),
      approvedAmount: reports
        .filter((r) => r.status === 'approved' || r.status === 'paid')
        .reduce((s, r) => s + r.totalAmount, 0),
      genuineCount: invoices.filter((i) => i.verifyStatus === 'genuine').length,
      riskCount: invoices.filter((i) => i.verifyStatus === 'fake' || i.verifyStatus === 'suspicious').length,
    }
  }, [invoices, reports])

  const monthly = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of reports) {
      if (r.status === 'draft') continue
      const key = r.createdAt.slice(0, 7)
      m.set(key, (m.get(key) ?? 0) + r.totalAmount)
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month: month.slice(5) + '月', amount: Math.round(amount * 100) / 100 }))
  }, [reports])

  const cards = [
    { label: '报销单总数', value: String(stats.totalReports), sub: '不含草稿', icon: Wallet, color: 'text-blue-600 bg-blue-50' },
    { label: '待审批', value: String(stats.pending.length), sub: `合计 ${fmtMoney(stats.pending.reduce((s, r) => s + r.totalAmount, 0))}`, icon: Hourglass, color: 'text-amber-600 bg-amber-50' },
    { label: '已批准金额', value: fmtMoney(stats.approvedAmount), sub: '含已打款', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: '发票核验', value: `${stats.genuineCount} 真`, sub: `${stats.riskCount} 张存在风险`, icon: ShieldCheck, color: stats.riskCount > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">工作台</h2>
        <p className="text-muted-foreground">报销与发票核验的整体情况一览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="truncate text-xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>月度报销金额</CardTitle>
            <CardDescription>近 6 个月已提交报销单的金额分布</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {monthly.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={70} />
                  <Tooltip formatter={(v) => [fmtMoney(Number(v)), '报销金额']} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>待办与提醒</CardTitle>
            <CardDescription>需要关注的审批与风险发票</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pending.length === 0 && stats.riskCount === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">一切正常，暂无待办</p>
            )}
            {stats.pending.map((r) => (
              <button
                key={r.id}
                onClick={() => onNavigate('reports')}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <Hourglass className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.applicant} · {fmtMoney(r.totalAmount)}</p>
                </div>
                <ReportStatusBadge status={r.status} />
              </button>
            ))}
            {invoices
              .filter((i) => i.verifyStatus === 'fake' || i.verifyStatus === 'suspicious')
              .map((i) => (
                <button
                  key={i.id}
                  onClick={() => onNavigate('invoices')}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3 text-left transition-colors hover:bg-red-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.seller}</p>
                    <p className="text-xs text-muted-foreground">{i.invoiceNumber} · {fmtDate(i.issueDate)}</p>
                  </div>
                  <VerifyStatusBadge status={i.verifyStatus} />
                </button>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            最近报销单
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>部门</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.filter((r) => r.status !== 'draft').slice(0, 5).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.applicant}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.totalAmount)}</TableCell>
                  <TableCell>{fmtDate(r.submittedAt ?? r.createdAt)}</TableCell>
                  <TableCell><ReportStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
