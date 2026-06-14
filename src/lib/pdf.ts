import { jsPDF } from 'jspdf'
import type { Session, SessionHouse, HouseEntry, Player } from './supabase'
import { calcTotal } from './supabase'

export function generatePDF(
  session: Session,
  houses: SessionHouse[],
  entries: Record<string, HouseEntry>,
  players: Player[],
  playerName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 15
  const CW = W - M * 2

  const grandTotal = houses.reduce((s, h) => s + calcTotal(entries[h.id]), 0)
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  // ─── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(11, 15, 26)
  doc.rect(0, 0, W, 44, 'F')
  doc.setFillColor(0, 230, 118)
  doc.roundedRect(M, 8, 8, 8, 1.5, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('VILIBETS', M + 11, 15.5)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 122, 153)
  doc.text(session.name, M + 11, 22)
  doc.text(`Generado: ${date}`, M, 33)

  if (playerName) {
    doc.setTextColor(0, 230, 118)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Informe de: ${playerName}`, W - M, 33, { align: 'right' })
  }

  // ─── Summary box ─────────────────────────────────────────────────────────
  let y = 52
  doc.setFillColor(17, 24, 39)
  doc.roundedRect(M, y, CW, 26, 3, 3, 'F')
  doc.setDrawColor(255, 255, 255, 0.07)

  const col = CW / 3

  // Grand total
  doc.setTextColor(107, 122, 153); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('BENEFICIO TOTAL', M + 5, y + 8)
  doc.setTextColor(grandTotal >= 0 ? 0 : 245, grandTotal >= 0 ? 230 : 101, grandTotal >= 0 ? 118 : 101)
  doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text(`${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)} €`, M + 5, y + 20)

  // Player specific
  const targetPlayer = playerName ? players.find(p => p.name === playerName) : null
  const myShare = targetPlayer ? grandTotal * (targetPlayer.percentage / 100) : null

  if (myShare !== null) {
    doc.setTextColor(107, 122, 153); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('MI PARTE', M + col + 5, y + 8)
    doc.setTextColor(myShare >= 0 ? 0 : 245, myShare >= 0 ? 230 : 101, myShare >= 0 ? 118 : 101)
    doc.setFontSize(15); doc.setFont('helvetica', 'bold')
    doc.text(`${myShare >= 0 ? '+' : ''}${myShare.toFixed(2)} €`, M + col + 5, y + 20)
    doc.setTextColor(107, 122, 153); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text(`(${targetPlayer!.percentage}% del total)`, M + col + 5, y + 25)
  }

  // Participants
  doc.setTextColor(107, 122, 153); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('PARTICIPANTES', M + col * 2 + 5, y + 8)
  let py = y + 14
  players.forEach(p => {
    const s = grandTotal * (p.percentage / 100)
    doc.setTextColor(232, 234, 240); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(`${p.name} (${p.percentage}%)`, M + col * 2 + 5, py)
    doc.setTextColor(s >= 0 ? 0 : 245, s >= 0 ? 230 : 101, s >= 0 ? 118 : 101)
    doc.text(`${s >= 0 ? '+' : ''}${s.toFixed(2)} €`, W - M - 5, py, { align: 'right' })
    py += 6
  })

  y += 34

  // ─── House table ─────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39)
  doc.roundedRect(M, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(107, 122, 153); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
  doc.text('CASA', M + 3, y + 5.5)
  doc.text('DESCRIPCIÓN BONO', M + 40, y + 5.5)
  doc.text('PÉRDIDA', M + 100, y + 5.5)
  doc.text('BENEFICIO', M + 125, y + 5.5)
  doc.text('TOTAL', W - M - 3, y + 5.5, { align: 'right' })
  y += 10

  let row = 0
  for (const house of houses) {
    const entry = entries[house.id]
    const total = calcTotal(entry)
    if (y > 272) { doc.addPage(); y = 20 }
    doc.setFillColor(row % 2 === 0 ? 17 : 20, row % 2 === 0 ? 24 : 27, row % 2 === 0 ? 39 : 44)
    doc.rect(M, y, CW, 7, 'F')
    doc.setTextColor(232, 234, 240); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(house.name, M + 3, y + 5)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 122, 153)
    const bonoDesc = entry?.bono_desc ? entry.bono_desc.substring(0, 35) : '—'
    doc.text(bonoDesc, M + 40, y + 5)
    doc.text(entry?.perdida != null ? `${entry.perdida.toFixed(2)} €` : '—', M + 100, y + 5)
    doc.text(entry?.beneficio != null ? `${entry.beneficio.toFixed(2)} €` : '—', M + 125, y + 5)
    if (total !== 0) {
      doc.setTextColor(total > 0 ? 0 : 245, total > 0 ? 230 : 101, total > 0 ? 118 : 101)
      doc.setFont('helvetica', 'bold')
    }
    doc.text(total !== 0 ? `${total >= 0 ? '+' : ''}${total.toFixed(2)} €` : '—', W - M - 3, y + 5, { align: 'right' })
    y += 7; row++
  }

  // Total row
  y += 2
  doc.setFillColor(0, 230, 118)
  doc.roundedRect(M, y, CW, 8, 1.5, 1.5, 'F')
  doc.setTextColor(11, 15, 26); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', M + 3, y + 5.5)
  doc.text(`${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)} €`, W - M - 3, y + 5.5, { align: 'right' })

  // ─── Footer ──────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7); doc.setTextColor(107, 122, 153); doc.setFont('helvetica', 'normal')
    doc.text(`Vilibets · ${session.name} · ${date} · Pág. ${i}/${pages}`, W / 2, 290, { align: 'center' })
  }

  const fname = playerName
    ? `vilibets-${session.name.toLowerCase().replace(/\s+/g, '-')}-${playerName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
    : `vilibets-${session.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fname)
}
