// ---------- 发票 ----------
export type InvoiceType = 'vat-special' | 'vat-normal' | 'vat-electronic' | 'full-digital' | 'other'

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  'vat-special': '增值税专用发票',
  'vat-normal': '增值税普通发票',
  'vat-electronic': '增值税电子普通发票',
  'full-digital': '全面数字化的电子发票（全电票）',
  other: '其他票据',
}

export type VerifyStatus = 'unverified' | 'verifying' | 'genuine' | 'suspicious' | 'fake'

export const VERIFY_STATUS_LABEL: Record<VerifyStatus, string> = {
  unverified: '未核验',
  verifying: '核验中',
  genuine: '查验为真',
  suspicious: '存疑',
  fake: '查验不通过',
}

export interface InvoiceFile {
  name: string
  size: number
  mime: string
  /** dataURL，用于本地预览 */
  dataUrl: string
}

export interface Invoice {
  id: string
  invoiceCode: string
  invoiceNumber: string
  type: InvoiceType
  issueDate: string
  amount: number
  tax: number
  totalAmount: number
  checkCode: string
  seller: string
  buyer: string
  file?: InvoiceFile
  verifyStatus: VerifyStatus
  verifyMessage?: string
  verifiedAt?: string
  verifyChecks: VerifyCheck[]
  createdAt: string
}

export interface VerifyCheck {
  key: string
  label: string
  passed: boolean
  detail: string
}

export interface VerifyResult {
  status: Exclude<VerifyStatus, 'unverified' | 'verifying'>
  message: string
  checks: VerifyCheck[]
  source: string
  queriedAt: string
}

// ---------- 报销单 ----------
export type ExpenseCategory =
  | 'travel'
  | 'traffic'
  | 'meal'
  | 'office'
  | 'accommodation'
  | 'communication'
  | 'other'

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  travel: '差旅费',
  traffic: '市内交通费',
  meal: '业务招待费',
  office: '办公用品费',
  accommodation: '住宿费',
  communication: '通讯费',
  other: '其他费用',
}

export type ReportStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid'

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  rejected: '已驳回',
  paid: '已打款',
}

export interface ExpenseReport {
  id: string
  title: string
  applicant: string
  department: string
  category: ExpenseCategory
  invoiceIds: string[]
  totalAmount: number
  reason: string
  status: ReportStatus
  createdAt: string
  submittedAt?: string
  reviewedAt?: string
  reviewer?: string
  reviewComment?: string
}

export const DEPARTMENTS = ['研发部', '市场部', '销售部', '财务部', '人事部', '运营部']
