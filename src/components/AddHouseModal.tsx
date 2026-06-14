'use client'

import { useState } from 'react'
import { supabase, type BettingHouse, type HouseEntry } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  houses: BettingHouse[]
  onHouseAdded: (house: BettingHouse, entry: HouseEntry) => void
}

export default function AddHouseModal({ houses, onHouseAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const add = async () => {
    if (!name.trim()) return
    setLoading(true)
    const maxOrder = houses.reduce((m, h) => Math.max(m, h.display_order), 0)

    const { data: house, error: houseErr } = await supabase
      .from('betting_houses')
      .insert({ name: name.trim().toUpperCase(), display_order: maxOrder + 1, is_active: true, is_custom: true })
      .select().single()

    if (houseErr) { toast.error('Error creando casa'); setLoading(false); return }

    const { data: entry, error: entryErr } = await supabase
      .from('house_entries').insert({ house_id: house.id }).select().single()

    if (entryErr) { toast.error('Error creando entrada'); setLoading(false); return }

    onHouseAdded(house, entry)
    setName('')
    setOpen(false)
    toast.success(`${house.name} añadida`)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: '#6b7a99' }}
        />
      }>
        <Plus className="w-4 h-4" />
        Añadir casa de apuestas
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs" style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)' }}>
        <DialogHeader>
          <DialogTitle className="text-white">Nueva casa de apuestas</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-3">
          <input
            placeholder="Nombre (ej: BETWAY)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            autoFocus
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
          />
          <Button onClick={add} disabled={loading || !name.trim()} style={{ background: '#00e676', color: '#0b0f1a' }}>
            Añadir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
