import { ALLERGEN_LABELS } from './carta-diet'
import { formatDisplayDate } from './reservation-engine'
import type { Reservation, RestaurantBookingConfig } from './reservation-types'
import type { PosPaperWidth, PosPrinterConfig } from './pos-printer-types'

const ESC = 0x1b
const GS = 0x1d

function encoder() {
  return new TextEncoder()
}

function concat(chunks: Uint8Array[]) {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function text(line: string) {
  return encoder().encode(`${line}\n`)
}

function cmd(...bytes: number[]) {
  return new Uint8Array(bytes)
}

function center(on: boolean) {
  return cmd(ESC, 0x61, on ? 1 : 0)
}

function bold(on: boolean) {
  return cmd(ESC, 0x45, on ? 1 : 0)
}

function doubleSize(on: boolean) {
  return cmd(GS, 0x21, on ? 0x11 : 0x00)
}

function cut() {
  return cmd(GS, 0x56, 0x00)
}

function feed(n = 3) {
  return cmd(ESC, 0x64, n)
}

function drawerPulse() {
  return cmd(ESC, 0x70, 0x00, 0x19, 0x19)
}

function line(width: PosPaperWidth, char = '-') {
  const cols = width === 58 ? 32 : 48
  return text(char.repeat(cols))
}

function wrap(value: string, width: PosPaperWidth) {
  const cols = width === 58 ? 32 : 48
  const words = value.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > cols) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

export type TicketPayload = {
  reservation: Reservation
  restaurantName: string
  locale: string
  printer: PosPrinterConfig
}

/** Build ESC/POS bytes for a reservation ticket. */
export function buildReservationEscPos(payload: TicketPayload): Uint8Array {
  const { reservation: r, restaurantName, locale, printer } = payload
  const [date, time] = r.datetime.split('T')
  const chunks: Uint8Array[] = [
    cmd(ESC, 0x40), // init
    center(true),
    bold(true),
    doubleSize(true),
    text(printer.restaurantHeader || restaurantName),
    doubleSize(false),
    bold(false),
    text('RESERVA CONFIRMADA'),
    line(printer.paperWidth, '='),
    center(false),
    bold(true),
    text(r.name.toUpperCase()),
    bold(false),
    text(`Fecha: ${formatDisplayDate(date, locale)}`),
    text(`Hora:  ${time}`),
    text(`Pax:   ${r.party}`),
  ]

  if (r.phone) chunks.push(text(`Tel:   ${r.phone}`))
  if (r.email) {
    for (const part of wrap(`Email: ${r.email}`, printer.paperWidth)) chunks.push(text(part))
  }

  chunks.push(line(printer.paperWidth))
  chunks.push(text(`Estado: ${r.status.toUpperCase()}`))
  chunks.push(text(`Codigo: ${r.cancellationCode}`))
  chunks.push(text(`ID: ${r.id}`))

  const allergens = r.allergens ?? []
  if (allergens.length) {
    chunks.push(line(printer.paperWidth))
    chunks.push(bold(true))
    chunks.push(text('*** ALERGIAS ***'))
    chunks.push(bold(false))
    for (const part of wrap(
      allergens.map((a) => ALLERGEN_LABELS[a] ?? a).join(', '),
      printer.paperWidth,
    )) {
      chunks.push(text(part))
    }
  }

  if (r.message?.trim()) {
    chunks.push(line(printer.paperWidth))
    chunks.push(text('Nota:'))
    for (const part of wrap(r.message.trim(), printer.paperWidth)) chunks.push(text(part))
  }

  chunks.push(line(printer.paperWidth, '='))
  chunks.push(center(true))
  chunks.push(text(printer.footer || 'Gracias'))
  chunks.push(text(new Date().toLocaleString(locale)))
  chunks.push(feed(printer.paperWidth === 58 ? 3 : 4))
  if (printer.openCashDrawer) chunks.push(drawerPulse())
  if (printer.cutPaper) chunks.push(cut())

  return concat(chunks)
}

/** Human ticket for browser print dialog (Windows/macOS thermal drivers). */
export function buildReservationTicketHtml(payload: TicketPayload): string {
  const { reservation: r, restaurantName, locale, printer } = payload
  const [date, time] = r.datetime.split('T')
  const width = printer.paperWidth === 58 ? '58mm' : '80mm'
  const allergens = (r.allergens ?? []).map((a) => ALLERGEN_LABELS[a] ?? a).join(', ')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Tique reserva</title>
  <style>
    @page { size: ${width} auto; margin: 0; }
    body {
      margin: 0;
      padding: 8px;
      width: ${width};
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
    }
    h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
    h2 { font-size: 13px; margin: 0 0 8px; text-align: center; letter-spacing: 0.08em; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .alert { font-weight: 700; text-transform: uppercase; }
    .center { text-align: center; }
    .muted { font-size: 10px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(printer.restaurantHeader || restaurantName)}</h1>
  <h2>RESERVA CONFIRMADA</h2>
  <div class="line"></div>
  <strong>${escapeHtml(r.name)}</strong>
  <div class="row"><span>Fecha</span><span>${escapeHtml(formatDisplayDate(date, locale))}</span></div>
  <div class="row"><span>Hora</span><span>${escapeHtml(time)}</span></div>
  <div class="row"><span>Pax</span><span>${r.party}</span></div>
  ${r.phone ? `<div class="row"><span>Tel</span><span>${escapeHtml(r.phone)}</span></div>` : ''}
  ${r.email ? `<div class="row"><span>Email</span><span>${escapeHtml(r.email)}</span></div>` : ''}
  <div class="line"></div>
  <div class="row"><span>Estado</span><span>${escapeHtml(r.status)}</span></div>
  <div class="row"><span>Codigo</span><span>${escapeHtml(r.cancellationCode)}</span></div>
  ${
    allergens
      ? `<div class="line"></div><div class="alert">Alergias</div><div>${escapeHtml(allergens)}</div>`
      : ''
  }
  ${
    r.message?.trim()
      ? `<div class="line"></div><div>Nota</div><div>${escapeHtml(r.message.trim())}</div>`
      : ''
  }
  <div class="line"></div>
  <div class="center">${escapeHtml(printer.footer)}</div>
  <div class="center muted">${escapeHtml(new Date().toLocaleString(locale))}</div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 400); };</script>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function ticketPayloadFrom(
  reservation: Reservation,
  config: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): TicketPayload {
  return {
    reservation,
    restaurantName: config.name,
    locale: config.locale,
    printer,
  }
}
