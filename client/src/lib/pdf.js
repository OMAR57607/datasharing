import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { STORE_NAME, WHATSAPP_DISPLAY, STORE_EMAIL } from './config.js'
import { formatPrice } from '../components/ProductCard.jsx'

// Carga el logo como dataURL para incrustarlo en el PDF.
async function loadLogo() {
  try {
    const res = await fetch('/logo.jpg')
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Genera y DESCARGA el PDF de la cotización (sin diálogo de impresión).
export async function downloadQuotePdf({ form, items, subtotal, iva, total }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  let y = 16

  const logo = await loadLogo()
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', M, y, 26, 16)
    } catch {
      /* ignora si el logo no carga */
    }
  }

  // Encabezado derecho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(226, 35, 26)
  doc.text('COTIZACIÓN', W - M, y + 6, { align: 'right' })
  const now = new Date()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(
    `${now.toLocaleDateString('es-MX')} · ${now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    W - M,
    y + 11,
    { align: 'right' }
  )

  // Nombre de la tienda
  y += 21
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text(STORE_NAME, M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text('Venta de accesorios automotrices · Puebla, México', M, y + 5)

  // Línea roja
  y += 9
  doc.setDrawColor(226, 35, 26)
  doc.setLineWidth(0.6)
  doc.line(M, y, W - M, y)

  // Datos del cliente
  y += 7
  doc.setFontSize(10)
  const cliente = [
    ['Cliente:', form.nombre || '—'],
    ['Teléfono:', form.telefono || '—'],
    form.email ? ['Correo:', form.email] : null,
    form.vehiculo ? ['Vehículo:', form.vehiculo] : null,
  ].filter(Boolean)
  cliente.forEach(([k, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20)
    doc.text(k, M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(val), M + 22, y)
    y += 5
  })

  // Tabla de accesorios
  autoTable(doc, {
    startY: y + 3,
    head: [['Accesorio', 'Cant.', 'Unitario', 'Importe']],
    body: items.map((i) => [
      i.name + (i.sku ? `\nNº parte ${i.sku}` : ''),
      String(i.qty),
      i.price != null ? formatPrice(i.price) : 'A consultar',
      i.price != null ? formatPrice(i.price * i.qty) : '—',
    ]),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fontStyle: 'bold', textColor: 90, lineWidth: { bottom: 0.3 }, lineColor: 200 },
    bodyStyles: { textColor: 30, lineWidth: { bottom: 0.1 }, lineColor: 225 },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: M, right: M },
  })
  let ty = doc.lastAutoTable.finalY + 7

  // Totales
  const rx = W - M
  const lx = W - M - 55
  const totalRow = (label, val, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(bold ? 20 : 90)
    doc.text(label, lx, ty)
    doc.text(val, rx, ty, { align: 'right' })
    ty += 6
  }
  doc.setFontSize(10)
  totalRow('Subtotal', formatPrice(subtotal))
  totalRow('IVA (16%)', formatPrice(iva))
  doc.setDrawColor(226, 35, 26)
  doc.setLineWidth(0.4)
  doc.line(lx, ty - 3, rx, ty - 3)
  doc.setFontSize(12)
  totalRow('Total', formatPrice(total), true)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.setFont('helvetica', 'normal')
  doc.text('Precios en MXN, IVA incluido.', rx, ty, { align: 'right' })
  ty += 9

  // Notas
  if (form.notas) {
    doc.setFontSize(9)
    doc.setTextColor(60)
    const nl = doc.splitTextToSize(`Notas: ${form.notas}`, W - 2 * M)
    doc.text(nl, M, ty)
    ty += nl.length * 4 + 3
  }

  // Términos legales
  doc.setFontSize(8)
  doc.setTextColor(70)
  doc.setFont('helvetica', 'bold')
  doc.text('Información y términos de la cotización:', M, ty)
  ty += 4
  doc.setFont('helvetica', 'normal')
  const legal = [
    'Vigencia: válida por 15 días naturales, sujeta a disponibilidad de inventario.',
    'Precios e impuestos: en Moneda Nacional (MXN) e incluyen IVA (16%).',
    'Carácter informativo: estimación presupuestaria; no constituye factura ni obligación de compra.',
  ]
  legal.forEach((t) => {
    const lines = doc.splitTextToSize('- ' + t, W - 2 * M)
    doc.text(lines, M, ty)
    ty += lines.length * 3.6
  })

  // Pie
  ty += 4
  doc.setDrawColor(220)
  doc.setLineWidth(0.2)
  doc.line(M, ty, W - M, ty)
  ty += 4
  doc.setTextColor(120)
  doc.text(`${STORE_NAME} · ${WHATSAPP_DISPLAY} · ${STORE_EMAIL}`, M, ty)

  const stamp = now.toISOString().slice(0, 10)
  doc.save(`cotizacion-nitro-garage-${stamp}.pdf`)
}
