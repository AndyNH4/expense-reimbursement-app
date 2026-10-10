import type { Invoice, VerifyCheck, VerifyResult } from '@/types'

/**
 * 发票真伪核验引擎
 *
 * 核验分三层：
 * 1. 本地结构化校验：号码格式、日期、金额勾稽、校验位
 * 2. 重复报销检测：同一发票代码+号码在系统内已存在
 * 3. 税局查验通道：queryTaxBureau() 是可替换的适配器。
 *    演示环境使用内置模拟通道；生产环境应替换为对接
 *    国家税务总局全国增值税发票查验平台（inv-veri.chinatax.gov.cn）
 *    或第三方财税 SaaS 的查验 API（需服务端代理）。
 */

export const VERIFY_CHANNEL = '内置模拟查验通道（演示环境）'

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 发票号码加权校验位 */
export function computeCheckDigit(number: string): number {
  const weights = [7, 9, 10, 5, 8, 4, 2]
  let sum = 0
  for (let i = 0; i < number.length; i++) {
    sum += Number(number[i]) * weights[i % weights.length]
  }
  const map = [1, 0, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  return map[sum % 11]
}

const isDigits = (s: string) => /^\d+$/.test(s)

// ---------- 第一层：本地结构化校验 ----------
export function validateInvoiceLocally(
  inv: Pick<Invoice, 'invoiceCode' | 'invoiceNumber' | 'type' | 'issueDate' | 'amount' | 'tax' | 'totalAmount' | 'checkCode'>,
): VerifyCheck[] {
  const checks: VerifyCheck[] = []
  const isFullDigital = inv.type === 'full-digital'

  let numOk: boolean
  let numDetail: string
  if (isFullDigital) {
    numOk = inv.invoiceNumber.length === 20 && isDigits(inv.invoiceNumber)
    numDetail = numOk ? '20 位全电发票号码，格式正确' : '全电发票号码应为 20 位纯数字'
  } else {
    numOk = inv.invoiceNumber.length === 8 && isDigits(inv.invoiceNumber)
    numDetail = numOk ? '8 位发票号码，格式正确' : '传统发票号码应为 8 位纯数字'
  }
  checks.push({ key: 'number-format', label: '发票号码格式', passed: numOk, detail: numDetail })

  if (!isFullDigital) {
    const codeOk = (inv.invoiceCode.length === 10 || inv.invoiceCode.length === 12) && isDigits(inv.invoiceCode)
    checks.push({
      key: 'code-format',
      label: '发票代码格式',
      passed: codeOk,
      detail: codeOk ? `${inv.invoiceCode.length} 位发票代码，格式正确` : '发票代码应为 10 位或 12 位纯数字',
    })
  }

  const d = new Date(inv.issueDate)
  const now = new Date()
  const dateOk = !isNaN(d.getTime()) && d <= now && d >= new Date('2011-01-01')
  checks.push({
    key: 'date',
    label: '开票日期合理性',
    passed: dateOk,
    detail: isNaN(d.getTime())
      ? '开票日期无法解析'
      : d > now
        ? '开票日期晚于当前日期，明显异常'
        : d < new Date('2011-01-01')
          ? '开票日期早于 2011 年，超出有效查验范围'
          : `开票日期 ${inv.issueDate}，在有效范围内`,
  })

  const sum = Math.round((inv.amount + inv.tax) * 100) / 100
  const total = Math.round(inv.totalAmount * 100) / 100
  const amountOk = total > 0 && Math.abs(sum - total) <= 0.01
  checks.push({
    key: 'amount',
    label: '金额勾稽关系',
    passed: amountOk,
    detail: amountOk
      ? `金额 ${inv.amount.toFixed(2)} + 税额 ${inv.tax.toFixed(2)} = 价税合计 ${total.toFixed(2)}，勾稽一致`
      : `金额+税额=${sum.toFixed(2)}，与价税合计 ${total.toFixed(2)} 不符`,
  })

  if (!isFullDigital) {
    const ccOk = /^\d{6}$/.test(inv.checkCode)
    checks.push({
      key: 'checkcode-format',
      label: '校验码格式',
      passed: ccOk,
      detail: ccOk ? '校验码后 6 位格式正确' : '请输入发票校验码的后 6 位数字',
    })
  }

  if (numOk) {
    const expect = computeCheckDigit(inv.invoiceNumber)
    const actual = Number(inv.invoiceNumber[inv.invoiceNumber.length - 1])
    const ok = expect === actual
    checks.push({
      key: 'check-digit',
      label: '号码校验位核验',
      passed: ok,
      detail: ok ? '末位校验位与号码加权计算结果一致' : `按加权算法末位应为 ${expect}，实际为 ${actual}，疑似伪造号码`,
    })
  }

  return checks
}

// ---------- 第三层：税局查验通道（可替换适配器） ----------
export interface BureauQueryInput {
  invoiceCode: string
  invoiceNumber: string
  type: Invoice['type']
  issueDate: string
  totalAmount: number
  checkCode: string
}

export interface BureauQueryOutput {
  found: boolean
  consistent: boolean
  rawMessage: string
}

/**
 * 模拟查验通道：结果对同一组票面要素是确定性的。
 * 生产环境替换为真实 API 调用即可，函数签名保持不变。
 */
export async function queryTaxBureau(input: BureauQueryInput): Promise<BureauQueryOutput> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 900))

  const key = `${input.invoiceCode}|${input.invoiceNumber}`
  const h = hashCode(key)

  if (input.invoiceNumber[1] === '9') {
    return { found: false, consistent: false, rawMessage: '查验平台返回：查无此票' }
  }
  if (h % 13 === 0) {
    return { found: true, consistent: false, rawMessage: '查验平台返回：票面金额与税务登记信息不一致' }
  }
  return { found: true, consistent: true, rawMessage: '查验平台返回：发票信息一致，状态正常' }
}

// ---------- 汇总：执行完整核验 ----------
export async function verifyInvoice(
  inv: Pick<Invoice, 'invoiceCode' | 'invoiceNumber' | 'type' | 'issueDate' | 'amount' | 'tax' | 'totalAmount' | 'checkCode'>,
  existingInvoices: Invoice[],
): Promise<VerifyResult> {
  const checks = validateInvoiceLocally(inv)
  const localFailed = checks.filter((c) => !c.passed)

  if (localFailed.length > 0) {
    return {
      status: 'fake',
      message: `本地校验发现 ${localFailed.length} 项异常：${localFailed.map((c) => c.label).join('、')}`,
      checks,
      source: VERIFY_CHANNEL,
      queriedAt: new Date().toISOString(),
    }
  }

  const dup = existingInvoices.find(
    (e) => e.invoiceCode === inv.invoiceCode && e.invoiceNumber === inv.invoiceNumber,
  )
  if (dup) {
    checks.push({
      key: 'duplicate',
      label: '重复报销检测',
      passed: false,
      detail: `该发票已于 ${dup.createdAt.slice(0, 10)} 录入系统（销售方：${dup.seller}），疑似重复报销`,
    })
    return {
      status: 'suspicious',
      message: '发票要素合法，但系统内已存在相同代码+号码的发票，存在重复报销风险',
      checks,
      source: VERIFY_CHANNEL,
      queriedAt: new Date().toISOString(),
    }
  }
  checks.push({ key: 'duplicate', label: '重复报销检测', passed: true, detail: '系统内未发现相同发票' })

  const bureau = await queryTaxBureau(inv)
  checks.push({
    key: 'bureau',
    label: '税局查验结果',
    passed: bureau.found && bureau.consistent,
    detail: bureau.rawMessage,
  })

  if (!bureau.found) {
    return {
      status: 'fake',
      message: '税局查验平台查无此票，判定为假票或作废票',
      checks,
      source: VERIFY_CHANNEL,
      queriedAt: new Date().toISOString(),
    }
  }
  if (!bureau.consistent) {
    return {
      status: 'suspicious',
      message: '发票存在，但票面信息与税务登记不一致，请人工复核',
      checks,
      source: VERIFY_CHANNEL,
      queriedAt: new Date().toISOString(),
    }
  }
  return {
    status: 'genuine',
    message: '本地校验与税局查验全部通过，发票真实有效',
    checks,
    source: VERIFY_CHANNEL,
    queriedAt: new Date().toISOString(),
  }
}
