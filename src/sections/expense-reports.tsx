import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ReportStatusBadge, VerifyStatusBadge, fmtMoney, fmtDate } from '@/components/status-badges'
import {
  DEPARTMENTS, EXPENSE_CATEGORY_LABEL, INVOICE_TYPE_LABEL,
  type ExpenseCategory, type ExpenseReport, type ReportStatus,
} from '@/types'
import { toast } from 'sonner'
import { Plus, Send, CheckCheck, Ban, ReceiptText, FileWarning } from 'lucide-react'

const STATUS_TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已驳回' },
  { value: 'paid', label: '已打款' },
]

export default function ExpenseReportsPage() {
  const { state, dispatch } = useStore()
  const { invoices, reports } = state

  const [tab, setTab] = useState<ReportStatus | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<ExpenseReport | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const [form, setForm] = useState({
    title: '',
    applicant: '',
    department: DEPARTMENTS[0],
    category: 'traffic' as ExpenseCategory,
    reason: '',
    invoiceIds: [] as string[],
  })

  const availableInvoices = useMemo(() => {
    const used = new Set(
      reports.filter((r) => r.status !== 'rejected').flatMap((r) => r.invoiceIds),
    )
    return invoices.filter((i) => i.verifyStatus === 'genuine' && !used.has(i.id))
  }, [invoices, reports])

  const selectedTotal = useMemo(
    () =>
      form.invoiceIds
        .map((id) => availableInvoices.find((i) => i.id === id)?.totalAmount ?? 0)
        .reduce((s, v) => s + v, 0),
    [form.invoiceIds, availableInvoices],
  )

  const filtered = useMemo(
    () => reports.filter((r) => r.status !== 'draft' && (tab === 'all' || r.status === tab)),
    [reports, tab],
  )

  const toggleInvoice = (id: string) => {
    setForm((f) => ({
      ...f,
      invoiceIds: f.invoiceIds.includes(id) ? f.invoiceIds.filter((x) => x !== id) : [...f.invoiceIds, id],
    }))
  }

  const submitReport = () => {
    if (!form.title.trim()) return toast.error('请填写报销事由标题')
    if (!form.applicant.trim()) return toast.error('请填写申请人')
    if (form.invoiceIds.length === 0) return toast.error('请至少关联一张已核验发票')
    const report: ExpenseReport = {
      id: `rep-${Date.now()}`,
      title: form.title.trim(),
      applicant: form.applicant.trim(),
      department: form.department,
      category: form.category,
      invoiceIds: form.invoiceIds,
      totalAmount: Math.round(selectedTotal * 100) / 100,
      reason: form.reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_REPORT', report })
    toast.success('报销单已提交，等待审批')
    setCreateOpen(false)
    setForm({ title: '', applicant: '', department: DEPARTMENTS[0], category: 'traffic', reason: '', invoiceIds: [] })
  }

  const review = (status: 'approved' | 'rejected') => {
    if (!detail) return
    if (status === 'rejected' && !reviewComment.trim()) {
      return toast.error('驳回时请填写审批意见')
    }
    dispatch({
      type: 'UPDATE_REPORT',
      report: {
        ...detail,
        status,
        reviewedAt: new Date().toISOString(),
        reviewer: '李财务',
        reviewComment: reviewComment.trim() || (status === 'approved' ? '发票查验通过，同意报销。' : ''),
      },
    })
    toast.success(status === 'approved' ? '已批准该报销单' : '已驳回该报销单')
    setDetail(null)
    setReviewComment('')
  }

  const detailInvoices = detail ? invoices.filter((i) => detail.invoiceIds.includes(i.id)) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">报销单管理</h2>
          <p className="text-muted-foreground">关联已核验发票提交报销，跟踪审批进度</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建报销单
        </Button>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <Button
            key={t.value}
            variant={tab === t.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t.value)}
          >
            {t.label}
            {t.value !== 'all' && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
                {reports.filter((r) => r.status === t.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>申请人 / 部门</TableHead>
                <TableHead>费用类别</TableHead>
                <TableHead>发票数</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    暂无报销单
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => { setDetail(r); setReviewComment('') }}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.applicant} · {r.department}</TableCell>
                  <TableCell>{EXPENSE_CATEGORY_LABEL[r.category]}</TableCell>
                  <TableCell>{r.invoiceIds.length} 张</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(r.totalAmount)}</TableCell>
                  <TableCell>{fmtDate(r.submittedAt ?? r.createdAt)}</TableCell>
                  <TableCell><ReportStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建报销单</DialogTitle>
            <DialogDescription>仅可关联「查验为真」且未被其他报销单占用的发票</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>报销标题 *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：10 月客户拜访交通费" />
              </div>
              <div className="grid gap-1.5">
                <Label>申请人 *</Label>
                <Input value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>部门</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>费用类别</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>关联发票（{form.invoiceIds.length} 张，合计 {fmtMoney(selectedTotal)}）</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                {availableInvoices.length === 0 && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <FileWarning className="h-4 w-4" />
                    没有可关联的发票，请先到「发票中心」上传并核验发票
                  </div>
                )}
                {availableInvoices.map((inv) => (
                  <label key={inv.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 hover:bg-accent">
                    <Checkbox
                      checked={form.invoiceIds.includes(inv.id)}
                      onCheckedChange={() => toggleInvoice(inv.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.seller}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {inv.invoiceNumber} · {INVOICE_TYPE_LABEL[inv.type]} · {fmtDate(inv.issueDate)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{fmtMoney(inv.totalAmount)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>报销事由</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="补充说明费用发生的背景" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={submitReport}>
              <Send className="mr-2 h-4 w-4" />
              提交报销单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <ReceiptText className="h-5 w-5" />
                  {detail.title}
                  <ReportStatusBadge status={detail.status} />
                </DialogTitle>
                <DialogDescription>
                  {detail.applicant} · {detail.department} · {EXPENSE_CATEGORY_LABEL[detail.category]} · 提交于 {fmtDate(detail.submittedAt ?? detail.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {detail.reason && (
                  <p className="rounded-md bg-muted p-3 text-sm">{detail.reason}</p>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium">关联发票（{detailInvoices.length} 张）</p>
                  <div className="divide-y rounded-lg border">
                    {detailInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{inv.seller}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {inv.invoiceNumber} · {fmtDate(inv.issueDate)}
                          </p>
                        </div>
                        <VerifyStatusBadge status={inv.verifyStatus} />
                        <span className="w-24 text-right text-sm font-medium">{fmtMoney(inv.totalAmount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-muted/50 p-3 text-sm font-semibold">
                      <span>合计</span>
                      <span>{fmtMoney(detail.totalAmount)}</span>
                    </div>
                  </div>
                  {detailInvoices.some((i) => i.verifyStatus !== 'genuine') && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <FileWarning className="h-3.5 w-3.5" />
                      存在未通过核验的发票，审批时请重点关注
                    </p>
                  )}
                </div>

                {detail.reviewComment && (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">审批意见（{detail.reviewer} · {fmtDate(detail.reviewedAt)}）</p>
                    <p className="mt-1 text-muted-foreground">{detail.reviewComment}</p>
                  </div>
                )}

                {detail.status === 'pending' && (
                  <>
                    <Separator />
                    <div className="grid gap-1.5">
                      <Label>审批意见</Label>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={2}
                        placeholder="批准可留空；驳回必须填写原因"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => review('rejected')}>
                        <Ban className="mr-2 h-4 w-4" />
                        驳回
                      </Button>
                      <Button onClick={() => review('approved')}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        批准
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
