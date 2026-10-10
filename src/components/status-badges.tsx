import { Badge } from '@/components/ui/badge'
import { REPORT_STATUS_LABEL, VERIFY_STATUS_LABEL, type ReportStatus, type VerifyStatus } from '@/types'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react'

export function VerifyStatusBadge({ status }: { status: VerifyStatus }) {
  const map: Record<VerifyStatus, { cls: string; icon: React.ReactNode }> = {
    genuine: {
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    suspicious: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    fake: {
      cls: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
      icon: <XCircle className="h-3 w-3" />,
    },
    unverified: {
      cls: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50',
      icon: <Clock className="h-3 w-3" />,
    },
    verifying: {
      cls: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
  }
  const { cls, icon } = map[status]
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      {icon}
      {VERIFY_STATUS_LABEL[status]}
    </Badge>
  )
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, string> = {
    draft: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50',
    pending: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    rejected: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
    paid: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50',
  }
  return (
    <Badge variant="outline" className={map[status]}>
      {REPORT_STATUS_LABEL[status]}
    </Badge>
  )
}

export const fmtMoney = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10) : '—')
