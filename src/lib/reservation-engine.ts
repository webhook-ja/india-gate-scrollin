import type {
  BookingDraft,
  ClosedException,
  OpenWindow,
  Reservation,
  RestaurantBookingConfig,
  ScheduleRule,
  SlotOccupancy,
  Weekday,
} from './reservation-types'
import { ALLERGEN_LABELS } from './carta-diet'

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatDateISO(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseLocalDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayOf(isoDate: string): Weekday {
  return parseLocalDate(isoDate).getDay() as Weekday
}

function matchException(exceptions: ClosedException[], isoDate: string) {
  return exceptions.find((ex) => ex.date === isoDate)
}

export function openingWindowsForDate(
  config: RestaurantBookingConfig,
  isoDate: string,
): OpenWindow[] {
  const exception = matchException(config.scheduleClosed, isoDate)
  if (exception) {
    if (exception.start == null || exception.end == null) return []
    return [{ start: exception.start, end: exception.end }]
  }

  const day = weekdayOf(isoDate)
  const windows: OpenWindow[] = []
  for (const rule of config.scheduleOpen) {
    if (!rule.weekdays.includes(day)) continue
    windows.push({
      start: rule.start ?? 0,
      end: rule.end ?? 24 * 60,
    })
  }
  return windows.sort((a, b) => a.start - b.start)
}

export function isDateBookable(config: RestaurantBookingConfig, isoDate: string, now = new Date()) {
  const today = formatDateISO(now)
  if (isoDate < today) return false

  if (config.earlyBookingsDays != null) {
    const max = new Date(now)
    max.setHours(0, 0, 0, 0)
    max.setDate(max.getDate() + config.earlyBookingsDays)
    if (isoDate > formatDateISO(max)) return false
  }

  return openingWindowsForDate(config, isoDate).length > 0
}

function earliestAllowedMinutes(
  config: RestaurantBookingConfig,
  isoDate: string,
  windowStart: number,
  now = new Date(),
) {
  let start = windowStart
  const today = formatDateISO(now)
  if (isoDate === today) {
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const late = config.lateBookingsMinutes ?? 0
    const floor = nowMins + late
    const snapped = Math.ceil(floor / config.timeInterval) * config.timeInterval
    start = Math.max(start, snapped)
  }
  return start
}

function expandOccupancy(
  reservations: Reservation[],
  isoDate: string,
  interval: number,
  diningBlock: number,
) {
  const map = new Map<number, SlotOccupancy>()
  const bump = (mins: number, party: number) => {
    const prev = map.get(mins) ?? { bookings: 0, guests: 0 }
    map.set(mins, {
      bookings: prev.bookings + 1,
      guests: prev.guests + party,
    })
  }

  for (const booking of reservations) {
    if (!booking.datetime.startsWith(isoDate)) continue
    if (
      booking.status !== 'pending' &&
      booking.status !== 'confirmed' &&
      booking.status !== 'arrived'
    ) {
      continue
    }
    const start = timeToMinutes(booking.datetime.slice(11, 16))
    for (let t = start; t < start + diningBlock; t += interval) {
      bump(t, booking.party)
    }
  }
  return map
}

function slotBlocked(
  config: RestaurantBookingConfig,
  occupancy: SlotOccupancy | undefined,
  party: number,
) {
  if (!occupancy) return false
  if (config.maxReservations != null && occupancy.bookings >= config.maxReservations) return true
  if (config.maxSeats != null && occupancy.guests + party > config.maxSeats) return true
  return false
}

/** Available HH:mm slots for a date + party size. */
export function availableTimeSlots(
  config: RestaurantBookingConfig,
  isoDate: string,
  party: number,
  reservations: Reservation[],
  now = new Date(),
): string[] {
  if (!isDateBookable(config, isoDate, now)) return []
  if (party < config.partySizeMin || party > config.partySizeMax) return []

  const windows = openingWindowsForDate(config, isoDate)
  const occupancy = expandOccupancy(
    reservations,
    isoDate,
    config.timeInterval,
    config.diningBlockMinutes,
  )
  const slots: string[] = []

  for (const window of windows) {
    const from = earliestAllowedMinutes(config, isoDate, window.start, now)
    for (let t = from; t + config.timeInterval <= window.end; t += config.timeInterval) {
      // Also ensure dining block end fits roughly in service (soft)
      if (t + Math.min(config.diningBlockMinutes, config.timeInterval) > window.end + 60) {
        // allow last slots near close
      }
      let blocked = false
      for (
        let cover = t;
        cover < t + config.diningBlockMinutes;
        cover += config.timeInterval
      ) {
        if (slotBlocked(config, occupancy.get(cover), party)) {
          blocked = true
          break
        }
      }
      if (!blocked) slots.push(minutesToTime(t))
    }
  }

  return slots
}

export function bookableDates(
  config: RestaurantBookingConfig,
  daysAhead = 60,
  now = new Date(),
): string[] {
  const out: string[] = []
  const horizon = config.earlyBookingsDays ?? daysAhead
  for (let i = 0; i <= horizon; i++) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    const iso = formatDateISO(d)
    if (isDateBookable(config, iso, now)) out.push(iso)
  }
  return out
}

export type ValidationResult =
  | { ok: true; status: 'pending' | 'confirmed' }
  | { ok: false; error: string }

export function validateBooking(
  config: RestaurantBookingConfig,
  draft: BookingDraft,
  reservations: Reservation[],
  now = new Date(),
): ValidationResult {
  const name = draft.name.trim()
  const email = draft.email.trim()
  const phone = draft.phone.trim()
  const message = draft.message.trim()

  if (!draft.date || !draft.time) return { ok: false, error: 'Elige fecha y hora.' }
  if (!name) return { ok: false, error: 'Indica tu nombre.' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Email no válido.' }
  }
  if (config.requirePhone && !phone) return { ok: false, error: 'El teléfono es obligatorio.' }
  if (config.requireMessage && !message) return { ok: false, error: 'Añade un mensaje.' }
  if (draft.party < config.partySizeMin || draft.party > config.partySizeMax) {
    return {
      ok: false,
      error: `Comensales entre ${config.partySizeMin} y ${config.partySizeMax}.`,
    }
  }

  const slots = availableTimeSlots(config, draft.date, draft.party, reservations, now)
  if (!slots.includes(draft.time)) {
    return { ok: false, error: 'Ese horario ya no está disponible.' }
  }

  const datetime = `${draft.date}T${draft.time}`
  const duplicate = reservations.some(
    (r) =>
      r.datetime === datetime &&
      r.email.toLowerCase() === email.toLowerCase() &&
      r.party === draft.party &&
      (r.status === 'pending' || r.status === 'confirmed'),
  )
  if (duplicate) return { ok: false, error: 'Ya tienes una reserva similar en ese horario.' }

  const status =
    draft.party < config.autoConfirmMaxPartySize ? 'confirmed' : 'pending'

  return { ok: true, status }
}

export function uid(prefix = 'rsv') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function cancellationCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function formatDisplayDate(isoDate: string, locale = 'es-ES') {
  return parseLocalDate(isoDate).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function buildWhatsAppUrl(
  config: RestaurantBookingConfig,
  reservation: Pick<
    Reservation,
    'name' | 'party' | 'datetime' | 'phone' | 'message' | 'status' | 'allergens'
  >,
) {
  if (!config.whatsapp) return null
  const [date, time] = reservation.datetime.split('T')
  const allergyLine =
    reservation.allergens?.length > 0
      ? `· Alergias: ${reservation.allergens
          .map((a) => ALLERGEN_LABELS[a] ?? a)
          .join(', ')}`
      : null
  const text = [
    `Hola ${config.name}, quiero confirmar mi reserva:`,
    `· Nombre: ${reservation.name}`,
    `· Fecha: ${formatDisplayDate(date, config.locale)}`,
    `· Hora: ${time}`,
    `· Comensales: ${reservation.party}`,
    reservation.phone ? `· Tel: ${reservation.phone}` : null,
    allergyLine,
    reservation.message ? `· Nota: ${reservation.message}` : null,
    `· Estado: ${reservation.status}`,
  ]
    .filter(Boolean)
    .join('\n')
  return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(text)}`
}

/** Helper for schedule rules */
export function rule(
  weekdays: Weekday[],
  startH: number,
  startM: number,
  endH: number,
  endM: number,
): ScheduleRule {
  return {
    weekdays,
    start: startH * 60 + startM,
    end: endH * 60 + endM,
  }
}
