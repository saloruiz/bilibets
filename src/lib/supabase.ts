import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Player = {
  id: string
  name: string
  color: string
  created_at: string
}

export type BettingHouse = {
  id: string
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
  beneficio: number | null
  notes: string
  updated_at: string
}
