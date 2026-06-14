'use client'

import { useState } from 'react'
import { supabase, type Player } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserPlus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#00e676', '#00b0ff', '#f59e0b', '#e040fb', '#ff6b6b', '#6366f1', '#14b8a6', '#f97316']

interface Props {
  sessionId: string
  players: Player[]
  grandTotal: number
  onPlayersChange: (players: Player[]) => void
}

export default function PlayerPanel({ sessionId, players, grandTotal, onPlayersChange }: Props) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPct, setNewPct] = useState('50')
  const [loading, setLoading] = useState(false)
  const [editingPct, setEditingPct] = useState<string | null>(null)

  const totalPct = players.reduce((s, p) => s + p.percentage, 0)

  const addPlayer = async () => {
    if (!newName.trim()) return
    setLoading(true)
    const color = COLORS[players.length % COLORS.length]
    const pct = parseFloat(newPct) || 50
    const { data, error } = await supabase.from('players')
      .insert({ session_id: sessionId, name: newName.trim(), color, percentage: pct })
      .select().single()
    if (error) { toast.error('Error añadiendo jugador') }
    else { onPlayersChange([...players, data]); setNewName(''); setNewPct('50'); setOpen(false); toast.success(`${data.name} añadido`) }
    setLoading(false)
  }

  const removePlayer = async (player: Player) => {
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) toast.error('Error eliminando jugador')
    else { onPlayersChange(players.filter(p => p.id !== player.id)); toast.success(`${player.name} eliminado`) }
  }

  const updatePct = async (player: Player, pct: string) => {
    const num = parseFloat(pct)
    if (isNaN(num) || num < 0 || num > 100) { toast.error('Porcentaje inválido (0–100)'); return }
    const { error } = await supabase.from('players').update({ percentage: num }).eq('id', player.id)
    if (error) toast.error('Error actualizando porcentaje')
    else {
      onPlayersChange(players.map(p => p.id === player.id ? { ...p, percentage: num } : p))
      setEditingPct(null)
    }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Participantes</h2>
          {players.length > 0 && (
            <p className={`text-[9px] mt-0.5 font-mono ${Math.abs(totalPct - 100) < 0.01 ? '' : 'text-[#f59e0b]'}`}
              style={{ color: Math.abs(totalPct - 100) < 0.01 ? '#6b7a99' : '#f59e0b' }}>
              Total: {totalPct.toFixed(0)}% {Math.abs(totalPct - 100) > 0.01 && '⚠ debe sumar 100%'}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)' }} />
          }>
            <UserPlus className="w-3 h-3" />Añadir
          </DialogTrigger>
          <DialogContent className="sm:max-w-xs" style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)' }}>
            <DialogHeader><DialogTitle className="text-white">Añadir participante</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <input placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()} autoFocus
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <div className="flex items-center gap-2">
                <input placeholder="%" type="number" min="0" max="100" step="0.5"
                  value={newPct} onChange={e => setNewPct(e.target.value)}
                  className="w-20 rounded-xl px-3 py-2.5 text-sm outline-none text-white font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <span className="text-xs" style={{ color: '#6b7a99' }}>% del beneficio total</span>
              </div>
              <Button onClick={addPlayer} disabled={loading || !newName.trim()} className="w-full"
                style={{ background: '#00e676', color: '#0b0f1a' }}>
                Añadir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {players.length === 0 && (
          <p className="text-xs text-center py-5" style={{ color: '#6b7a99' }}>Sin participantes. Pulsa Añadir.</p>
        )}
        {players.map(player => {
          const share = grandTotal * (player.percentage / 100)
          const shareColor = share > 0 ? '#00e676' : share < 0 ? '#f56565' : '#6b7a99'
          return (
            <div key={player.id} className="rounded-xl px-3 py-2.5 space-y-2"
              style={{ background: `${player.color}0d`, border: `1px solid ${player.color}22` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: player.color }} />
                  <span className="font-bold text-sm text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm font-mono font-bold" style={{ color: shareColor }}>
                    {share > 0 ? <TrendingUp className="w-3 h-3" /> : share < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {share >= 0 ? '+' : ''}{share.toFixed(2)} €
                  </span>
                  <button onClick={() => removePlayer(player)} className="transition-colors hover:opacity-70" style={{ color: '#6b7a99' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Percentage row */}
              <div className="flex items-center gap-2">
                {editingPct === player.id ? (
                  <input type="number" min="0" max="100" step="0.5"
                    defaultValue={player.percentage}
                    onBlur={e => updatePct(player, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    autoFocus
                    className="w-20 rounded-lg px-2 py-1 text-xs font-mono outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e8eaf0' }} />
                ) : (
                  <button onClick={() => setEditingPct(player.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80"
                    style={{ background: `${player.color}20`, color: player.color }}>
                    {player.percentage}%
                    <span className="text-[9px] opacity-60">editar</span>
                  </button>
                )}
                <span className="text-[10px]" style={{ color: '#6b7a99' }}>del beneficio total</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
