import { jsPDF } from 'jspdf'
import type { BettingHouse, HouseEntry, Player } from './supabase'

function calcTotal(entry: HouseEntry | undefined): number {
  if (!entry) return 0
  const perdida = entry.perdida ?? 0
  const beneficio = entry.beneficio ?? 0
  return perdida + beneficio
}

export function generatePDF(
  houses: BettingHouse[],
  entries: Record<string, HouseEntry>,
  players: Player[],
  playerName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  // ─── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 46)
  doc.rect(0, 0, pageWidth, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('BILIBETS', margin, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 200)
  doc.text('Resumen de Apuestas', margin, 26)

  const date = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
  doc.text(`Generado: ${date}`, margin, 33)

  if (playerName) {
    doc.setTextColor(255, 215, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Informe para: ${playerName}`, pageWidth - margin, 26, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 180, 200)
  }

  // ─── Summary box ──────────────────────────────────────────────────────────
  const activeHouses = houses.filter(h => h.is_active)
  const grandTotal = activeHouses.reduce((sum, h) => sum + calcTotal(entries[h.id]), 0)
  const perPerson = players.length > 0 ? grandTotal / players.length : 0

  let y = 50

  doc.setFillColor(245, 245, 255)
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F')
  doc.setDrawColor(200, 200, 220)
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S')

  const boxThird = contentWidth / 3

  // Total
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('BENEFICIO TOTAL', margin + 10, y + 9)
  doc.setTextColor(grandTotal >= 0 ? 22 : 200, grandTotal >= 0 ? 160 : 30, grandTotal >= 0 ? 80 : 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)} €`, margin + 10, y + 21)

  // Per person
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('BENEFICIO POR PERSONA', margin + boxThird + 5, y + 9)
  doc.setTextColor(perPerson >= 0 ? 22 : 200, perPerson >= 0 ? 160 : 30, perPerson >= 0 ? 80 : 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${perPerson >= 0 ? '+' : ''}${perPerson.toFixed(2)} €`, margin + boxThird + 5, y + 21)

  // Players
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('PARTICIPANTES', margin + boxThird * 2 + 5, y + 9)
  doc.setTextColor(30, 30, 46)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(players.map(p => p.name).join(', '), margin + boxThird * 2 + 5, y + 21)

  y += 36

  // ─── Players breakdown ────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 46)
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DESGLOSE POR JUGADOR', margin + 4, y + 5.5)
  y += 12

  players.forEach(player => {
    doc.setFillColor(250, 250, 255)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setTextColor(50, 50, 70)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(player.name, margin + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    const amount = perPerson >= 0 ? `+${perPerson.toFixed(2)} €` : `${perPerson.toFixed(2)} €`
    doc.text(amount, pageWidth - margin - 4, y + 5, { align: 'right' })
    y += 8
  })

  y += 6

  // ─── House table ──────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 46)
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE POR CASA DE APUESTAS', margin + 4, y + 5.5)
  y += 12

  // Table headers
  const cols = {
    name: margin,
    bono: margin + 40,
    apuesta: margin + 75,
    perdida: margin + 100,
    beneficio: margin + 125,
    total: margin + 155
  }

  doc.setFillColor(240, 240, 250)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CASA', cols.name + 2, y + 5)
  doc.text('BONO (€)', cols.bono, y + 5)
  doc.text('APUESTA (€)', cols.apuesta, y + 5)
  doc.text('PÉRDIDA (€)', cols.perdida, y + 5)
  doc.text('BENEFICIO (€)', cols.beneficio, y + 5)
  doc.text('TOTAL (€)', cols.total, y + 5)
  y += 8

  let rowCount = 0
  activeHouses.forEach(house => {
    const entry = entries[house.id]
    const total = calcTotal(entry)

    if (y > 270) {
      doc.addPage()
      y = 20
    }

    doc.setFillColor(rowCount % 2 === 0 ? 252 : 245, rowCount % 2 === 0 ? 252 : 245, rowCount % 2 === 0 ? 255 : 250)
    doc.rect(margin, y, contentWidth, 7, 'F')

    doc.setTextColor(30, 30, 46)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(house.name, cols.name + 2, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 100)

    const fmt = (v: number | null | undefined) => v != null ? v.toFixed(2) : '-'
    doc.text(fmt(entry?.bono), cols.bono + 15, y + 5, { align: 'right' })
    doc.text(fmt(entry?.apuesta), cols.apuesta + 20, y + 5, { align: 'right' })
    doc.text(fmt(entry?.perdida), cols.perdida + 20, y + 5, { align: 'right' })
    doc.text(fmt(entry?.beneficio), cols.beneficio + 22, y + 5, { align: 'right' })

    if (total !== 0) {
      doc.setTextColor(total >= 0 ? 22 : 200, total >= 0 ? 160 : 30, total >= 0 ? 80 : 30)
      doc.setFont('helvetica', 'bold')
    }
    doc.text(total !== 0 ? `${total >= 0 ? '+' : ''}${total.toFixed(2)}` : '-', cols.total + 18, y + 5, { align: 'right' })

    y += 7
    rowCount++
  })

  // ─── Total row ────────────────────────────────────────────────────────────
  y += 2
  doc.setFillColor(30, 30, 46)
  doc.rect(margin, y, contentWidth, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', cols.name + 2, y + 5.5)
  doc.text(`${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)} €`, cols.total + 18, y + 5.5, { align: 'right' })

  // ─── Footer ───────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 170)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Bilibets · Página ${i} de ${pageCount} · ${date}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    )
  }

  const filename = playerName
    ? `bilibets-informe-${playerName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
    : `bilibets-informe-${new Date().toISOString().slice(0, 10)}.pdf`

  doc.save(filename)
}
