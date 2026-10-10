import { useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { verifyInvoice, VERIFY_CHANNEL } from '@/lib/invoice-verify'
import { makeValidNumber } from '@/lib/seed'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { VerifyStatusBadge, fmtMoney, fmtDate } from '@/components/status-badges'
import { INVOICE_TYPE_LABEL, type Invoice, type InvoiceFile, type InvoiceType, type VerifyResult } from '@/types'
import { toast } from 'sonner'
import {
  UploadCloud, FileImage, FileText, FileQuestion, ShieldCheck, ShieldX, ShieldAlert,
  Loader2, CheckCircle2, XCircle, Trash2, Eye, Wand2, RotateCcw, Save,
} from 'lucide-react'

const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,.ofd'

function emptyForm() {
  return {
    invoiceCode: '',
    invoiceNumber: '',
    type: 'vat-electronic' as InvoiceType,
    issueDate: new Date().toISOString().slice(0, 10),
    amount: '',
    tax: '',
    totalAmount: '',
    checkCode: '',
    seller: '',
    buyer: '示例科技有限公司',
  }
}

function FilePreview({ file, className }: { file: InvoiceFile; className?: string }) {
  if (file.mime.startsWith('image/')) {
    return <img src={file.dataUrl} alt={file.name} className={`object-contain ${className ?? ''}`} />
  }
  if (file.mime === 'application/pdf') {
    return <iframe src={file.dataUrl} title={file.name} className={`bg-white ${className ?? ''}`} />
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${className ?? ''}`}>
      <FileQuestion className="h-10 w-10" />
      <p className="text-xs">OFD 文件暂不支持在线预览</p>
    </div>
  )
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="h-4 w-4" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4" />
  return <FileQuestion className="h-4 w-4" />
}

export default function InvoiceVerifyPage() {
  const { state, dispatch } = useStore()
  const [file, setFile] = useState<InvoiceFile | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [previewInv, setPreviewInv] = useState<Invoice | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isFullDigital = form.type === 'full-digital'

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'amount' || k === 'tax') {
        const a = parseFloat(k === 'amount' ? v : next.amount)
        const t = parseFloat(k === 'tax' ? v : next.tax)
        if (!isNaN(a) || !isNaN(t)) {
          next.totalAmount = ((isNaN(a) ? 0 : a) + (isNaN(t) ? 0 : t)).toFixed(2)
        }
      }
      return next
    })
    setResult(null)
  }

  const readFile = (f: File) => {
    if (f.size > 8 * 1024 * 1024) {
      toast.error('文件超过 8MB，请压缩后再上传')
      return
    }
    const mime = f.name.toLowerCase().endsWith('.ofd') ? 'application/ofd' : f.type
    const reader = new FileReader()
    reader.onload = () => {
      setFile({ name: f.name, size: f.size, mime, dataUrl: reader.result as string })
      toast.success(`已读取文件：${f.name}`)
    }
    reader.readAsDataURL(f)
  }

  const fillDemo = () => {
    if (isFullDigital) {
      setForm({ ...emptyForm(), type: 'full-digital', invoiceNumber: makeValidNumber('24417000000009876' + String(Math.floor(Math.random() * 90) + 10)), amount: '860.00', tax: '51.60', totalAmount: '911.60', seller: '演示商贸（上海）有限公司' })
    } else {
      setForm({
        ...emptyForm(),
        type: form.type,
        invoiceCode: '03100240' + String(Math.floor(Math.random() * 9000) + 1000),
        invoiceNumber: makeValidNumber('0' + String(Math.floor(Math.random() * 80000) + 10000) + '5'),
        amount: '326.00',
        tax: '19.56',
        totalAmount: '345.56',
        checkCode: String(Math.floor(Math.random() * 900000) + 100000),
        seller: '演示出行服务有限公司',
      })
    }
    setResult(null)
    toast.info('已填充一组可通过本地校验的演示票面，点击「开始核验」体验完整流程')
  }

  const runVerify = async () => {
    const parsed = {
      invoiceCode: form.invoiceCode.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      type: form.type,
      issueDate: form.issueDate,
      amount: parseFloat(form.amount),
      tax: parseFloat(form.tax || '0'),
      totalAmount: parseFloat(form.totalAmount),
      checkCode: form.checkCode.trim(),
    }
    if (isNaN(parsed.amount) || isNaN(parsed.totalAmount)) {
      toast.error('请填写正确的金额与价税合计')
      return
    }
    setVerifying(true)
    setResult(null)
    try {
      const r = await verifyInvoice(parsed, state.invoices)
      setResult(r)
      if (r.status === 'genuine') toast.success('核验通过：发票真实有效')
      else if (r.status === 'suspicious') toast.warning('发票存疑，请人工复核')
      else toast.error('核验不通过')
    } finally {
      setVerifying(false)
    }
  }

  const saveInvoice = () => {
    const inv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceCode: form.invoiceCode.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      type: form.type,
      issueDate: form.issueDate,
      amount: parseFloat(form.amount),
      tax: parseFloat(form.tax || '0'),
      totalAmount: parseFloat(form.totalAmount),
      checkCode: form.checkCode.trim(),
      seller: form.seller.trim() || '未填写销售方',
      buyer: form.buyer.trim(),
      file: file ?? undefined,
      verifyStatus: result?.status ?? 'unverified',
      verifyMessage: result?.message,
      verifiedAt: result?.queriedAt,
      verifyChecks: result?.checks ?? [],
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_INVOICE', invoice: inv })
    toast.success('已存入发票夹')
    setForm(emptyForm())
    setFile(null)
    setResult(null)
  }

  const resultBanner = useMemo(() => {
    if (!result) return null
    const conf = {
      genuine: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: ShieldCheck, title: '核验通过' },
      suspicious: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: ShieldAlert, title: '核验存疑' },
      fake: { cls: 'border-red-200 bg-red-50 text-red-800', Icon: ShieldX, title: '核验不通过' },
    }[result.status]
    return (
      <div className={`rounded-lg border p-4 ${conf.cls}`}>
        <div className="flex items-center gap-2 font-semibold">
          <conf.Icon className="h-5 w-5" />
          {conf.title}
        </div>
        <p className="mt-1 text-sm">{result.message}</p>
        <p className="mt-1 text-xs opacity-70">
          通道：{result.source} · {new Date(result.queriedAt).toLocaleString('zh-CN')}
        </p>
      </div>
    )
  }, [result])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">发票中心</h2>
        <p className="text-muted-foreground">上传发票文件，录入票面要素，一键完成真伪核验</p>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">上传与核验</TabsTrigger>
          <TabsTrigger value="list">发票夹（{state.invoices.length}）</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>发票文件</CardTitle>
                <CardDescription>支持 JPG / PNG / WebP / PDF / OFD，单个不超过 8MB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) readFile(f)
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                    dragOver ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/25 hover:border-blue-400 hover:bg-accent'
                  }`}
                >
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">拖拽文件到此处，或点击选择</p>
                  <p className="text-xs text-muted-foreground">图片发票建议上传原件照片，PDF 发票直接上传版式文件</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) readFile(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                {file && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileIcon mime={file.mime} />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <div className="h-72 overflow-hidden rounded-lg border bg-slate-50">
                      <FilePreview file={file} className="h-full w-full" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>票面要素</CardTitle>
                    <CardDescription>按票面如实填写，全电票无需发票代码与校验码</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fillDemo}>
                    <Wand2 className="mr-1 h-4 w-4" />
                    填充示例
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>发票种类</Label>
                    <Select value={form.type} onValueChange={(v) => set('type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(INVOICE_TYPE_LABEL) as InvoiceType[]).map((t) => (
                          <SelectItem key={t} value={t}>{INVOICE_TYPE_LABEL[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {!isFullDigital && (
                      <div className="grid gap-1.5">
                        <Label>发票代码（10/12 位）</Label>
                        <Input value={form.invoiceCode} onChange={(e) => set('invoiceCode', e.target.value)} placeholder="031002400111" />
                      </div>
                    )}
                    <div className="grid gap-1.5">
                      <Label>发票号码（{isFullDigital ? '20' : '8'} 位）</Label>
                      <Input value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>开票日期</Label>
                      <Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
                    </div>
                    {!isFullDigital && (
                      <div className="grid gap-1.5">
                        <Label>校验码（后 6 位）</Label>
                        <Input value={form.checkCode} onChange={(e) => set('checkCode', e.target.value)} maxLength={6} placeholder="582913" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label>金额（不含税）</Label>
                      <Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>税额</Label>
                      <Input type="number" step="0.01" value={form.tax} onChange={(e) => set('tax', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>价税合计</Label>
                      <Input type="number" step="0.01" value={form.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>销售方名称</Label>
                      <Input value={form.seller} onChange={(e) => set('seller', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>购买方名称</Label>
                      <Input value={form.buyer} onChange={(e) => set('buyer', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={runVerify} disabled={verifying}>
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {verifying ? '核验中…' : '开始核验'}
                  </Button>
                  <Button variant="outline" onClick={() => { setForm(emptyForm()); setFile(null); setResult(null) }}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    重置
                  </Button>
                </div>

                {resultBanner}

                {result && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">核验明细</p>
                    <div className="divide-y rounded-lg border">
                      {result.checks.map((c) => (
                        <div key={c.key} className="flex items-start gap-2 p-2.5 text-sm">
                          {c.passed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          )}
                          <div>
                            <span className="font-medium">{c.label}</span>
                            <span className="ml-2 text-muted-foreground">{c.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <Button variant="secondary" className="w-full" onClick={saveInvoice}>
                      <Save className="mr-2 h-4 w-4" />
                      存入发票夹
                    </Button>
                  </div>
                )}

                <p className="rounded-md bg-muted p-2.5 text-xs leading-relaxed text-muted-foreground">
                  说明：当前使用{VERIFY_CHANNEL}，查验结果仅用于功能演示。生产环境可在
                  queryTaxBureau() 适配器中接入国家税务总局全国增值税发票查验平台或第三方财税 API。
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>销售方</TableHead>
                    <TableHead>发票号码</TableHead>
                    <TableHead>种类</TableHead>
                    <TableHead>开票日期</TableHead>
                    <TableHead className="text-right">价税合计</TableHead>
                    <TableHead>文件</TableHead>
                    <TableHead>核验状态</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        发票夹为空，先上传并核验一张发票吧
                      </TableCell>
                    </TableRow>
                  )}
                  {state.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="max-w-48 truncate font-medium">{inv.seller}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs">{INVOICE_TYPE_LABEL[inv.type]}</TableCell>
                      <TableCell>{fmtDate(inv.issueDate)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(inv.totalAmount)}</TableCell>
                      <TableCell>
                        {inv.file ? (
                          <Button variant="ghost" size="sm" onClick={() => setPreviewInv(inv)}>
                            <Eye className="mr-1 h-4 w-4" />
                            预览
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">无</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <VerifyStatusBadge status={inv.verifyStatus} />
                          {inv.verifyMessage && inv.verifyStatus !== 'genuine' && (
                            <span className="max-w-56 truncate text-xs text-muted-foreground" title={inv.verifyMessage}>
                              {inv.verifyMessage}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            dispatch({ type: 'DELETE_INVOICE', id: inv.id })
                            toast.success('已删除该发票')
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewInv} onOpenChange={(o) => !o && setPreviewInv(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewInv?.file?.name ?? '发票预览'}</DialogTitle>
          </DialogHeader>
          {previewInv?.file && (
            <div className="h-[70vh] overflow-hidden rounded-lg border bg-slate-50">
              <FilePreview file={previewInv.file} className="h-full w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
