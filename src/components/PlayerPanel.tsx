'use client'

import { useState } from 'react'
import { supabase, type Player } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UserPlus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'
]

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
    const { data, error } = await supabase
      .from('players')
      .insert({ name: newName.trim(), color })
      .select()
      .single()

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
    if (error) {
      toast.error('Error eliminando jugador')
    } else {
      onPlayersChange(players.filter(p => p.id !== player.id))
      toast.success(`${player.name} eliminado`)
    }
  }

  const AmountBadge = ({ amount }: { amount: number }) => {
    if (amount === 0) return (
      <span className="flex items-center gap-1 text-muted-foreground text-sm font-mono">
        <Minus className="w-3 h-3" />0.00 €
      </span>
    )
    if (amount > 0) return (
      <span className="flex items-center gap-1 text-emerald-600 text-sm font-mono font-bold">
        <TrendingUp className="w-3 h-3" />+{amount.toFixed(2)} €
      </span>
    )
    return (
      <span className="flex items-center gap-1 text-red-500 text-sm font-mono font-bold">
        <TrendingDown className="w-3 h-3" />{amount.toFixed(2)} €
      </span>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm tracking-wide uppercase text-muted-foreground">Jugadores</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 text-xs gap-1" />}>
            <UserPlus className="w-3 h-3" />Añadir
          </DialogTrigger>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Añadir jugador</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Nombre del jugador"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                autoFocus
              />
              <Button onClick={addPlayer} disabled={loading || !newName.trim()}>
                Añadir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {players.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No hay jugadores. Añade uno.</p>
        )}
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: player.color }}
              />
              <span className="font-medium text-sm">{player.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <AmountBadge amount={perPerson} />
              <button
                onClick={() => removePlayer(player)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {players.length > 1 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Beneficio total ÷ {players.length} personas
        </p>
      )}
    </div>
  )
}
