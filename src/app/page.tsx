'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Session } from '@/lib/supabase'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Plus, Zap, Trash2, ArrowRight, Loader2 } from 'lucide-react'

export default function Hub() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [myName, setMyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('sessions').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSessions(data); setLoading(false) })
  }, [])

  const createSession = async () => {
    if (!newName.trim() || !myName.trim()) return
    setCreating(true)
    const { data, error } = await supabase.from('sessions').insert({ name: newName.trim() }).select().single()
    if (error || !data) { toast.error('Error creando bili'); setCreating(false); return }

    // Seed creator as first participant at 100%
    await supabase.from('players').insert({
      session_id: data.id,
      name: myName.trim(),
      color: '#00e676',
      percentage: 100,
    })

    // Seed 16 default houses + entries
    const housesPayload = ['VERSUS','MARCAPUESTAS','SPORTIUM','BWIN','BET365','CODERE',
      'INTERWETTEN','WINAMAX','JUEGGING','BETFAIR','ONLYBET',
      'WILLIAM HILL','POKERSTARS','RETABET','YASSSCASINO','DAZNBET',
    ].map((name, i) => ({ session_id: data.id, name, display_order: i + 1, is_active: true, is_custom: false }))

    const { data: houses } = await supabase.from('session_houses').insert(housesPayload).select()
    if (houses) {
      await supabase.from('house_entries').insert(houses.map(h => ({ house_id: h.id })))
    }

    setSessions(prev => [data, ...prev])
    setNewName('')
    setMyName('')
    setShowForm(false)
    setCreating(false)
    router.push(`/session/${data.id}`)
  }

  const deleteSession = async (s: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${s.name}"? Se borrarán todos los datos.`)) return
    setDeleting(s.id)
    await supabase.from('sessions').delete().eq('id', s.id)
    setSessions(prev => prev.filter(x => x.id !== s.id))
    setDeleting(null)
    toast.success(`"${s.name}" eliminado`)
  }

  return (
    <>
      <Toaster theme="dark" position="top-right"
        toastOptions={{ style: { background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)', color: '#e8eaf0' } }} />
      <div className="min-h-screen flex flex-col items-center justify-start pt-16 px-4" style={{ background: '#0b0f1a' }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#00e676,#00b0ff)' }}>
            <Zap className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">BILIBETS</h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>Selecciona o crea un registro de apuestas</p>
        </div>

        {/* Sessions list */}
        <div className="w-full max-w-md space-y-3">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00e676' }} />
            </div>
          )}

          {!loading && sessions.length === 0 && !showForm && (
            <div className="text-center py-8" style={{ color: '#6b7a99' }}>
              <p className="text-sm">No hay registros todavía.</p>
              <p className="text-xs mt-1">Crea tu primer bili abajo.</p>
            </div>
          )}

          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(`/session/${s.id}`)}
              disabled={deleting === s.id}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: 'linear-gradient(135deg,rgba(0,230,118,0.2),rgba(0,176,255,0.1))', color: '#00e676' }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{s.name}</p>
                  <p className="text-xs" style={{ color: '#6b7a99' }}>
                    {new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => deleteSession(s, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/20"
                  style={{ color: '#6b7a99' }}
                >
                  {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                <ArrowRight className="w-4 h-4" style={{ color: '#00e676' }} />
              </div>
            </button>
          ))}

          {/* Create form */}
          {showForm ? (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: '#111827', border: '1px solid rgba(0,230,118,0.25)' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b7a99' }}>Nombre del registro</p>
                <input
                  placeholder="Ej: Bili de Salo, Ronda Enero..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b7a99' }}>Tu nombre</p>
                <input
                  placeholder="Ej: Salo"
                  value={myName}
                  onChange={e => setMyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSession()}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: '#6b7a99' }}>Se añadirá automáticamente con el 100% del beneficio</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); setNewName(''); setMyName('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7a99' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={createSession}
                  disabled={creating || !newName.trim() || !myName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#00e676', color: '#0b0f1a' }}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear bili'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(0,230,118,0.08)', border: '1px dashed rgba(0,230,118,0.3)', color: '#00e676' }}
            >
              <Plus className="w-4 h-4" />
              Nuevo bili
            </button>
          )}
        </div>
      </div>
    </>
  )
}
