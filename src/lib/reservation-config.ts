import { rule } from './reservation-engine'
import type { RestaurantBookingConfig, Weekday } from './reservation-types'

const MON_THU: Weekday[] = [1, 2, 3, 4]
const FRI_SAT: Weekday[] = [5, 6]

/** India Gate — Tres Hermanos Boadilla (portable profile). */
export const indiaGateBookingConfig: RestaurantBookingConfig = {
  id: 'india-gate-boadilla',
  name: 'India Gate',
  tagline: 'Tres Hermanos Boadilla · mesa india',
  timezone: 'Europe/Madrid',
  locale: 'es-ES',
  whatsapp: '34600000000',
  phoneDisplay: '+34 600 000 000',
  address: 'Boadilla del Monte, Madrid',
  scheduleOpen: [
    rule(MON_THU, 13, 0, 16, 0),
    rule(MON_THU, 20, 0, 23, 30),
    rule(FRI_SAT, 13, 0, 16, 30),
    rule(FRI_SAT, 20, 0, 24, 0),
    rule([0], 13, 0, 16, 30),
    rule([0], 20, 0, 23, 0),
  ],
  scheduleClosed: [],
  timeInterval: 30,
  diningBlockMinutes: 120,
  earlyBookingsDays: 60,
  lateBookingsMinutes: 60,
  partySizeMin: 1,
  partySizeMax: 12,
  maxReservations: 8,
  maxSeats: 40,
  autoConfirmMaxPartySize: 3,
  requirePhone: true,
  requireMessage: false,
  askAllergies: true,
  detectAllergiesFromNotes: true,
  syncAllergiesToCarta: true,
  successPendingMessage:
    'Tu solicitud está pendiente de confirmación. Te avisaremos en breve.',
  successConfirmedMessage: '¡Mesa reservada! Te esperamos en India Gate.',
}

/** Generic restaurant starter — clone & tweak per brand. */
export function createRestaurantConfig(
  partial: Partial<RestaurantBookingConfig> &
    Pick<RestaurantBookingConfig, 'id' | 'name'>,
): RestaurantBookingConfig {
  return {
    ...indiaGateBookingConfig,
    ...partial,
    scheduleOpen: partial.scheduleOpen ?? indiaGateBookingConfig.scheduleOpen,
    scheduleClosed: partial.scheduleClosed ?? [],
  }
}
