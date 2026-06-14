'use client'

import { useState } from 'react'
import { supabase, type Player } from '@/lib/supabase'
import { DialogTrigger, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserPlus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#00e676', '#00b0ff', '#f59e0b', '#e040fb', '#ff6b6b', '#6366f1', '#14b8a6', '#f97316']

interface Props {
  players: Player[]
  grandTotal: number
  onPlayersChange: (players: Player[]) => void
}

export default function PlayerPanel({ players, grandTotal, onPlayersChange }: Props) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  const perPerson = players.length > 0 ? grandTotal / players.length : 0

  const addPlayer = async () => {
    if (!newName.trim()) return
    setLoading(true)
    const color = COLORS[players.length % COLORS.length]
    const { data, error } = await supabase.from('players').insert({ name: newName.trim(), color }).select().single()
    if (error) {
      toast.error('Error añadiendo jugador')
    } else {
      onPlayersChange([...players, data])
      setNewName('')
      setOpen(false)
      toast.success(`${data.name} añadido`)
    }
    setLoading(false)
  }

  const removePlayer = async (player: Player) => {
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) toast.error('Error eliminando jugador')
    else {
      onPlayersChange(players.filter(p => p.id !== player.id))
      toast.success(`${player.name} eliminado`)
    }
  }

  const AmountDisplay = ({ amount }: { amount: number }) => {
    const color = amount > 0 ? '#00e676' : amount < 0 ? '#f56565' : '#6b7a99'
    const Icon = amount > 0 ? TrendingUp : amount < 0 ? TrendingDown : Minus
    return (
      <span className="flex items-center gap-1 text-sm font-mono font-bold" style={{ color }}>
        <Icon className="w-3.5 h-3.5" />
        {amount >= 0 ? '+' : ''}{amount.toFixed(2)} €
      </span>
    )
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Jugadores</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)' }}
            />
          }>
            <UserPlus className="w-3 h-3" />
            Añadir
          </DialogTrigger>
          <DialogContent className="sm:max-w-xs" style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)' }}>
            <DialogHeader>
              <DialogTitle className="text-white">Añadir jugador</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-3">
              <input
                placeholder="Nombre del jugador"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                autoFocus
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
              />
              <Button
                onClick={addPlayer}
                disabled={loading || !newName.trim()}
                style={{ background: '#00e676', color: '#0b0f1a' }}
              >
                Añadir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {players.length === 0 && (
          <p className="text-xs text-center py-5" style={{ color: '#6b7a99' }}>Sin jugadores. Pulsa Añadir.</p>
        )}
        {players.map(player => (
          <div key={player.id}
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: `${player.color}0d`, border: `1px solid ${player.color}22` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: player.color }} />
              <span className="font-semibold text-sm text-white">{player.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <AmountDisplay amount={perPerson} />
              <button onClick={() => removePlayer(player)} className="transition-colors hover:opacity-70" style={{ color: '#6b7a99' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {players.length > 1 && (
        <p className="text-[10px] text-center mt-3" style={{ color: '#6b7a99' }}>
          Beneficio total ÷ {players.length} personas
        </p>
      )}
    </div>
  )
}
