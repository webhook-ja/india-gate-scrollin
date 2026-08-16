import {
  buildReservationEscPos,
  buildReservationTicketHtml,
  ticketPayloadFrom,
} from './escpos-ticket'
import type { PosPrintResult, PosPrinterConfig } from './pos-printer-types'
import type { Reservation, RestaurantBookingConfig } from './reservation-types'

function toBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

async function printViaBrowser(
  reservation: Reservation,
  restaurant: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): Promise<PosPrintResult> {
  const html = buildReservationTicketHtml(ticketPayloadFrom(reservation, restaurant, printer))
  const frame = window.open('', '_blank', 'noopener,noreferrer,width=420,height=640')
  if (!frame) {
    return { ok: false, error: 'El navegador bloqueó la ventana de impresión.' }
  }
  frame.document.open()
  frame.document.write(html)
  frame.document.close()
  return { ok: true, method: 'browser' }
}

async function printViaSerial(
  reservation: Reservation,
  restaurant: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): Promise<PosPrintResult> {
  const nav = navigator as Navigator & {
    serial?: {
      requestPort: () => Promise<SerialPortLike>
      getPorts?: () => Promise<SerialPortLike[]>
    }
  }
  if (!nav.serial) {
    return {
      ok: false,
      error: 'Este navegador no soporta Web Serial. Usa Chrome/Edge o modo Red/Bridge.',
    }
  }

  let port: SerialPortLike
  try {
    port = await nav.serial.requestPort()
    await port.open({ baudRate: 9600 })
  } catch {
    return { ok: false, error: 'No se pudo abrir el puerto USB/Serial de la impresora.' }
  }

  try {
    const bytes = buildReservationEscPos(ticketPayloadFrom(reservation, restaurant, printer))
    const writer = port.writable.getWriter()
    const copies = Math.max(1, printer.copies)
    for (let i = 0; i < copies; i++) {
      await writer.write(bytes)
    }
    writer.releaseLock()
    await port.close()
    return { ok: true, method: 'usb-serial' }
  } catch {
    try {
      await port.close()
    } catch {
      /* ignore */
    }
    return { ok: false, error: 'Error enviando datos ESC/POS por USB/Serial.' }
  }
}

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
  writable: { getWriter: () => { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void } }
}

async function printViaNetwork(
  reservation: Reservation,
  restaurant: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): Promise<PosPrintResult> {
  const bytes = buildReservationEscPos(ticketPayloadFrom(reservation, restaurant, printer))
  const copies = Math.max(1, printer.copies)
  const payload = {
    host: printer.host,
    port: printer.port,
    copies,
    dataBase64: toBase64(bytes),
  }

  try {
    const response = await fetch(printer.bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Bridge respondió ${response.status}. ${detail || '¿Está arrancado el bridge?'}`,
      }
    }
    return { ok: true, method: 'network' }
  } catch {
    return {
      ok: false,
      error:
        'No se pudo hablar con el bridge local. Arranca: pnpm pos:bridge (USB→red/LAN/WiFi por IP:9100).',
    }
  }
}

export async function printReservationTicket(
  reservation: Reservation,
  restaurant: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): Promise<PosPrintResult> {
  if (!printer.enabled) {
    return { ok: false, error: 'Impresora POS desactivada en configuración.' }
  }

  if (printer.mode === 'browser') return printViaBrowser(reservation, restaurant, printer)
  if (printer.mode === 'usb-serial') return printViaSerial(reservation, restaurant, printer)
  return printViaNetwork(reservation, restaurant, printer)
}

export async function testPosPrinter(
  restaurant: Pick<RestaurantBookingConfig, 'name' | 'locale'>,
  printer: PosPrinterConfig,
): Promise<PosPrintResult> {
  const sample: Reservation = {
    id: 'rsv_test',
    restaurantId: 'test',
    name: 'Cliente Prueba',
    email: 'test@india-gate.local',
    phone: '600000000',
    party: 2,
    datetime: `${new Date().toISOString().slice(0, 10)}T20:30`,
    message: 'Tique de prueba POS',
    allergens: ['lactose'],
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    cancellationCode: 'TEST01',
  }
  return printReservationTicket(sample, restaurant, { ...printer, enabled: true })
}
