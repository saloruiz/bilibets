'use client'

import { useState, useCallback } from 'react'
import { supabase, type SessionHouse, type HouseEntry, evalExpr, calcTotal } from '@/lib/supabase'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  house: SessionHouse
  entry: HouseEntry | undefined
  onEntryChange: (houseId: string, updated: Partial<HouseEntry>) => void
  onDeleted: (houseId: string) => void
}

function NumericField({ label, value, onChange, highlight, hint }: {
  label: string
  value: number | null | undefined
  onChange: (v: string) => void
  highlight?: 'green' | 'red'
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>{label}</label>
      <input
        type="number"
        step="0.01"
        placeholder="—"
        defaultValue={value != null ? String(value) : ''}
        onBlur={e => onChange(e.target.value)}
        className="w-full rounded-xl px-2.5 py-2 text-sm font-mono outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${highlight === 'green' ? 'rgba(0,230,118,0.35)' : highlight === 'red' ? 'rgba(245,101,101,0.35)' : 'rgba(255,255,255,0.07)'}`,
          color: highlight === 'green' ? '#00e676' : highlight === 'red' ? '#f56565' : '#e8eaf0',
        }}
      />
      {hint && <p className="text-[9px]" style={{ color: '#6b7a99' }}>{hint}</p>}
    </div>
  )
}

function ExprField({ label, expr, value, onChange }: {
  label: string
  expr: string | null | undefined
  value: number | null | undefined
  onChange: (expr: string) => void
}) {
  const [localExpr, setLocalExpr] = useState(expr ?? '')
  const evaluated = evalExpr(localExpr)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7a99' }}>{label}</label>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Ej: 6+7+8+9"
        value={localExpr}
        onChange={e => setLocalExpr(e.target.value)}
        onBlur={() => onChange(localExpr)}
        className="w-full rounded-xl px-2.5 py-2 text-sm font-mono outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${(value ?? 0) > 0 ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.07)'}`,
          color: '#e8eaf0',
        }}
      />
      {localExpr && evaluated !== null && (
        <p className="text-[9px] font-mono" style={{ color: '#00e676' }}>= {evaluated.toFixed(2)} €</p>
      )}
      {localExpr && evaluated === null && (
        <p className="text-[9px]" style={{ color: '#f56565' }}>Expresión inválida</p>
      )}
    </div>
  )
}

export default function HouseCard({ house, entry, onEntryChange, onDeleted }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const total = calcTotal(entry)
  const hasData = entry && (entry.perdida != null || entry.beneficio != null)
  const totalColor = hasData && total !== 0 ? (total > 0 ? '#00e676' : '#f56565') : '#6b7a99'

  const saveNumeric = useCallback(async (field: 'apuesta' | 'contraapuesta_1' | 'perdida' | 'bono' | 'contraapuesta_2', rawValue: string) => {
    if (!entry) return
    const parsed = rawValue === '' || rawValue === '-' ? null : parseFloat(rawValue)
    onEntryChange(house.id, { [field]: parsed })
    const { error } = await supabase.from('house_entries')
      .update({ [field]: parsed, updated_at: new Date().toISOString() })
      .eq('house_id', house.id)
    if (error) toast.error(`Error guardando`)
  }, [entry, house.id, onEntryChange])

  const saveExpr = useCallback(async (rawExpr: string) => {
    if (!entry) return
    const evaluated = evalExpr(rawExpr)
    const update = { beneficio_expr: rawExpr || null, beneficio: evaluated, updated_at: new Date().toISOString() }
    onEntryChange(house.id, update)
    const { error } = await supabase.from('house_entries').update(update).eq('house_id', house.id)
    if (error) toast.error('Error guardando beneficio')
  }, [entry, house.id, onEntryChange])

  const saveText = useCallback(async (field: 'bono_desc' | 'notes', value: string) => {
    if (!entry) return
    onEntryChange(house.id, { [field]: value })
    await supabase.from('house_entries').update({ [field]: value, updated_at: new Date().toISOString() }).eq('house_id', house.id)
  }, [entry, house.id, onEntryChange])

  const deleteHouse = async () => {
    if (!confirm(`¿Eliminar "${house.name}"?`)) return
    setDeleting(true)
    const { error } = await supabase.from('session_houses').delete().eq('id', house.id)
    if (error) { toast.error('Error eliminando casa'); setDeleting(false) }
    else { onDeleted(house.id); toast.success(`${house.name} eliminada`) }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
        onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: hasData && total > 0 ? '#00e676' : hasData && total < 0 ? '#f56565' : 'rgba(255,255,255,0.15)' }} />
          <span className="font-bold text-sm text-white">{house.name}</span>
          {house.is_custom && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
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
          <button onClick={e => { e.stopPropagation(); deleteHouse() }} disabled={deleting}
            className="p-1 rounded-lg transition-all hover:bg-red-500/20 ml-1"
            style={{ color: '#6b7a99' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6b7a99' }} />
            : <ChevronUp className="w-3.5 h-3.5" style={{ color: '#6b7a99' }} />}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {/* Bono description */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#6b7a99' }}>Descripción del bono</label>
            <input placeholder="Ej: Apuesta 100€ y te damos 100€ en freebets..."
              defaultValue={entry?.bono_desc ?? ''}
              onBlur={e => saveText('bono_desc', e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#a0aec0' }} />
          </div>

          {/* Phase 1 */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-2"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Fase 1 · Apuesta inicial</span>
            <div className="grid grid-cols-3 gap-2">
              <NumericField label="Apuesta (€)" value={entry?.apuesta} onChange={v => saveNumeric('apuesta', v)} />
              <NumericField label="Contraapuesta (€)" value={entry?.contraapuesta_1} onChange={v => saveNumeric('contraapuesta_1', v)} />
              <NumericField label="Pérdida (€)" value={entry?.perdida} onChange={v => saveNumeric('perdida', v)}
                highlight={(entry?.perdida ?? 0) > 0 ? 'red' : undefined}
                hint="Resta del total" />
            </div>
          </div>

          {/* Phase 2 */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-2"
              style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>Fase 2 · Bono</span>
            <div className="grid grid-cols-3 gap-2">
              <NumericField label="Bono (€)" value={entry?.bono} onChange={v => saveNumeric('bono', v)} />
              <NumericField label="Contraapuesta (€)" value={entry?.contraapuesta_2} onChange={v => saveNumeric('contraapuesta_2', v)} />
              <ExprField label="Beneficio (€)" expr={entry?.beneficio_expr} value={entry?.beneficio}
                onChange={saveExpr} />
            </div>
          </div>

          {/* Total */}
          {hasData && (
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{
                background: total > 0 ? 'rgba(0,230,118,0.07)' : total < 0 ? 'rgba(245,101,101,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${total > 0 ? 'rgba(0,230,118,0.2)' : total < 0 ? 'rgba(245,101,101,0.2)' : 'rgba(255,255,255,0.06)'}`
              }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7a99' }}>
                Total (beneficio − pérdida)
              </span>
              <span className="font-mono font-black text-base" style={{ color: totalColor }}>
                {total >= 0 ? '+' : ''}{total.toFixed(2)} €
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#6b7a99' }}>Notas</label>
            <input placeholder="Notas adicionales..."
              defaultValue={entry?.notes ?? ''}
              onBlur={e => saveText('notes', e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#a0aec0' }} />
          </div>
        </div>
      )}
    </div>
  )
}
