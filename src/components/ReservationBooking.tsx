import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  availableTimeSlots,
  bookableDates,
  formatDisplayDate,
} from '../lib/reservation-engine'
import { useReservations } from '../lib/reservation-store'
import type { BookingDraft, Reservation } from '../lib/reservation-types'
import {
  ALLERGEN_LABELS,
  detectAllergensFromText,
  mergeAllergens,
  type Allergen,
} from '../lib/carta-diet'

type Step = 'party' | 'date' | 'time' | 'details' | 'done'

const STEPS: Step[] = ['party', 'date', 'time', 'details']

type Props = {
  open: boolean
  onClose: () => void
}

const emptyDraft = (): BookingDraft => ({
  date: '',
  time: '',
  party: 2,
  name: '',
  email: '',
  phone: '',
  message: '',
  allergens: [],
})

const ALLERGEN_OPTIONS = Object.keys(ALLERGEN_LABELS) as Allergen[]

export function ReservationBooking({ open, onClose }: Props) {
  const { config, reservations, createReservation } = useReservations()
  const [step, setStep] = useState<Step>('party')
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Reservation | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  const detectedFromNotes = useMemo(
    () =>
      config.detectAllergiesFromNotes ? detectAllergensFromText(draft.message) : [],
    [config.detectAllergiesFromNotes, draft.message],
  )

  const effectiveAllergens = useMemo(
    () => mergeAllergens(draft.allergens, detectedFromNotes),
    [draft.allergens, detectedFromNotes],
  )

  useEffect(() => {
    if (!open) return
    setStep('party')
    setDraft(emptyDraft())
    setError('')
    setCreated(null)
    setWhatsappUrl(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const dates = useMemo(() => bookableDates(config), [config])
  const times = useMemo(
    () =>
      draft.date
        ? availableTimeSlots(config, draft.date, draft.party, reservations)
        : [],
    [config, draft.date, draft.party, reservations],
  )

  const stepIndex = STEPS.indexOf(step === 'done' ? 'details' : step)

  const goNext = () => {
    setError('')
    if (step === 'party') {
      setStep('date')
      return
    }
    if (step === 'date') {
      if (!draft.date) {
        setError('Elige un día.')
        return
      }
      setStep('time')
      return
    }
    if (step === 'time') {
      if (!draft.time) {
        setError('Elige una hora.')
        return
      }
      setStep('details')
    }
  }

  const goBack = () => {
    setError('')
    if (step === 'date') setStep('party')
    else if (step === 'time') setStep('date')
    else if (step === 'details') setStep('time')
  }

  const submit = () => {
    setBusy(true)
    setError('')
    const result = createReservation({ ...draft, allergens: effectiveAllergens })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCreated(result.reservation)
    setWhatsappUrl(result.whatsappUrl)
    setStep('done')
  }

  if (!open) return null

  return (
    <div className="rsv-overlay" role="presentation" onClick={onClose}>
      <div
        className="rsv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsv-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rsv-modal__glow" aria-hidden="true" />
        <button type="button" className="rsv-modal__close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <header className="rsv-modal__head">
          <p className="rsv-modal__eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Reserva de mesa
          </p>
          <h2 id="rsv-title">{config.name}</h2>
          {config.tagline ? <p className="rsv-modal__tagline">{config.tagline}</p> : null}
        </header>

        {step !== 'done' ? (
          <ol className="rsv-steps" aria-label="Pasos de la reserva">
            {STEPS.map((id, index) => (
              <li
                key={id}
                className={
                  index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''
                }
              >
                <span>{index + 1}</span>
                {id === 'party' ? 'Comensales' : null}
                {id === 'date' ? 'Día' : null}
                {id === 'time' ? 'Hora' : null}
                {id === 'details' ? 'Datos' : null}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="rsv-body">
          {step === 'party' ? (
            <section className="rsv-panel" aria-label="Comensales">
              <div className="rsv-panel__icon">
                <Users size={22} />
              </div>
              <h3>¿Cuántos sois?</h3>
              <p>Elegimos mesa y horarios según el tamaño del grupo.</p>
              <div className="rsv-party">
                {Array.from(
                  { length: config.partySizeMax - config.partySizeMin + 1 },
                  (_, i) => config.partySizeMin + i,
                ).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={draft.party === n ? 'is-active' : ''}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        party: n,
                        time: '',
                      }))
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 'date' ? (
            <section className="rsv-panel" aria-label="Fecha">
              <div className="rsv-panel__icon">
                <CalendarDays size={22} />
              </div>
              <h3>Elige el día</h3>
              <p>Solo mostramos días con servicio abierto.</p>
              <div className="rsv-dates">
                {dates.slice(0, 28).map((iso) => {
                  const d = new Date(`${iso}T12:00:00`)
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={draft.date === iso ? 'is-active' : ''}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          date: iso,
                          time: '',
                        }))
                      }
                    >
                      <em>{d.toLocaleDateString(config.locale, { weekday: 'short' })}</em>
                      <strong>{d.getDate()}</strong>
                      <span>{d.toLocaleDateString(config.locale, { month: 'short' })}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {step === 'time' ? (
            <section className="rsv-panel" aria-label="Hora">
              <div className="rsv-panel__icon">
                <Clock3 size={22} />
              </div>
              <h3>Horario disponible</h3>
              <p>
                {draft.date
                  ? formatDisplayDate(draft.date, config.locale)
                  : 'Selecciona un día primero'}
                {` · ${draft.party} ${draft.party === 1 ? 'persona' : 'personas'}`}
              </p>
              {times.length === 0 ? (
                <div className="rsv-empty">No quedan huecos ese día. Prueba otra fecha.</div>
              ) : (
                <div className="rsv-times">
                  {times.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={draft.time === time ? 'is-active' : ''}
                      onClick={() => setDraft((current) => ({ ...current, time }))}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {step === 'details' ? (
            <section className="rsv-panel" aria-label="Tus datos">
              <div className="rsv-summary">
                <span>
                  {draft.party} {draft.party === 1 ? 'persona' : 'personas'}
                </span>
                <span>{draft.date ? formatDisplayDate(draft.date, config.locale) : '—'}</span>
                <span>{draft.time || '—'}</span>
              </div>
              <h3>Tus datos</h3>
              <div className="rsv-fields">
                <label>
                  Nombre
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Teléfono{config.requirePhone ? '' : ' (opcional)'}
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    autoComplete="tel"
                    required={config.requirePhone}
                  />
                </label>
                <label>
                  Mensaje / notas
                  <textarea
                    value={draft.message}
                    onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                    rows={3}
                    placeholder="Ej: alergia a frutos secos, cumpleaños…"
                  />
                </label>
                {config.askAllergies ? (
                  <div className="rsv-allergy-block">
                    <span className="rsv-allergy-label">Alergias / intolerancias</span>
                    <div className="rsv-allergy-chips" role="group" aria-label="Alergias">
                      {ALLERGEN_OPTIONS.map((id) => {
                        const active = draft.allergens.includes(id)
                        const auto = detectedFromNotes.includes(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`rsv-allergy-chip${active || auto ? ' is-active' : ''}${
                              auto && !active ? ' is-detected' : ''
                            }`}
                            aria-pressed={active || auto}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                allergens: active
                                  ? d.allergens.filter((a) => a !== id)
                                  : [...d.allergens, id],
                              }))
                            }
                          >
                            {ALLERGEN_LABELS[id]}
                            {auto && !active ? ' · nota' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {detectedFromNotes.length > 0 ? (
                      <p className="rsv-allergy-hint">
                        Detectado en tu nota:{' '}
                        {detectedFromNotes.map((a) => ALLERGEN_LABELS[a]).join(', ')}. La carta
                        marcará platos seguros y de riesgo.
                      </p>
                    ) : (
                      <p className="rsv-allergy-hint">
                        Si lo escribes en la nota (ej. «alergia a gluten»), lo detectamos solos.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 'done' && created ? (
            <section className="rsv-panel rsv-panel--success" aria-live="polite">
              <div className="rsv-success-burst" aria-hidden="true">
                <Check size={28} />
              </div>
              <h3>
                {created.status === 'confirmed' ? 'Reserva confirmada' : 'Solicitud enviada'}
              </h3>
              <p>
                {created.status === 'confirmed'
                  ? config.successConfirmedMessage
                  : config.successPendingMessage}
              </p>
              <ul className="rsv-receipt">
                <li>
                  <span>Nombre</span>
                  <strong>{created.name}</strong>
                </li>
                <li>
                  <span>Cuándo</span>
                  <strong>
                    {formatDisplayDate(created.datetime.slice(0, 10), config.locale)} ·{' '}
                    {created.datetime.slice(11, 16)}
                  </strong>
                </li>
                <li>
                  <span>Comensales</span>
                  <strong>{created.party}</strong>
                </li>
                <li>
                  <span>Código</span>
                  <strong>{created.cancellationCode}</strong>
                </li>
                {created.allergens.length > 0 ? (
                  <li>
                    <span>Alergias</span>
                    <strong>
                      {created.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
                    </strong>
                  </li>
                ) : null}
              </ul>
              {created.allergens.length > 0 && config.syncAllergiesToCarta ? (
                <p className="rsv-allergy-hint rsv-allergy-hint--ok">
                  En la carta, los platos seguros brillan y los de riesgo salen en rojo.
                </p>
              ) : null}
              {whatsappUrl ? (
                <a className="rsv-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} />
                  Confirmar por WhatsApp
                </a>
              ) : null}
              <button type="button" className="rsv-primary" onClick={onClose}>
                Listo
              </button>
            </section>
          ) : null}

          {error ? <p className="rsv-error">{error}</p> : null}
        </div>

        {step !== 'done' ? (
          <footer className="rsv-footer">
            {step !== 'party' ? (
              <button type="button" className="rsv-ghost" onClick={goBack}>
                <ChevronLeft size={16} />
                Atrás
              </button>
            ) : (
              <span />
            )}
            {step === 'details' ? (
              <button type="button" className="rsv-primary" disabled={busy} onClick={submit}>
                Reservar mesa
                <Sparkles size={16} />
              </button>
            ) : (
              <button type="button" className="rsv-primary" onClick={goNext}>
                Continuar
                <ChevronRight size={16} />
              </button>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
