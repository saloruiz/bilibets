import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Session = {
  id: string
  name: string
  created_at: string
}

export type Player = {
  id: string
  session_id: string
  name: string
  color: string
  percentage: number
  created_at: string
}

export type SessionHouse = {
  id: string
  session_id: string
  name: string
  display_order: number
  is_active: boolean
  is_custom: boolean
  created_at: string
}

export type HouseEntry = {
  id: string
  house_id: string
  bono_desc: string
  apuesta: number | null
  contraapuesta_1: number | null
  perdida: number | null
  bono: number | null
  contraapuesta_2: number | null
  beneficio_expr: string | null
  beneficio: number | null
  notes: string
  updated_at: string
}

export const DEFAULT_HOUSES = [
  'VERSUS','MARCAPUESTAS','SPORTIUM','BWIN','BET365','CODERE',
  'INTERWETTEN','WINAMAX','JUEGGING','BETFAIR','ONLYBET',
  'WILLIAM HILL','POKERSTARS','RETABET','YASSSCASINO','DAZNBET',
]

/** Safe arithmetic expression evaluator — only digits, operators, parens, dots */
export function evalExpr(expr: string): number | null {
  const clean = expr.replace(/\s/g, '')
  if (clean === '' || clean === '-') return null
  if (!/^[\d+\-*/().]+$/.test(clean)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${clean})`)() as number
    if (!isFinite(result) || isNaN(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}

/** TOTAL = beneficio - perdida (perdida always subtracts) */
export function calcTotal(entry: HouseEntry | undefined): number {
  if (!entry) return 0
  return (entry.beneficio ?? 0) - (entry.perdida ?? 0)
}
