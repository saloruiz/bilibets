'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type Session, type Player, type SessionHouse, type HouseEntry, calcTotal } from '@/lib/supabase'
import { generatePDF } from '@/lib/pdf'
import HouseCard from '@/components/HouseCard'
import PlayerPanel from '@/components/PlayerPanel'
import AddHouseModal from '@/components/AddHouseModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { ArrowLeft, FileDown, TrendingUp, TrendingDown, Loader2, User, Zap } from 'lucide-react'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [houses, setHouses] = useState<SessionHouse[]>([])
  const [entries, setEntries] = useState<Record<string, HouseEntry>>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfOpen, setPdfOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: h }, { data: e }, { data: p }] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).single(),
        supabase.from('session_houses').select('*').eq('session_id', id).eq('is_active', true).order('display_order'),
        supabase.from('house_entries').select('*, session_houses!inner(session_id)').eq('session_houses.session_id', id),
        supabase.from('players').select('*').eq('session_id', id).order('created_at'),
      ])
      if (s) setSession(s)
      if (h) setHouses(h)
      if (e) {
        const map: Record<string, HouseEntry> = {}
        e.forEach((entry: HouseEntry) => { map[entry.house_id] = entry })
        setEntries(map)
      }
      if (p) setPlayers(p)
      setLoading(false)
    }
    load()
  }, [id])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`session-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_entries' }, payload => {
        if (payload.eventType === 'UPDATE') {
          const u = payload.new as HouseEntry
          setEntries(prev => ({ ...prev, [u.house_id]: u }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        if (payload.eventType === 'INSERT') setPlayers(prev => [...prev, payload.new as Player])
        else if (payload.eventType === 'UPDATE') setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new as Player : p))
        else if (payload.eventType === 'DELETE') setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'session_houses' }, payload => {
        setHouses(prev => prev.filter(h => h.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  const grandTotal = houses.reduce((sum, h) => sum + calcTotal(entries[h.id]), 0)

  const handleEntryChange = useCallback((houseId: string, updated: Partial<HouseEntry>) => {
    setEntries(prev => ({ ...prev, [houseId]: { ...prev[houseId], ...updated } as HouseEntry }))
  }, [])

  const handleHouseAdded = useCallback((house: SessionHouse, entry: HouseEntry) => {
    setHouses(prev => [...prev, house].sort((a, b) => a.display_order - b.display_order))
    setEntries(prev => ({ ...prev, [house.id]: entry }))
  }, [])

  const handleHouseDeleted = useCallback((houseId: string) => {
    setHouses(prev => prev.filter(h => h.id !== houseId))
    setEntries(prev => { const n = { ...prev }; delete n[houseId]; return n })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0f1a' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00e676' }} />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0f1a' }}>
      <p className="text-white">Sesión no encontrada.</p>
    </div>
  )

  const isPositive = grandTotal > 0
  const isNegative = grandTotal < 0

  return (
    <>
      <Toaster theme="dark" position="top-right"
        toastOptions={{ style: { background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)', color: '#e8eaf0' } }} />
      <div className="min-h-screen" style={{ background: '#0b0f1a' }}>

        {/* Header */}
        <header className="sticky top-0 z-20" style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/')}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-70"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#00e676,#00b0ff)' }}>
                  <Zap className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="font-black text-white tracking-tight">{session.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-xs" style={{ color: '#6b7a99' }}>Total</span>
                <span className={`font-mono font-bold text-sm ${isPositive ? 'text-[#00e676]' : isNegative ? 'text-[#f56565]' : 'text-white'}`}>
                  {grandTotal >= 0 ? '+' : ''}{grandTotal.toFixed(2)} €
                </span>
              </div>
              <button onClick={() => setPdfOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)' }}>
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

            {/* Left: houses */}
            <div className="space-y-5">
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl p-4 flex flex-col gap-1"
                  style={{ background: 'linear-gradient(135deg,rgba(0,230,118,0.1),rgba(0,176,255,0.05))', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Beneficio total</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isPositive && <TrendingUp className="w-4 h-4 text-[#00e676]" />}
                    {isNegative && <TrendingDown className="w-4 h-4 text-[#f56565]" />}
                    <span className={`font-mono font-black text-2xl ${isPositive ? 'text-[#00e676]' : isNegative ? 'text-[#f56565]' : 'text-white'}`}>
                      {grandTotal >= 0 ? '+' : ''}{grandTotal.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl p-4 flex flex-col gap-2"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Por participante</span>
                  <div className="space-y-0.5 mt-0.5">
                    {players.length === 0
                      ? <span className="text-sm font-mono" style={{ color: '#6b7a99' }}>—</span>
                      : players.map(p => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: p.color }}>{p.name}</span>
                          <span className={`text-xs font-mono font-bold ${grandTotal * (p.percentage / 100) > 0 ? 'text-[#00e676]' : grandTotal * (p.percentage / 100) < 0 ? 'text-[#f56565]' : 'text-white'}`}>
                            {(grandTotal * (p.percentage / 100)) >= 0 ? '+' : ''}{(grandTotal * (p.percentage / 100)).toFixed(2)} €
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div className="rounded-2xl p-4 flex flex-col gap-1"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Participantes</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {players.length === 0
                      ? <span className="text-sm" style={{ color: '#6b7a99' }}>—</span>
                      : players.map(p => (
                        <span key={p.id} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                          {p.name} · {p.percentage}%
                        </span>
                      ))
                    }
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Houses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {houses.map(house => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    entry={entries[house.id]}
                    onEntryChange={handleEntryChange}
                    onDeleted={handleHouseDeleted}
                  />
                ))}
              </div>

              <div className="flex justify-center pt-1">
                <AddHouseModal sessionId={id} houses={houses} onHouseAdded={handleHouseAdded} />
              </div>
            </div>

            {/* Right: players sidebar */}
            <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
              <PlayerPanel sessionId={id} players={players} grandTotal={grandTotal} onPlayersChange={setPlayers} />

              {/* Mini house summary */}
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#6b7a99' }}>Resumen casas</h3>
                <div className="space-y-0.5 max-h-80 overflow-y-auto">
                  {houses.map(house => {
                    const t = calcTotal(entries[house.id])
                    const hasData = entries[house.id] && (entries[house.id].perdida != null || entries[house.id].beneficio != null)
                    if (!hasData) return null
                    return (
                      <div key={house.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span className="text-xs truncate pr-2" style={{ color: '#a0aec0' }}>{house.name}</span>
                        <span className={`text-xs font-mono font-bold flex-shrink-0 ${t > 0 ? 'text-[#00e676]' : t < 0 ? 'text-[#f56565]' : 'text-[#6b7a99]'}`}>
                          {t >= 0 ? '+' : ''}{t.toFixed(2)} €
                        </span>
                      </div>
                    )
                  })}
                  {!houses.some(h => entries[h.id] && (entries[h.id].perdida != null || entries[h.id].beneficio != null)) && (
                    <p className="text-xs text-center py-6" style={{ color: '#6b7a99' }}>Sin datos aún</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* PDF dialog */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-sm" style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Descargar informe PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <p className="text-xs" style={{ color: '#6b7a99' }}>Elige el informe:</p>
            <button onClick={() => { generatePDF(session, houses, entries, players); setPdfOpen(false); toast.success('PDF generado') }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all hover:opacity-80"
              style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', color: '#00e676' }}>
              <FileDown className="w-4 h-4 flex-shrink-0" />
              Informe general
            </button>
            {players.length > 0 && <>
              <Separator style={{ background: 'rgba(255,255,255,0.06)' }} />
              {players.map(p => (
                <button key={p.id} onClick={() => { generatePDF(session, houses, entries, players, p.name); setPdfOpen(false); toast.success(`PDF de ${p.name} generado`) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all hover:opacity-80"
                  style={{ background: `${p.color}14`, border: `1px solid ${p.color}33`, color: p.color }}>
                  <User className="w-4 h-4 flex-shrink-0" />
                  Informe de {p.name}
                </button>
              ))}
            </>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
