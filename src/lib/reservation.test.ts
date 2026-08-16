import { describe, expect, it } from 'vitest'
import {
  detectAllergensFromText,
  dishAllergenConflict,
  resolveGuestAllergens,
} from './carta-diet'
import {
  availableTimeSlots,
  isDateBookable,
  openingWindowsForDate,
  validateBooking,
} from './reservation-engine'
import { indiaGateBookingConfig } from './reservation-config'

describe('allergy detection', () => {
  it('detects dairy allergy from Spanish notes', () => {
    expect(detectAllergensFromText('alergia a los lacteos')).toContain('lactose')
    expect(detectAllergensFromText('intolerancia a la lactosa')).toContain('lactose')
  })

  it('detects gluten and nuts', () => {
    expect(detectAllergensFromText('soy celiaco y alergia a frutos secos')).toEqual(
      expect.arrayContaining(['gluten', 'nuts']),
    )
  })

  it('merges saved allergens with note text', () => {
    const result = resolveGuestAllergens(['egg'], 'alergia a gluten')
    expect(result).toEqual(expect.arrayContaining(['egg', 'gluten']))
  })

  it('flags dish conflicts for guest allergens', () => {
    expect(dishAllergenConflict(['lactose', 'gluten'], ['lactose'])).toEqual(['lactose'])
    expect(dishAllergenConflict(['nuts'], ['lactose'])).toEqual([])
  })
})

describe('reservation engine', () => {
  it('returns opening windows for a weekday', () => {
    const windows = openingWindowsForDate(indiaGateBookingConfig, '2026-08-17')
    expect(windows.length).toBeGreaterThan(0)
    expect(windows[0].start).toBe(13 * 60)
  })

  it('rejects past dates', () => {
    expect(isDateBookable(indiaGateBookingConfig, '2020-01-01')).toBe(false)
  })

  it('returns time slots for a bookable lunch day', () => {
    const slots = availableTimeSlots(
      indiaGateBookingConfig,
      '2026-08-17',
      2,
      [],
      new Date('2026-08-01T10:00:00'),
    )
    expect(slots).toContain('13:00')
    expect(slots.length).toBeGreaterThan(3)
  })

  it('validates a complete booking draft', () => {
    const result = validateBooking(
      indiaGateBookingConfig,
      {
        date: '2026-08-17',
        time: '13:00',
        party: 2,
        name: 'Jorge',
        email: 'jorge@example.com',
        phone: '600000000',
        message: 'alergia a lacteos',
        allergens: ['lactose'],
      },
      [],
      new Date('2026-08-01T10:00:00'),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.status).toBe('confirmed')
  })

  it('requires phone when configured', () => {
    const result = validateBooking(
      indiaGateBookingConfig,
      {
        date: '2026-08-17',
        time: '13:00',
        party: 2,
        name: 'Jorge',
        email: 'jorge@example.com',
        phone: '',
        message: '',
        allergens: [],
      },
      [],
      new Date('2026-08-01T10:00:00'),
    )
    expect(result.ok).toBe(false)
  })
})

describe('ESC/POS ticket', () => {
  it('builds non-empty thermal bytes with allergy block', async () => {
    const { buildReservationEscPos } = await import('./escpos-ticket')
    const { defaultPosPrinterConfig } = await import('./pos-printer-types')
    const bytes = buildReservationEscPos({
      restaurantName: 'India Gate',
      locale: 'es-ES',
      printer: defaultPosPrinterConfig(),
      reservation: {
        id: 'rsv_1',
        restaurantId: 'india-gate-boadilla',
        name: 'Jorge',
        email: 'a@b.com',
        phone: '600',
        party: 2,
        datetime: '2026-08-19T13:30',
        message: 'alergia a lacteos',
        allergens: ['lactose'],
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        cancellationCode: 'ABC123',
      },
    })
    expect(bytes.byteLength).toBeGreaterThan(80)
    const asText = new TextDecoder().decode(bytes)
    expect(asText).toContain('JORGE')
    expect(asText).toContain('ALERGIAS')
  })
})
