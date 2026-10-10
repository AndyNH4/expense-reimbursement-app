import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { ExpenseReport, Invoice } from '@/types'
import { buildSeed } from './seed'

interface State {
  invoices: Invoice[]
  reports: ExpenseReport[]
}

type Action =
  | { type: 'ADD_INVOICE'; invoice: Invoice }
  | { type: 'UPDATE_INVOICE'; invoice: Invoice }
  | { type: 'DELETE_INVOICE'; id: string }
  | { type: 'ADD_REPORT'; report: ExpenseReport }
  | { type: 'UPDATE_REPORT'; report: ExpenseReport }
  | { type: 'RESET' }

const STORAGE_KEY = 'expense-reimbursement-v1'

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_INVOICE':
      return { ...state, invoices: [action.invoice, ...state.invoices] }
    case 'UPDATE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map((i) => (i.id === action.invoice.id ? action.invoice : i)),
      }
    case 'DELETE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.filter((i) => i.id !== action.id),
        reports: state.reports.map((r) =>
          r.invoiceIds.includes(action.id) && r.status === 'draft'
            ? { ...r, invoiceIds: r.invoiceIds.filter((x) => x !== action.id) }
            : r,
        ),
      }
    case 'ADD_REPORT':
      return { ...state, reports: [action.report, ...state.reports] }
    case 'UPDATE_REPORT':
      return {
        ...state,
        reports: state.reports.map((r) => (r.id === action.report.id ? action.report : r)),
      }
    case 'RESET':
      return buildSeed()
    default:
      return state
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.invoices) && Array.isArray(parsed.reports)) return parsed
    }
  } catch {
    // ignore corrupted storage
  }
  return buildSeed()
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full — keep app running in memory
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
