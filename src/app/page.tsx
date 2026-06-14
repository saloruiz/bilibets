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
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { FileDown, TrendingUp, TrendingDown, Minus, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const [houses, setHouses] = useState<BettingHouse[]>([])
  const [entries, setEntries] = useState<Record<string, HouseEntry>>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)

  // ─── Load initial data ───────────────────────────────────────────────────
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

  // ─── Realtime subscriptions ──────────────────────────────────────────────
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
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [...prev, payload.new as Player])
        } else if (payload.eventType === 'DELETE') {
          setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'betting_houses' }, payload => {
        setHouses(prev => [...prev, payload.new as BettingHouse].sort((a, b) => a.display_order - b.display_order))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ─── Calculations ─────────────────────────────────────────────────────────
  const grandTotal = houses.reduce((sum, h) => {
    const e = entries[h.id]
    return sum + (e ? (e.perdida ?? 0) + (e.beneficio ?? 0) : 0)
  }, 0)

  const perPerson = players.length > 0 ? grandTotal / players.length : 0

  // ─── Entry update (optimistic) ────────────────────────────────────────────
  const handleEntryChange = useCallback((houseId: string, updated: Partial<HouseEntry>) => {
    setEntries(prev => ({
      ...prev,
      [houseId]: { ...prev[houseId], ...updated } as HouseEntry
    }))
  }, [])

  // ─── House added ──────────────────────────────────────────────────────────
  const handleHouseAdded = useCallback((house: BettingHouse, entry: HouseEntry) => {
    setHouses(prev => [...prev, house].sort((a, b) => a.display_order - b.display_order))
    setEntries(prev => ({ ...prev, [house.id]: entry }))
  }, [])

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    )
  }

  const TotalDisplay = () => {
    const formatted = `${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)} €`
    if (grandTotal > 0) return (
      <span className="flex items-center gap-2 text-emerald-600 font-mono font-bold text-xl">
        <TrendingUp className="w-5 h-5" />{formatted}
      </span>
    )
    if (grandTotal < 0) return (
      <span className="flex items-center gap-2 text-red-500 font-mono font-bold text-xl">
        <TrendingDown className="w-5 h-5" />{formatted}
      </span>
    )
    return (
      <span className="flex items-center gap-2 text-muted-foreground font-mono font-bold text-xl">
        <Minus className="w-5 h-5" />0.00 €
      </span>
    )
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background">
        {/* ─── Top bar ─────────────────────────────────────────────────── */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-black text-lg tracking-tight">BILIBETS</h1>
              <Badge variant="outline" className="text-xs hidden sm:flex">
                {houses.length} casas
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <TotalDisplay />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setPdfDialogOpen(true)}
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar PDF</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
            {/* ─── Left column: houses ──────────────────────────────────── */}
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Beneficio total</p>
                  <TotalDisplay />
                </div>
                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Por persona</p>
                  <span className={`font-mono font-bold text-xl ${perPerson > 0 ? 'text-emerald-600' : perPerson < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {perPerson >= 0 ? '+' : ''}{perPerson.toFixed(2)} €
                  </span>
                </div>
                <div className="rounded-xl border bg-card p-4 space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Participantes</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {players.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Ninguno</span>
                    ) : players.map(p => (
                      <span key={p.id} className="flex items-center gap-1 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

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

              <div className="flex justify-center pt-2">
                <AddHouseModal houses={houses} onHouseAdded={handleHouseAdded} />
              </div>
            </div>

            {/* ─── Right column: players panel ─────────────────────────── */}
            <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
              <PlayerPanel
                players={players}
                grandTotal={grandTotal}
                onPlayersChange={setPlayers}
              />

              {/* Houses with data summary */}
              <div className="rounded-xl border bg-card shadow-sm p-4">
                <h2 className="font-bold text-sm tracking-wide uppercase text-muted-foreground mb-3">Resumen por casa</h2>
                <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                  {houses.map(house => {
                    const e = entries[house.id]
                    const t = e ? (e.perdida ?? 0) + (e.beneficio ?? 0) : 0
                    const hasData = e && (e.perdida != null || e.beneficio != null)
                    if (!hasData) return null
                    return (
                      <div key={house.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted-foreground truncate pr-2">{house.name}</span>
                        <span className={`font-mono font-semibold flex-shrink-0 ${t > 0 ? 'text-emerald-600' : t < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {t >= 0 ? '+' : ''}{t.toFixed(2)} €
                        </span>
                      </div>
                    )
                  })}
                  {houses.every(h => {
                    const e = entries[h.id]
                    return !e || (e.perdida == null && e.beneficio == null)
                  }) && (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin datos aún</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── PDF Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Descargar informe PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">Elige el tipo de informe:</p>
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => {
                generatePDF(houses, entries, players)
                setPdfDialogOpen(false)
                toast.success('PDF generado')
              }}
            >
              <FileDown className="w-4 h-4" />
              Informe general completo
            </Button>
            <Separator />
            <p className="text-xs text-muted-foreground">O por jugador:</p>
            {players.map(player => (
              <Button
                key={player.id}
                className="w-full justify-start gap-3"
                variant="outline"
                onClick={() => {
                  generatePDF(houses, entries, players, player.name)
                  setPdfDialogOpen(false)
                  toast.success(`PDF de ${player.name} generado`)
                }}
              >
                <User className="w-4 h-4" style={{ color: player.color }} />
                Informe de {player.name}
              </Button>
            ))}
            {players.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Añade jugadores para informes personalizados</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
