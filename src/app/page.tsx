'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type BettingHouse, type HouseEntry, type Player } from '@/lib/supabase'
import { generatePDF } from '@/lib/pdf'
import HouseCard from '@/components/HouseCard'
import PlayerPanel from '@/components/PlayerPanel'
import AddHouseModal from '@/components/AddHouseModal'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { FileDown, TrendingUp, TrendingDown, Loader2, User, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const [houses, setHouses] = useState<BettingHouse[]>([])
  const [entries, setEntries] = useState<Record<string, HouseEntry>>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: housesData }, { data: entriesData }, { data: playersData }] = await Promise.all([
        supabase.from('betting_houses').select('*').eq('is_active', true).order('display_order'),
        supabase.from('house_entries').select('*'),
        supabase.from('players').select('*').order('created_at'),
      ])
      if (housesData) setHouses(housesData)
      if (entriesData) {
        const map: Record<string, HouseEntry> = {}
        entriesData.forEach(e => { map[e.house_id] = e })
        setEntries(map)
      }
      if (playersData) setPlayers(playersData)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_entries' }, payload => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as HouseEntry
          setEntries(prev => ({ ...prev, [updated.house_id]: updated }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        if (payload.eventType === 'INSERT') setPlayers(prev => [...prev, payload.new as Player])
        else if (payload.eventType === 'DELETE') setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'betting_houses' }, payload => {
        setHouses(prev => [...prev, payload.new as BettingHouse].sort((a, b) => a.display_order - b.display_order))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const grandTotal = houses.reduce((sum, h) => {
    const e = entries[h.id]
    return sum + (e ? (e.perdida ?? 0) + (e.beneficio ?? 0) : 0)
  }, 0)
  const perPerson = players.length > 0 ? grandTotal / players.length : 0

  const handleEntryChange = useCallback((houseId: string, updated: Partial<HouseEntry>) => {
    setEntries(prev => ({ ...prev, [houseId]: { ...prev[houseId], ...updated } as HouseEntry }))
  }, [])

  const handleHouseAdded = useCallback((house: BettingHouse, entry: HouseEntry) => {
    setHouses(prev => [...prev, house].sort((a, b) => a.display_order - b.display_order))
    setEntries(prev => ({ ...prev, [house.id]: entry }))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00e676]/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#00e676]" />
          </div>
          <span className="text-sm text-[#6b7a99]">Cargando...</span>
        </div>
      </div>
    )
  }

  const isPositive = grandTotal > 0
  const isNegative = grandTotal < 0

  return (
    <>
      <Toaster
        theme="dark"
        toastOptions={{ style: { background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)', color: '#e8eaf0' } }}
        position="top-right"
      />

      <div className="min-h-screen" style={{ background: '#0b0f1a' }}>

        {/* ── Header ── */}
        <header style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00e676,#00b0ff)' }}>
                  <Zap className="w-4 h-4 text-black" />
                </div>
                <span className="font-black text-white tracking-tight text-lg">BILIBETS</span>
              </div>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676' }}>
                {houses.length} casas
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Total pill in header */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-xs" style={{ color: '#6b7a99' }}>Total</span>
                <span className={`font-mono font-bold text-sm ${isPositive ? 'text-[#00e676]' : isNegative ? 'text-[#f56565]' : 'text-[#6b7a99]'}`}>
                  {grandTotal >= 0 ? '+' : ''}{grandTotal.toFixed(2)} €
                </span>
              </div>
              <button
                onClick={() => setPdfDialogOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)' }}
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-6">

            {/* ── Left: houses ── */}
            <div className="space-y-5">

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                {/* Total card */}
                <div className="col-span-1 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,rgba(0,230,118,0.12),rgba(0,176,255,0.06))', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Beneficio total</span>
                  <div className="flex items-center gap-2 mt-1">
                    {isPositive && <TrendingUp className="w-4 h-4 text-[#00e676]" />}
                    {isNegative && <TrendingDown className="w-4 h-4 text-[#f56565]" />}
                    <span className={`font-mono font-black text-2xl ${isPositive ? 'text-[#00e676]' : isNegative ? 'text-[#f56565]' : 'text-white'}`}>
                      {grandTotal >= 0 ? '+' : ''}{grandTotal.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Per person card */}
                <div className="col-span-1 rounded-2xl p-4 flex flex-col gap-1"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Por persona</span>
                  <span className={`font-mono font-black text-2xl mt-1 ${perPerson > 0 ? 'text-[#00e676]' : perPerson < 0 ? 'text-[#f56565]' : 'text-white'}`}>
                    {perPerson >= 0 ? '+' : ''}{perPerson.toFixed(2)} €
                  </span>
                </div>

                {/* Players pill */}
                <div className="col-span-1 rounded-2xl p-4 flex flex-col gap-2"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>Participantes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {players.length === 0
                      ? <span className="text-sm" style={{ color: '#6b7a99' }}>—</span>
                      : players.map(p => (
                        <span key={p.id} className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                          {p.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Houses grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {houses.map(house => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    entry={entries[house.id]}
                    onEntryChange={handleEntryChange}
                  />
                ))}
              </div>

              <div className="flex justify-center pt-1">
                <AddHouseModal houses={houses} onHouseAdded={handleHouseAdded} />
              </div>
            </div>

            {/* ── Right: sidebar ── */}
            <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
              <PlayerPanel players={players} grandTotal={grandTotal} onPlayersChange={setPlayers} />

              {/* Mini summary per house */}
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#6b7a99' }}>Resumen casas</h3>
                <div className="space-y-0.5 max-h-96 overflow-y-auto">
                  {houses.map(house => {
                    const e = entries[house.id]
                    const t = e ? (e.perdida ?? 0) + (e.beneficio ?? 0) : 0
                    const hasData = e && (e.perdida != null || e.beneficio != null)
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
                  {houses.every(h => { const e = entries[h.id]; return !e || (e.perdida == null && e.beneficio == null) }) && (
                    <p className="text-xs text-center py-6" style={{ color: '#6b7a99' }}>Sin datos aún</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── PDF Dialog ── */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-sm" style={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Descargar informe PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <p className="text-xs" style={{ color: '#6b7a99' }}>Elige el tipo de informe:</p>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 text-left"
              style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', color: '#00e676' }}
              onClick={() => { generatePDF(houses, entries, players); setPdfDialogOpen(false); toast.success('PDF generado') }}
            >
              <FileDown className="w-4 h-4 flex-shrink-0" />
              Informe general completo
            </button>
            {players.length > 0 && (
              <>
                <Separator style={{ background: 'rgba(255,255,255,0.06)' }} />
                <p className="text-xs" style={{ color: '#6b7a99' }}>Por jugador:</p>
                {players.map(player => (
                  <button
                    key={player.id}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 text-left"
                    style={{ background: `${player.color}14`, border: `1px solid ${player.color}33`, color: player.color }}
                    onClick={() => { generatePDF(houses, entries, players, player.name); setPdfDialogOpen(false); toast.success(`PDF de ${player.name} generado`) }}
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    Informe de {player.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
