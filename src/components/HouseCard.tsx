'use client'

import { useState, useCallback } from 'react'
import { supabase, type BettingHouse, type HouseEntry } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  house: BettingHouse
  entry: HouseEntry | undefined
  onEntryChange: (houseId: string, updated: Partial<HouseEntry>) => void
}

type NumericField = 'apuesta' | 'contraapuesta_1' | 'perdida' | 'bono' | 'contraapuesta_2' | 'beneficio'

export default function HouseCard({ house, entry, onEntryChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [saving, setSaving] = useState(false)

  const total = ((entry?.perdida ?? 0) + (entry?.beneficio ?? 0))
  const hasData = entry && (
    entry.apuesta != null || entry.contraapuesta_1 != null ||
    entry.perdida != null || entry.bono != null ||
    entry.contraapuesta_2 != null || entry.beneficio != null
  )

  const saveField = useCallback(async (field: NumericField | 'bono_desc' | 'notes', value: string) => {
    if (!entry) return
    setSaving(true)

    const numericFields: (NumericField)[] = ['apuesta', 'contraapuesta_1', 'perdida', 'bono', 'contraapuesta_2', 'beneficio']
    const isNumeric = numericFields.includes(field as NumericField)
    const parsed = isNumeric ? (value === '' || value === '-' ? null : parseFloat(value)) : value

    // Optimistic update
    onEntryChange(house.id, { [field]: parsed })

    const { error } = await supabase
      .from('house_entries')
      .update({ [field]: parsed, updated_at: new Date().toISOString() })
      .eq('house_id', house.id)

    if (error) {
      toast.error(`Error guardando ${field}`)
      console.error(error)
    }
    setSaving(false)
  }, [entry, house.id, onEntryChange])

  const numVal = (v: number | null | undefined) => v != null ? String(v) : ''

  const TotalBadge = () => {
    if (!hasData) return <Badge variant="secondary" className="text-xs">Sin datos</Badge>
    if (total === 0) return <Badge variant="secondary" className="text-xs flex items-center gap-1"><Minus className="w-3 h-3" />0.00 €</Badge>
    if (total > 0) return <Badge className="text-xs bg-emerald-600 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+{total.toFixed(2)} €</Badge>
    return <Badge className="text-xs bg-red-600 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{total.toFixed(2)} €</Badge>
  }

  return (
    <div className={`rounded-xl border bg-card shadow-sm transition-all ${saving ? 'opacity-80' : ''}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide">{house.name}</span>
          {house.is_custom && <Badge variant="outline" className="text-xs">Custom</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <TotalBadge />
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Bono description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descripción del bono</label>
            <Input
              placeholder="Ej: Apuesta 100€ y te damos 100€ en freebets..."
              defaultValue={entry?.bono_desc ?? ''}
              onBlur={e => saveField('bono_desc', e.target.value)}
              className="text-sm h-8"
            />
          </div>

          {/* Phase 1 */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">Fase 1 — Apuesta inicial</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Apuesta (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.apuesta)}
                  onBlur={e => saveField('apuesta', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contraapuesta (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.contraapuesta_1)}
                  onBlur={e => saveField('contraapuesta_1', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pérdida (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.perdida)}
                  onBlur={e => saveField('perdida', e.target.value)}
                  className={`h-8 text-sm ${(entry?.perdida ?? 0) < 0 ? 'border-red-400' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">Fase 2 — Bono</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bono (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.bono)}
                  onBlur={e => saveField('bono', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contraapuesta (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.contraapuesta_2)}
                  onBlur={e => saveField('contraapuesta_2', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Beneficio (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={numVal(entry?.beneficio)}
                  onBlur={e => saveField('beneficio', e.target.value)}
                  className={`h-8 text-sm ${(entry?.beneficio ?? 0) > 0 ? 'border-emerald-400' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Total */}
          {hasData && (
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${
              total > 0 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
              total < 0 ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' :
              'bg-muted text-muted-foreground'
            }`}>
              <span>TOTAL (Pérdida + Beneficio)</span>
              <span>{total >= 0 ? '+' : ''}{total.toFixed(2)} €</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
            <Input
              placeholder="Notas adicionales..."
              defaultValue={entry?.notes ?? ''}
              onBlur={e => saveField('notes', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
