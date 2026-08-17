import { useMemo } from 'react'
import { AlertTriangle, BarChart3, Eye, Package, Tag, TrendingUp } from 'lucide-react'
import { useAnalytics } from '../lib/analytics-store'
import { useCartaStore } from '../lib/carta-store'

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
  const { topOrdered, topViewed, dailyOrders, recordOrder, resetAnalytics, dishes } =
    useAnalytics()

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) map.set(item.id, item.name)
    return map
  }, [items])

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
  const tracked = items.filter((i) => inventory[i.id]?.track).length
  const totalOrders = Object.values(dishes).reduce((sum, d) => sum + d.orders, 0)
  const totalViews = Object.values(dishes).reduce((sum, d) => sum + d.views, 0)

  return (
    <div className="admin-v2__stack admin-analytics">
      <header className="admin-v2__panel-head">
        <h3>Analítica de la carta</h3>
        <p>Platos más pedidos, visitas, stock y ofertas — para decidir rápido</p>
      </header>

      <div className="admin-analytics__kpis">
        <article className="admin-analytics__kpi">
          <TrendingUp size={16} />
          <strong>{totalOrders}</strong>
          <span>Platos vendidos</span>
        </article>
        <article className="admin-analytics__kpi">
          <Eye size={16} />
          <strong>{totalViews}</strong>
          <span>Vistas en carta</span>
        </article>
        <article className="admin-analytics__kpi">
          <Package size={16} />
          <strong>{lowStock.length}</strong>
          <span>Stock bajo</span>
        </article>
        <article className="admin-analytics__kpi">
          <Tag size={16} />
          <strong>{offers}</strong>
          <span>Ofertas activas</span>
        </article>
        <article className="admin-analytics__kpi">
          <AlertTriangle size={16} />
          <strong>{hidden}</strong>
          <span>Platos ocultos</span>
        </article>
        <article className="admin-analytics__kpi">
          <BarChart3 size={16} />
          <strong>{tracked}</strong>
          <span>Con inventario</span>
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
            <h3>Salud de carta</h3>
            <p>Inventario y visibilidad</p>
          </header>
          <ul className="admin-analytics__health">
            <li>
              <span>Platos en carta</span>
              <strong>{items.length}</strong>
            </li>
            <li>
              <span>Platos ocultos</span>
              <strong>{hidden}</strong>
            </li>
            <li>
              <span>Ofertas activas</span>
              <strong>{offers}</strong>
            </li>
            <li>
              <span>Con inventario</span>
              <strong>{tracked}</strong>
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
