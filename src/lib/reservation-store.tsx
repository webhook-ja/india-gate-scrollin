import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  detectAllergensFromText,
  mergeAllergens,
  resolveGuestAllergens,
  type Allergen,
} from './carta-diet'
import { indiaGateBookingConfig } from './reservation-config'
import {
  buildWhatsAppUrl,
  cancellationCode,
  uid,
  validateBooking,
} from './reservation-engine'
import { printReservationTicket } from './pos-printer'
import { defaultPosPrinterConfig, type PosPrinterConfig } from './pos-printer-types'
import type {
  BookingDraft,
  Reservation,
  ReservationStatus,
  RestaurantBookingConfig,
} from './reservation-types'

const STORAGE_KEY = 'india-gate-reservations:v1'
const ALLERGY_SESSION_KEY = 'india-gate-guest-allergens:v1'

type ReservationStore = {
  config: RestaurantBookingConfig
  printer: PosPrinterConfig
  reservations: Reservation[]
  ready: boolean
  guestAllergens: Allergen[]
  lastPrintMessage: string
  createReservation: (
    draft: BookingDraft,
  ) => { ok: true; reservation: Reservation; whatsappUrl: string | null } | { ok: false; error: string }
  updateStatus: (id: string, status: ReservationStatus) => Promise<void>
  updateReservationAllergens: (id: string, allergens: Allergen[]) => void
  cancelReservation: (id: string, code?: string) => { ok: boolean; error?: string }
  setConfig: (patch: Partial<RestaurantBookingConfig>) => void
  setPrinter: (patch: Partial<PosPrinterConfig>) => void
  setGuestAllergens: (allergens: Allergen[]) => void
  activateReservationAllergies: (id: string) => void
  clearGuestAllergens: () => void
  printTicket: (id: string) => Promise<{ ok: boolean; error?: string }>
}

const Ctx = createContext<ReservationStore | null>(null)

function loadReservations(): Reservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { reservations?: Reservation[] }
    if (!Array.isArray(parsed.reservations)) return []
    return parsed.reservations.map((r) => ({
      ...r,
      allergens: resolveGuestAllergens(r.allergens, r.message, r.notes),
    }))
  } catch {
    return []
  }
}

function loadConfig(): RestaurantBookingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return indiaGateBookingConfig
    const parsed = JSON.parse(raw) as { config?: RestaurantBookingConfig }
    return parsed.config
      ? { ...indiaGateBookingConfig, ...parsed.config }
      : indiaGateBookingConfig
  } catch {
    return indiaGateBookingConfig
  }
}

function loadPrinter(): PosPrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPosPrinterConfig()
    const parsed = JSON.parse(raw) as { printer?: PosPrinterConfig }
    return parsed.printer
      ? { ...defaultPosPrinterConfig(), ...parsed.printer }
      : defaultPosPrinterConfig()
  } catch {
    return defaultPosPrinterConfig()
  }
}

function loadGuestAllergens(): Allergen[] {
  try {
    const raw = localStorage.getItem(ALLERGY_SESSION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Allergen[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function resolveDraftAllergens(
  config: RestaurantBookingConfig,
  draft: BookingDraft,
): Allergen[] {
  const selected = draft.allergens ?? []
  const fromNotes =
    config.detectAllergiesFromNotes ? detectAllergensFromText(draft.message) : []
  return mergeAllergens(selected, fromNotes)
}

export function ReservationStoreProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [config, setConfigState] = useState<RestaurantBookingConfig>(indiaGateBookingConfig)
  const [printer, setPrinterState] = useState<PosPrinterConfig>(defaultPosPrinterConfig)
  const [guestAllergens, setGuestAllergensState] = useState<Allergen[]>([])
  const [lastPrintMessage, setLastPrintMessage] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReservations(loadReservations())
    setConfigState(loadConfig())
    setPrinterState(loadPrinter())
    setGuestAllergensState(loadGuestAllergens())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ reservations, config, printer }),
      )
    } catch {
      /* ignore */
    }
  }, [reservations, config, printer, ready])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(ALLERGY_SESSION_KEY, JSON.stringify(guestAllergens))
    } catch {
      /* ignore */
    }
  }, [guestAllergens, ready])

  const setGuestAllergens = useCallback((allergens: Allergen[]) => {
    setGuestAllergensState(mergeAllergens(allergens))
  }, [])

  const clearGuestAllergens = useCallback(() => {
    setGuestAllergensState([])
  }, [])

  const createReservation = useCallback(
    (draft: BookingDraft) => {
      const allergens = resolveDraftAllergens(config, draft)
      const result = validateBooking(config, { ...draft, allergens }, reservations)
      if (!result.ok) return result

      const reservation: Reservation = {
        id: uid('rsv'),
        restaurantId: config.id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        party: draft.party,
        datetime: `${draft.date}T${draft.time}`,
        message: draft.message.trim(),
        allergens,
        status: result.status,
        createdAt: new Date().toISOString(),
        cancellationCode: cancellationCode(),
      }

      setReservations((current) => [reservation, ...current])
      if (config.syncAllergiesToCarta && allergens.length > 0) {
        setGuestAllergensState(allergens)
      }

      if (printer.enabled && printer.autoPrintOnConfirm && result.status === 'confirmed') {
        void printReservationTicket(reservation, config, printer).then((print) => {
          setLastPrintMessage(
            print.ok ? `Tique impreso (${print.method}).` : `Impresión: ${print.error}`,
          )
        })
      }

      return {
        ok: true as const,
        reservation,
        whatsappUrl: buildWhatsAppUrl(config, reservation),
      }
    },
    [config, reservations, printer],
  )

  const printTicket = useCallback(
    async (id: string) => {
      const found = reservations.find((r) => r.id === id)
      if (!found) return { ok: false, error: 'Reserva no encontrada.' }
      const result = await printReservationTicket(found, config, { ...printer, enabled: true })
      setLastPrintMessage(
        result.ok ? `Tique impreso (${result.method}).` : `Impresión: ${result.error}`,
      )
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    [reservations, config, printer],
  )

  const updateStatus = useCallback(
    async (id: string, status: ReservationStatus) => {
      const previous = reservations.find((r) => r.id === id)
      if (!previous) return
      const next = { ...previous, status }
      setReservations((current) => current.map((item) => (item.id === id ? next : item)))

      if (!printer.enabled) return
      const shouldPrint =
        (status === 'confirmed' && printer.autoPrintOnConfirm) ||
        (status === 'arrived' && printer.autoPrintOnArrive)
      if (!shouldPrint) return

      const result = await printReservationTicket(next, config, printer)
      setLastPrintMessage(
        result.ok ? `Tique impreso (${result.method}).` : `Impresión: ${result.error}`,
      )
    },
    [reservations, printer, config],
  )

  const updateReservationAllergens = useCallback((id: string, allergens: Allergen[]) => {
    setReservations((current) =>
      current.map((item) =>
        item.id === id ? { ...item, allergens: mergeAllergens(allergens) } : item,
      ),
    )
  }, [])

  const activateReservationAllergies = useCallback(
    (id: string) => {
      const found = reservations.find((r) => r.id === id)
      if (!found) return
      const allergens = resolveGuestAllergens(found.allergens, found.message, found.notes)
      setGuestAllergensState(allergens)
      if (allergens.length && (!found.allergens || found.allergens.length === 0)) {
        setReservations((current) =>
          current.map((item) => (item.id === id ? { ...item, allergens } : item)),
        )
      }
    },
    [reservations],
  )

  const cancelReservation = useCallback(
    (id: string, code?: string) => {
      const found = reservations.find((r) => r.id === id)
      if (!found) return { ok: false, error: 'Reserva no encontrada.' }
      if (code && found.cancellationCode !== code.toUpperCase()) {
        return { ok: false, error: 'Código de cancelación incorrecto.' }
      }
      void updateStatus(id, 'cancelled')
      return { ok: true }
    },
    [reservations, updateStatus],
  )

  const setConfig = useCallback((patch: Partial<RestaurantBookingConfig>) => {
    setConfigState((current) => ({ ...current, ...patch }))
  }, [])

  const setPrinter = useCallback((patch: Partial<PosPrinterConfig>) => {
    setPrinterState((current) => ({ ...current, ...patch }))
  }, [])

  const value = useMemo(
    () => ({
      config,
      printer,
      reservations,
      ready,
      guestAllergens,
      lastPrintMessage,
      createReservation,
      updateStatus,
      updateReservationAllergens,
      cancelReservation,
      setConfig,
      setPrinter,
      setGuestAllergens,
      activateReservationAllergies,
      clearGuestAllergens,
      printTicket,
    }),
    [
      config,
      printer,
      reservations,
      ready,
      guestAllergens,
      lastPrintMessage,
      createReservation,
      updateStatus,
      updateReservationAllergens,
      cancelReservation,
      setConfig,
      setPrinter,
      setGuestAllergens,
      activateReservationAllergies,
      clearGuestAllergens,
      printTicket,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useReservations() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useReservations must be used within ReservationStoreProvider')
  return ctx
}
