/** Portable restaurant reservation domain (inspired by Five Star RTB). */

import type { Allergen } from './carta-diet'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sun–Sat

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'arrived'
  | 'closed'

export type OpenWindow = {
  /** Minutes from midnight */
  start: number
  end: number
}

export type ScheduleRule = {
  weekdays: Weekday[]
  start?: number
  end?: number
}

export type ClosedException = {
  /** YYYY-MM-DD */
  date: string
  start?: number
  end?: number
}

export type RestaurantBookingConfig = {
  id: string
  name: string
  tagline?: string
  timezone: string
  locale: string
  whatsapp?: string
  phoneDisplay?: string
  address?: string
  scheduleOpen: ScheduleRule[]
  scheduleClosed: ClosedException[]
  timeInterval: number
  diningBlockMinutes: number
  earlyBookingsDays: number | null
  lateBookingsMinutes: number | null
  partySizeMin: number
  partySizeMax: number
  maxReservations?: number | null
  maxSeats?: number | null
  autoConfirmMaxPartySize: number
  requirePhone: boolean
  requireMessage: boolean
  askAllergies: boolean
  detectAllergiesFromNotes: boolean
  syncAllergiesToCarta: boolean
  successPendingMessage: string
  successConfirmedMessage: string
}

export type Reservation = {
  id: string
  restaurantId: string
  name: string
  email: string
  phone: string
  party: number
  /** ISO local datetime string YYYY-MM-DDTHH:mm */
  datetime: string
  message: string
  allergens: Allergen[]
  status: ReservationStatus
  createdAt: string
  cancellationCode: string
  notes?: string
}

export type BookingDraft = {
  date: string
  time: string
  party: number
  name: string
  email: string
  phone: string
  message: string
  allergens: Allergen[]
}

export type SlotOccupancy = {
  bookings: number
  guests: number
}
