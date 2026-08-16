import { useMemo } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Eye,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ALLERGEN_LABELS, resolveGuestAllergens, type Allergen } from '../lib/carta-diet'
import { useAnalytics } from '../lib/analytics-store'
import { useCartaStore } from '../lib/carta-store'
import { useReservations } from '../lib/reservation-store'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastNDays(n: number) {
  const out: string[] = []
  const now = startOfDay(new Date())
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(isoDay(d))
  }
  return out
}

export function AnalyticsPanel() {
  const { items, inventory } = useCartaStore()
  const { reservations } = useReservations()
  const { topOrdered, topViewed, dailyOrders, recordOrder, resetAnalytics, dishes } =
    useAnalytics()

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) map.set(item.id, item.name)
    return map
  }, [items])

  const reservationStats = useMemo(() => {
    const weekStart = startOfDay(new Date())
    weekStart.setDate(weekStart.getDate() - 6)
    const weekIso = isoDay(weekStart)
    const daysLocal = lastNDays(7)

    const active = reservations.filter(
      (r) => r.status === 'pending' || r.status === 'confirmed' || r.status === 'arrived',
    )
    const week = reservations.filter((r) => r.datetime.slice(0, 10) >= weekIso)
    const pending = reservations.filter((r) => r.status === 'pending').length
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length
    const pax = week.reduce((sum, r) => sum + r.party, 0)
    const avgParty = week.length ? pax / week.length : 0

    const allergyCount = new Map<Allergen, number>()
    let allergyReservations = 0
    for (const r of reservations) {
      const allergens = resolveGuestAllergens(r.allergens, r.message, r.notes)
      if (allergens.length === 0) continue
      allergyReservations += 1
      for (const a of allergens) allergyCount.set(a, (allergyCount.get(a) ?? 0) + 1)
    }
    const topAllergies = Array.from(allergyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const byDay = daysLocal.map((day) => ({
      day,
      count: reservations.filter((r) => r.datetime.startsWith(day)).length,
      pax: reservations
        .filter((r) => r.datetime.startsWith(day))
        .reduce((sum, r) => sum + r.party, 0),
    }))
    const maxResDay = Math.max(1, ...byDay.map((d) => d.count))

    return {
      active: active.length,
      week: week.length,
      pending,
      confirmed,
      avgParty,
      allergyReservations,
      topAllergies,
      byDay,
      maxResDay,
      paxWeek: pax,
    }
  }, [reservations])

  const ordered = topOrdered(10)
  const viewed = topViewed(8)
  const maxOrders = Math.max(1, ...ordered.map((row) => row.orders), 1)
  const days = lastNDays(7)
  const maxDaily = Math.max(1, ...days.map((day) => dailyOrders[day] ?? 0))

  const lowStock = useMemo(() => {
    return items
      .map((item) => {
        const inv = inventory[item.id]
        if (!inv?.track) return null
        if (inv.stock > inv.minStock) return null
        return { item, inv }
      })
      .filter(Boolean)
      .slice(0, 8) as Array<{
      item: (typeof items)[number]
      inv: (typeof inventory)[string]
    }>
  }, [items, inventory])

  const hidden = items.filter((i) => i.available === false).length
  const offers = items.filter((i) => i.offer?.active).length
  const totalOrders = Object.values(dishes).reduce((sum, d) => sum + d.orders, 0)

  return (
    <div className="admin-v2__stack admin-analytics">
      <header className="admin-v2__panel-head">
        <h3>Analítica del local</h3>
        <p>Platos más pedidos, reservas, stock y alergias — para decidir rápido</p>
      </header>

      <div className="admin-analytics__kpis">
        <article className="admin-analytics__kpi">
          <Users size={16} />
          <strong>{reservationStats.week}</strong>
          <span>Reservas (7 días)</span>
        </article>
        <article className="admin-analytics__kpi">
          <CalendarDays size={16} />
          <strong>{reservationStats.pending}</strong>
          <span>Pendientes</span>
        </article>
        <article className="admin-analytics__kpi">
          <TrendingUp size={16} />
          <strong>{totalOrders}</strong>
          <span>Platos vendidos</span>
        </article>
        <article className="admin-analytics__kpi">
          <Package size={16} />
          <strong>{lowStock.length}</strong>
          <span>Stock bajo</span>
        </article>
        <article className="admin-analytics__kpi">
          <AlertTriangle size={16} />
          <strong>{reservationStats.allergyReservations}</strong>
          <span>Con alergia</span>
        </article>
        <article className="admin-analytics__kpi">
          <Eye size={16} />
          <strong>{reservationStats.avgParty.toFixed(1)}</strong>
          <span>Pax medio</span>
        </article>
      </div>

      <div className="admin-analytics__grid">
        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>
              <BarChart3 size={16} /> Platos más pedidos
            </h3>
            <p>Cada −1 de inventario cuenta como venta</p>
          </header>
          {ordered.length === 0 ? (
            <div className="admin-v2__empty">
              <p>Aún no hay ventas. En Inventario, baja stock (−) al servir un plato.</p>
            </div>
          ) : (
            <ul className="admin-analytics__bars">
              {ordered.map((row, index) => (
                <li key={row.id}>
                  <div className="admin-analytics__bar-meta">
                    <em>{index + 1}</em>
                    <strong>{nameById.get(row.id) ?? row.id}</strong>
                    <span>{row.orders}</span>
                  </div>
                  <div className="admin-analytics__bar-track">
                    <i style={{ width: `${(row.orders / maxOrders) * 100}%` }} />
                  </div>
                  <button
                    type="button"
                    className="admin-v2__btn admin-v2__btn--ghost"
                    onClick={() => recordOrder(row.id, 1)}
                  >
                    +1 pedido
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>
              <Eye size={16} /> Más vistos en carta
            </h3>
            <p>Clientes que abren el detalle del plato</p>
          </header>
          {viewed.length === 0 ? (
            <div className="admin-v2__empty">
              <p>Sin visitas aún. Se registra al abrir un plato en la carta pública.</p>
            </div>
          ) : (
            <ul className="admin-analytics__list">
              {viewed.map((row, index) => (
                <li key={row.id}>
                  <em>{index + 1}</em>
                  <strong>{nameById.get(row.id) ?? row.id}</strong>
                  <span>{row.views} vistas</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>Reservas por día</h3>
            <p>Últimos 7 días</p>
          </header>
          <div className="admin-analytics__daybars" aria-label="Reservas por día">
            {reservationStats.byDay.map((row) => {
              const label = new Date(`${row.day}T12:00:00`).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
              })
              return (
                <div key={row.day} className="admin-analytics__day">
                  <div className="admin-analytics__day-col">
                    <i
                      style={{
                        height: `${Math.max(8, (row.count / reservationStats.maxResDay) * 100)}%`,
                      }}
                      title={`${row.count} reservas · ${row.pax} pax`}
                    />
                  </div>
                  <span>{label}</span>
                  <strong>{row.count}</strong>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>Ventas diarias (platos)</h3>
            <p>Unidades descontadas de inventario</p>
          </header>
          <div className="admin-analytics__daybars">
            {days.map((day) => {
              const count = dailyOrders[day] ?? 0
              const label = new Date(`${day}T12:00:00`).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
              })
              return (
                <div key={day} className="admin-analytics__day">
                  <div className="admin-analytics__day-col">
                    <i
                      className="is-gold"
                      style={{ height: `${Math.max(8, (count / maxDaily) * 100)}%` }}
                    />
                  </div>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>
              <AlertTriangle size={16} /> Alergias frecuentes
            </h3>
            <p>Detectadas en reservas y notas</p>
          </header>
          {reservationStats.topAllergies.length === 0 ? (
            <div className="admin-v2__empty">
              <p>Sin alertas de alergia todavía.</p>
            </div>
          ) : (
            <ul className="admin-analytics__list admin-analytics__list--alert">
              {reservationStats.topAllergies.map(([id, count]) => (
                <li key={id}>
                  <strong>{ALLERGEN_LABELS[id]}</strong>
                  <span>{count} reservas</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-v2__panel">
          <header className="admin-v2__panel-head">
            <h3>Salud de carta</h3>
            <p>Inventario y visibilidad</p>
          </header>
          <ul className="admin-analytics__health">
            <li>
              <span>Platos ocultos</span>
              <strong>{hidden}</strong>
            </li>
            <li>
              <span>Ofertas activas</span>
              <strong>{offers}</strong>
            </li>
            <li>
              <span>Pax semana</span>
              <strong>{reservationStats.paxWeek}</strong>
            </li>
            <li>
              <span>Confirmadas</span>
              <strong>{reservationStats.confirmed}</strong>
            </li>
          </ul>
          {lowStock.length > 0 ? (
            <ul className="admin-analytics__list admin-analytics__list--alert">
              {lowStock.map(({ item, inv }) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>
                    {inv.stock} {inv.unit} (mín {inv.minStock})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-analytics__ok">Stock en niveles correctos.</p>
          )}
        </section>
      </div>

      <div className="admin-v2__actions-row">
        <button type="button" className="admin-v2__btn admin-v2__btn--ghost" onClick={resetAnalytics}>
          Reiniciar contadores de ventas/vistas
        </button>
      </div>
    </div>
  )
}
