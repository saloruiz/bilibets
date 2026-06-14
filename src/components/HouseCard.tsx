'use client'

import { useState, useCallback } from 'react'
import { supabase, type BettingHouse, type HouseEntry } from '@/lib/supabase'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  house: BettingHouse
  entry: HouseEntry | undefined
  onEntryChange: (houseId: string, updated: Partial<HouseEntry>) => void
}

type NumericField = 'apuesta' | 'contraapuesta_1' | 'perdida' | 'bono' | 'contraapuesta_2' | 'beneficio'

function Field({ label, value, onChange, highlight }: {
  label: string
  value: number | null | undefined
  onChange: (v: string) => void
  highlight?: 'green' | 'red'
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder="—"
        defaultValue={value != null ? String(value) : ''}
        onBlur={e => onChange(e.target.value)}
        className="w-full rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: highlight === 'green'
            ? '1px solid rgba(0,230,118,0.4)'
            : highlight === 'red'
            ? '1px solid rgba(245,101,101,0.4)'
            : '1px solid rgba(255,255,255,0.06)',
          color: highlight === 'green' ? '#00e676' : highlight === 'red' ? '#f56565' : '#e8eaf0',
        }}
      />
    </div>
  )
}

export default function HouseCard({ house, entry, onEntryChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const total = (entry?.perdida ?? 0) + (entry?.beneficio ?? 0)
  const hasData = entry && (entry.perdida != null || entry.beneficio != null)

  const save = useCallback(async (field: NumericField | 'bono_desc' | 'notes', value: string) => {
    if (!entry) return
    const numericFields: string[] = ['apuesta', 'contraapuesta_1', 'perdida', 'bono', 'contraapuesta_2', 'beneficio']
    const isNumeric = numericFields.includes(field)
    const parsed = isNumeric ? (value === '' || value === '-' ? null : parseFloat(value)) : value

    onEntryChange(house.id, { [field]: parsed })

    const { error } = await supabase
      .from('house_entries')
      .update({ [field]: parsed, updated_at: new Date().toISOString() })
      .eq('house_id', house.id)

    if (error) toast.error(`Error guardando ${field}`)
  }, [entry, house.id, onEntryChange])

  const totalColor = hasData && total !== 0
    ? total > 0 ? '#00e676' : '#f56565'
    : '#6b7a99'

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{
            background: hasData && total > 0 ? '#00e676'
              : hasData && total < 0 ? '#f56565'
              : 'rgba(255,255,255,0.15)'
          }} />
          <span className="font-bold text-sm tracking-wide text-white">{house.name}</span>
          {house.is_custom && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(0,176,255,0.15)', color: '#00b0ff' }}>CUSTOM</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasData ? (
            <span className="flex items-center gap-1 text-sm font-mono font-bold" style={{ color: totalColor }}>
              {total > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : total < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {total >= 0 ? '+' : ''}{total.toFixed(2)} €
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#6b7a99' }}>sin datos</span>
          )}
          {collapsed
            ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6b7a99' }} />
            : <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6b7a99' }} />}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-3 space-y-4">

          {/* Bono description */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6b7a99' }}>
              Descripción del bono
            </label>
            <input
              placeholder="Ej: Apuesta 100€ y te damos 100€ en freebets..."
              defaultValue={entry?.bono_desc ?? ''}
              onBlur={e => save('bono_desc', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#a0aec0' }}
            />
          </div>

          {/* Phase 1 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                Fase 1 · Apuesta inicial
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Apuesta (€)" value={entry?.apuesta} onChange={v => save('apuesta', v)} />
              <Field label="Contraapuesta (€)" value={entry?.contraapuesta_1} onChange={v => save('contraapuesta_1', v)} />
              <Field label="Pérdida (€)" value={entry?.perdida} onChange={v => save('perdida', v)}
                highlight={(entry?.perdida ?? 0) < 0 ? 'red' : undefined} />
            </div>
          </div>

          {/* Phase 2 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>
                Fase 2 · Bono
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Bono (€)" value={entry?.bono} onChange={v => save('bono', v)} />
              <Field label="Contraapuesta (€)" value={entry?.contraapuesta_2} onChange={v => save('contraapuesta_2', v)} />
              <Field label="Beneficio (€)" value={entry?.beneficio} onChange={v => save('beneficio', v)}
                highlight={(entry?.beneficio ?? 0) > 0 ? 'green' : undefined} />
            </div>
          </div>

          {/* Total row */}
          {hasData && (
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mt-1"
              style={{
                background: total > 0
                  ? 'rgba(0,230,118,0.08)'
                  : total < 0
                  ? 'rgba(245,101,101,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${total > 0 ? 'rgba(0,230,118,0.2)' : total < 0 ? 'rgba(245,101,101,0.2)' : 'rgba(255,255,255,0.06)'}`
              }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>
                Total (pérdida + beneficio)
              </span>
              <span className="font-mono font-black text-base" style={{ color: totalColor }}>
                {total >= 0 ? '+' : ''}{total.toFixed(2)} €
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6b7a99' }}>Notas</label>
            <input
              placeholder="Notas adicionales..."
              defaultValue={entry?.notes ?? ''}
              onBlur={e => save('notes', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#a0aec0' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
