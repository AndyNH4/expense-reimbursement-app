import { computeCheckDigit } from './invoice-verify'
import type { Invoice, ExpenseReport } from '@/types'

/** 生成末位满足本地校验位算法的发票号码（用于演示数据） */
export function makeValidNumber(prefix: string): string {
  for (let d = 0; d <= 9; d++) {
    const n = prefix + d
    if (computeCheckDigit(n) === d) return n
  }
  return prefix + '0'
}

export function buildSeed(): { invoices: Invoice[]; reports: ExpenseReport[] } {
  const num1 = makeValidNumber('2431200000000123456')
  const num2 = makeValidNumber('0117234')
  const num3 = makeValidNumber('0324178')
  const num4 = makeValidNumber('0566101')
  const badNum = num2.slice(0, 7) + ((Number(num2[7]) + 1) % 10)

  const now = Date.now()
  const day = 24 * 3600 * 1000

  const invoices: Invoice[] = [
    {
      id: 'inv-001',
      invoiceCode: '',
      invoiceNumber: num1,
      type: 'full-digital',
      issueDate: new Date(now - 40 * day).toISOString().slice(0, 10),
      amount: 1280,
      tax: 76.8,
      totalAmount: 1356.8,
      checkCode: '',
      seller: '上海华辰酒店管理有限公司',
      buyer: '示例科技有限公司',
      verifyStatus: 'genuine',
      verifyMessage: '本地校验与税局查验全部通过，发票真实有效',
      verifiedAt: new Date(now - 38 * day).toISOString(),
      verifyChecks: [],
      createdAt: new Date(now - 40 * day).toISOString(),
    },
    {
      id: 'inv-002',
      invoiceCode: '031002400111',
      invoiceNumber: num2,
      type: 'vat-electronic',
      issueDate: new Date(now - 12 * day).toISOString().slice(0, 10),
      amount: 386,
      tax: 23.16,
      totalAmount: 409.16,
      checkCode: '582913',
      seller: '杭州快行网约车服务有限公司',
      buyer: '示例科技有限公司',
      verifyStatus: 'genuine',
      verifyMessage: '本地校验与税局查验全部通过，发票真实有效',
      verifiedAt: new Date(now - 11 * day).toISOString(),
      verifyChecks: [],
      createdAt: new Date(now - 12 * day).toISOString(),
    },
    {
      id: 'inv-003',
      invoiceCode: '011002300207',
      invoiceNumber: num3,
      type: 'vat-normal',
      issueDate: new Date(now - 6 * day).toISOString().slice(0, 10),
      amount: 450,
      tax: 27,
      totalAmount: 477,
      checkCode: '730244',
      seller: '北京汇贤餐饮管理有限公司',
      buyer: '示例科技有限公司',
      verifyStatus: 'genuine',
      verifyMessage: '本地校验与税局查验全部通过，发票真实有效',
      verifiedAt: new Date(now - 6 * day).toISOString(),
      verifyChecks: [],
      createdAt: new Date(now - 6 * day).toISOString(),
    },
    {
      id: 'inv-004',
      invoiceCode: '044002210305',
      invoiceNumber: num4,
      type: 'vat-special',
      issueDate: new Date(now - 3 * day).toISOString().slice(0, 10),
      amount: 2200,
      tax: 286,
      totalAmount: 2486,
      checkCode: '091822',
      seller: '深圳格物办公设备有限公司',
      buyer: '示例科技有限公司',
      verifyStatus: 'genuine',
      verifyMessage: '本地校验与税局查验全部通过，发票真实有效',
      verifiedAt: new Date(now - 3 * day).toISOString(),
      verifyChecks: [],
      createdAt: new Date(now - 3 * day).toISOString(),
    },
    {
      id: 'inv-005',
      invoiceCode: '031002400111',
      invoiceNumber: badNum,
      type: 'vat-electronic',
      issueDate: new Date(now - 2 * day).toISOString().slice(0, 10),
      amount: 500,
      tax: 30,
      totalAmount: 530,
      checkCode: '112233',
      seller: '某未知商户',
      buyer: '示例科技有限公司',
      verifyStatus: 'fake',
      verifyMessage: '本地校验发现 1 项异常：号码校验位核验',
      verifiedAt: new Date(now - 2 * day).toISOString(),
      verifyChecks: [],
      createdAt: new Date(now - 2 * day).toISOString(),
    },
  ]

  const reports: ExpenseReport[] = [
    {
      id: 'rep-001',
      title: '9 月上海出差住宿费',
      applicant: '张明',
      department: '市场部',
      category: 'accommodation',
      invoiceIds: ['inv-001'],
      totalAmount: 1356.8,
      reason: '9 月赴上海参加行业展会，住宿两晚。',
      status: 'paid',
      createdAt: new Date(now - 38 * day).toISOString(),
      submittedAt: new Date(now - 38 * day).toISOString(),
      reviewedAt: new Date(now - 36 * day).toISOString(),
      reviewer: '李财务',
      reviewComment: '发票查验通过，金额符合差旅标准，已安排打款。',
    },
    {
      id: 'rep-002',
      title: '客户拜访交通费',
      applicant: '王芳',
      department: '销售部',
      category: 'traffic',
      invoiceIds: ['inv-002'],
      totalAmount: 409.16,
      reason: '拜访城西三家客户产生的网约车费用。',
      status: 'pending',
      createdAt: new Date(now - 11 * day).toISOString(),
      submittedAt: new Date(now - 11 * day).toISOString(),
    },
    {
      id: 'rep-003',
      title: '项目组加班餐费',
      applicant: '陈强',
      department: '研发部',
      category: 'meal',
      invoiceIds: ['inv-003'],
      totalAmount: 477,
      reason: '版本发布周项目组加班工作餐。',
      status: 'rejected',
      createdAt: new Date(now - 6 * day).toISOString(),
      submittedAt: new Date(now - 6 * day).toISOString(),
      reviewedAt: new Date(now - 5 * day).toISOString(),
      reviewer: '李财务',
      reviewComment: '缺少加班审批单，请补充后重新提交。',
    },
  ]

  return { invoices, reports }
}
