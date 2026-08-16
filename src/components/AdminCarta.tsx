import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgePercent,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardCopy,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutTemplate,
  Minus,
  Package,
  Plus,
  Printer,
  Share2,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { AnalyticsPanel } from './AnalyticsPanel'
import { formatPrice } from '../data/carta'
import { testPosPrinter } from '../lib/pos-printer'
import type { PosConnectionMode, PosPaperWidth } from '../lib/pos-printer-types'
import {
  MENU_TEMPLATES,
  buildMenuShareText,
  useCartaStore,
  type DailyMenu,
  type MenuSectionKey,
  type PublishTarget,
} from '../lib/carta-store'
import { useAnalytics } from '../lib/analytics-store'
import { formatDisplayDate } from '../lib/reservation-engine'
import { useReservations } from '../lib/reservation-store'
import type { ReservationStatus } from '../lib/reservation-types'
import { ALLERGEN_LABELS, resolveGuestAllergens } from '../lib/carta-diet'

type AdminTab = 'productos' | 'inventario' | 'menus' | 'reservas' | 'analitica' | 'publicar'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'productos', label: 'Productos' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'menus', label: 'Menús' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'analitica', label: 'Analítica' },
  { id: 'publicar', label: 'Publicar' },
]

const PRICE_STEPS = [0.5, 1, 2]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function ProductPicker({
  selectedId,
  onSelect,
  filterCategory,
}: {
  selectedId: string
  onSelect: (id: string) => void
  filterCategory?: string
}) {
  const { items } = useCartaStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(filterCategory ?? 'all')

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!q) return true
      return item.name.toLowerCase().includes(q)
    })
  }, [items, query, category])

  return (
    <div className="admin-v2__picker">
      <input
        className="admin-v2__search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar plato…"
      />
      <div className="admin-v2__chips" role="group" aria-label="Categorías">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={category === cat ? 'is-active' : ''}
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? 'Todos' : cat.replace(' (incluye arroz)', '').replace(' (no picante)', '')}
          </button>
        ))}
      </div>
      <div className="admin-v2__picker-grid" role="listbox" aria-label="Productos">
        {filtered.map((item) => {
          const onOffer = Boolean(item.offer?.active)
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={selectedId === item.id}
              className={`admin-v2__pick${selectedId === item.id ? ' is-active' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="admin-v2__pick-thumb" aria-hidden="true">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.name.slice(0, 1)}
              </span>
              <span className="admin-v2__pick-body">
                <strong>{item.name}</strong>
                <em>
                  {onOffer ? formatPrice(item.offer!.price) : formatPrice(item.price)}
                  {item.available === false ? ' · oculto' : ''}
                </em>
              </span>
              {selectedId === item.id ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProductsPanel() {
  const { items, updateItem, setOffer, resetItem } = useCartaStore()
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '')
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  if (!selected) return null

  const offerOn = Boolean(selected.offer?.active)

  return (
    <div className="admin-v2__split admin-v2__split--products">
      <ProductPicker selectedId={selected.id} onSelect={setSelectedId} />
      <div className="admin-v2__panel admin-v2__panel--editor">
        <header className="admin-v2__panel-head">
          <h3>{selected.name}</h3>
          <p>Seleccionado · edita foto, precio y oferta</p>
        </header>

        <div className="admin-v2__media-row">
          <div className="admin-v2__media">
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt="" />
            ) : (
              <div className="admin-v2__media-empty">
                <ImagePlus size={24} />
                <span>Sin foto</span>
              </div>
            )}
          </div>
          <div className="admin-v2__media-actions">
            <label className="admin-v2__btn">
              Subir foto
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 1_800_000) {
                    window.alert('Imagen máxima 1.8 MB')
                    return
                  }
                  updateItem(selected.id, { imageUrl: await fileToDataUrl(file) })
                }}
              />
            </label>
            {selected.imageUrl ? (
              <button
                type="button"
                className="admin-v2__btn admin-v2__btn--ghost"
                onClick={() => updateItem(selected.id, { imageUrl: '' })}
              >
                Quitar foto
              </button>
            ) : null}
          </div>
        </div>

        <div className="admin-v2__control">
          <span>Precio</span>
          <strong>{formatPrice(selected.price)}</strong>
          <div className="admin-v2__stepper">
            {PRICE_STEPS.map((step) => (
              <button
                key={`-${step}`}
                type="button"
                onClick={() =>
                  updateItem(selected.id, {
                    price: Math.max(0, Number((selected.price - step).toFixed(1))),
                  })
                }
              >
                -{step}
              </button>
            ))}
            {PRICE_STEPS.map((step) => (
              <button
                key={`+${step}`}
                type="button"
                onClick={() =>
                  updateItem(selected.id, {
                    price: Number((selected.price + step).toFixed(1)),
                  })
                }
              >
                +{step}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-v2__toggles">
          <button
            type="button"
            className={`admin-v2__toggle${selected.available !== false ? ' is-on' : ''}`}
            onClick={() =>
              updateItem(selected.id, { available: selected.available === false })
            }
          >
            {selected.available === false ? 'Oculto en carta' : 'Visible en carta'}
          </button>
          <button
            type="button"
            className={`admin-v2__toggle${offerOn ? ' is-on' : ''}`}
            onClick={() => {
              if (offerOn && selected.offer) {
                setOffer(selected.id, { ...selected.offer, active: false })
              } else {
                setOffer(selected.id, {
                  label: selected.offer?.label || 'Oferta',
                  price: selected.offer?.price ?? Number((selected.price * 0.9).toFixed(1)),
                  active: true,
                })
              }
            }}
          >
            <BadgePercent size={14} />
            {offerOn ? 'Oferta activa' : 'Sin oferta'}
          </button>
        </div>

        {offerOn && selected.offer ? (
          <div className="admin-v2__control">
            <span>Precio oferta</span>
            <strong>{formatPrice(selected.offer.price)}</strong>
            <div className="admin-v2__stepper">
              <button
                type="button"
                onClick={() =>
                  setOffer(selected.id, {
                    ...selected.offer!,
                    price: Math.max(0, Number((selected.offer!.price - 0.5).toFixed(1))),
                  })
                }
              >
                -0.5
              </button>
              <button
                type="button"
                onClick={() =>
                  setOffer(selected.id, {
                    ...selected.offer!,
                    price: Number((selected.offer!.price + 0.5).toFixed(1)),
                  })
                }
              >
                +0.5
              </button>
            </div>
            <div className="admin-v2__chips">
              {['Oferta', 'Menú mediodía', 'Promo fin de semana'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className={selected.offer?.label === label ? 'is-active' : ''}
                  onClick={() => setOffer(selected.id, { ...selected.offer!, label })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-v2__actions-row">
          <button
            type="button"
            className="admin-v2__btn admin-v2__btn--ghost"
            onClick={() => resetItem(selected.id)}
          >
            Restaurar plato
          </button>
        </div>
      </div>
    </div>
  )
}

function InventoryPanel() {
  const { items, inventory, bumpStock, setInventory, updateItem } = useCartaStore()
  const { recordOrder } = useAnalytics()
  const [onlyLow, setOnlyLow] = useState(false)
  const [category, setCategory] = useState('all')

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  )

  const rows = useMemo(() => {
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      const inv = inventory[item.id]
      if (!onlyLow) return true
      return inv && inv.track && inv.stock <= inv.minStock
    })
  }, [items, inventory, onlyLow, category])

  return (
    <div className="admin-v2__stack">
      <div className="admin-v2__toolbar">
        <div className="admin-v2__chips">
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat}
              type="button"
              className={category === cat ? 'is-active' : ''}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'Todos' : cat.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`admin-v2__toggle${onlyLow ? ' is-on' : ''}`}
          onClick={() => setOnlyLow((v) => !v)}
        >
          Solo stock bajo
        </button>
      </div>

      <div className="admin-v2__inv-list">
        {rows.map((item) => {
          const inv = inventory[item.id] ?? {
            productId: item.id,
            stock: 0,
            unit: 'raciones' as const,
            minStock: 5,
            track: true,
          }
          const low = inv.track && inv.stock <= inv.minStock
          const hidden = item.available === false
          return (
            <article
              key={item.id}
              className={`admin-v2__inv-row${low ? ' is-low' : ''}${hidden ? ' is-hidden' : ''}`}
            >
              <div className="admin-v2__inv-main">
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {inv.unit} · mín {inv.minStock}
                    {low ? ' · reponer' : ''}
                    {hidden ? ' · oculto en carta' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className={`admin-v2__visibility${hidden ? ' is-off' : ''}`}
                  aria-pressed={!hidden}
                  aria-label={hidden ? 'Mostrar en carta' : 'Ocultar de la carta'}
                  title={hidden ? 'Mostrar en carta' : 'Ocultar de la carta'}
                  onClick={() => updateItem(item.id, { available: hidden ? true : false })}
                >
                  {hidden ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                  <span>{hidden ? 'Mostrar' : 'Ocultar'}</span>
                </button>
              </div>
              <div className="admin-v2__inv-controls">
                <button
                  type="button"
                  className="admin-v2__inv-step"
                  onClick={() => {
                    bumpStock(item.id, -1)
                    recordOrder(item.id, 1)
                  }}
                  aria-label="Restar / registrar venta"
                >
                  <Minus size={16} />
                </button>
                <em>{inv.stock}</em>
                <button
                  type="button"
                  className="admin-v2__inv-step"
                  onClick={() => bumpStock(item.id, 1)}
                  aria-label="Sumar"
                >
                  <Plus size={16} />
                </button>
                <div className="admin-v2__chips">
                  {(['ud', 'raciones', 'kg'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={inv.unit === unit ? 'is-active' : ''}
                      onClick={() => setInventory(item.id, { unit })}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function MenuBuilder({
  menu,
  onBack,
}: {
  menu: DailyMenu
  onBack: () => void
}) {
  const {
    items,
    updateMenu,
    setMenuSectionProducts,
    setMenuSectionMax,
    duplicateMenu,
    deleteMenu,
  } = useCartaStore()
  const [activeSection, setActiveSection] = useState<MenuSectionKey>('entrantes')
  const section = menu.sections.find((s) => s.key === activeSection) ?? menu.sections[0]

  const toggleProduct = (productId: string) => {
    const current = section.productIds
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId].slice(0, section.maxItems)
    setMenuSectionProducts(menu.id, section.key, next)
  }

  const candidates = useMemo(() => {
    const map: Record<MenuSectionKey, (category: string) => boolean> = {
      entrantes: (c) => c.startsWith('ENTRADAS'),
      principales: (c) =>
        c.includes('POLLO') ||
        c.includes('CERDO') ||
        c.includes('GAMBA') ||
        c.includes('CORDERO') ||
        c.includes('TERNERA') ||
        c.includes('TANDOORI') ||
        c.includes('ESPECIALIDAD') ||
        c.includes('VERDURAS'),
      acompanamientos: (c) => c.includes('NAAN') || c.includes('ARROZ'),
      postres: (c) => c.startsWith('POSTRES'),
      bebidas: (_c) => false,
    }
    const preferred = items.filter((item) => {
      if (section.key === 'bebidas') {
        const n = item.name.toLowerCase()
        return n.includes('lassi') || n.includes('té') || n.includes('cafe') || n.includes('café')
      }
      return map[section.key](item.category)
    })
    const rest = items.filter((item) => !preferred.some((p) => p.id === item.id))
    return [...preferred, ...rest]
  }, [items, section.key])

  return (
    <div className="admin-v2__stack">
      <div className="admin-v2__toolbar">
        <button type="button" className="admin-v2__btn admin-v2__btn--ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Volver
        </button>
        <div className="admin-v2__chips">
          {MENU_TEMPLATES.filter((t) => t.id !== 'custom').map((template) => (
            <button
              key={template.id}
              type="button"
              className={menu.occasion === template.occasion ? 'is-active' : ''}
              onClick={() =>
                updateMenu(menu.id, {
                  occasion: template.occasion,
                  title: menu.title || template.label,
                  price: template.price || menu.price,
                })
              }
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-v2__panel">
        <div className="admin-v2__control">
          <span>Nombre del menú</span>
          <div className="admin-v2__chips">
            {[
              menu.occasion,
              `Menú ${menu.date}`,
              'Menú del día',
              'Especial casa',
            ]
              .filter(Boolean)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((label) => (
                <button
                  key={label}
                  type="button"
                  className={menu.title === label ? 'is-active' : ''}
                  onClick={() => updateMenu(menu.id, { title: label })}
                >
                  {label}
                </button>
              ))}
          </div>
        </div>

        <div className="admin-v2__control">
          <span>Fecha</span>
          <input
            type="date"
            value={menu.date}
            onChange={(e) => updateMenu(menu.id, { date: e.target.value })}
          />
        </div>

        <div className="admin-v2__control">
          <span>Precio menú</span>
          <strong>{formatPrice(menu.price)}</strong>
          <div className="admin-v2__stepper">
            {[1, 2, 5].map((step) => (
              <button
                key={`m-${step}`}
                type="button"
                onClick={() =>
                  updateMenu(menu.id, {
                    price: Math.max(0, Number((menu.price - step).toFixed(1))),
                  })
                }
              >
                -{step}
              </button>
            ))}
            {[1, 2, 5].map((step) => (
              <button
                key={`p-${step}`}
                type="button"
                onClick={() =>
                  updateMenu(menu.id, { price: Number((menu.price + step).toFixed(1)) })
                }
              >
                +{step}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-v2__chips admin-v2__chips--wrap">
        {menu.sections.map((sec) => (
          <button
            key={sec.key}
            type="button"
            className={section.key === sec.key ? 'is-active' : ''}
            onClick={() => setActiveSection(sec.key)}
          >
            {sec.label} ({sec.productIds.length}/{sec.maxItems})
          </button>
        ))}
      </div>

      <div className="admin-v2__panel">
        <div className="admin-v2__control">
          <span>Cantidad máx. en {section.label}</span>
          <div className="admin-v2__stepper">
            <button
              type="button"
              onClick={() => setMenuSectionMax(menu.id, section.key, section.maxItems - 1)}
            >
              <Minus size={14} />
            </button>
            <em>{section.maxItems}</em>
            <button
              type="button"
              onClick={() => setMenuSectionMax(menu.id, section.key, section.maxItems + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <p className="admin-v2__hint">
          Selecciona productos de la carta ({section.productIds.length}/{section.maxItems})
        </p>

        <div className="admin-v2__picker-grid">
          {candidates.map((item) => {
            const selected = section.productIds.includes(item.id)
            const full = !selected && section.productIds.length >= section.maxItems
            return (
              <button
                key={item.id}
                type="button"
                disabled={full}
                className={`admin-v2__pick${selected ? ' is-active' : ''}`}
                onClick={() => toggleProduct(item.id)}
              >
                <span className="admin-v2__pick-thumb" aria-hidden="true">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.name.slice(0, 1)}
                </span>
                <span className="admin-v2__pick-body">
                  <strong>{item.name}</strong>
                  <em>{formatPrice(item.price)}</em>
                </span>
                {selected ? <Check size={16} /> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="admin-v2__actions-row">
        <button
          type="button"
          className="admin-v2__btn admin-v2__btn--ghost"
          onClick={() => duplicateMenu(menu.id)}
        >
          <Copy size={14} /> Duplicar
        </button>
        <button
          type="button"
          className="admin-v2__btn admin-v2__btn--danger"
          onClick={() => {
            if (window.confirm('¿Borrar este menú?')) {
              deleteMenu(menu.id)
              onBack()
            }
          }}
        >
          <Trash2 size={14} /> Borrar
        </button>
      </div>
    </div>
  )
}

function MenusPanel({
  onOpenPublish,
}: {
  onOpenPublish: (menuId: string) => void
}) {
  const { menus, createMenuFromTemplate } = useCartaStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = menus.find((menu) => menu.id === editingId) ?? null

  if (editing) {
    return <MenuBuilder menu={editing} onBack={() => setEditingId(null)} />
  }

  return (
    <div className="admin-v2__stack">
      <header className="admin-v2__panel-head">
        <h3>Crear menú desde plantilla</h3>
        <p>Elige una plantilla y luego selecciona platos de tu carta</p>
      </header>

      <div className="admin-v2__template-grid">
        {MENU_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="admin-v2__template"
            onClick={() => {
              const id = createMenuFromTemplate(template.id)
              setEditingId(id)
            }}
          >
            <LayoutTemplate size={18} />
            <strong>{template.label}</strong>
            <span>{template.hint}</span>
            <em>{template.price > 0 ? formatPrice(template.price) : 'Precio libre'}</em>
          </button>
        ))}
      </div>

      <header className="admin-v2__panel-head">
        <h3>Tus menús</h3>
        <p>{menus.length === 0 ? 'Todavía no hay menús' : `${menus.length} guardados`}</p>
      </header>

      <div className="admin-v2__menu-list">
        {menus.map((menu) => (
          <article key={menu.id} className="admin-v2__menu-card">
            <div>
              <strong>{menu.title}</strong>
              <span>
                {menu.occasion} · {menu.date} · {formatPrice(menu.price)}
                {menu.published ? ' · publicado' : ''}
              </span>
            </div>
            <div className="admin-v2__actions-row">
              <button type="button" className="admin-v2__btn" onClick={() => setEditingId(menu.id)}>
                Editar
              </button>
              <button
                type="button"
                className="admin-v2__btn admin-v2__btn--ghost"
                onClick={() => onOpenPublish(menu.id)}
              >
                Publicar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function PublishPanel({ initialMenuId }: { initialMenuId?: string }) {
  const { menus, items, markPublished } = useCartaStore()
  const [menuId, setMenuId] = useState(initialMenuId || menus[0]?.id || '')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (initialMenuId) setMenuId(initialMenuId)
  }, [initialMenuId])

  const menu = menus.find((m) => m.id === menuId) ?? menus[0]

  if (!menu) {
    return (
      <div className="admin-v2__empty">
        <UtensilsCrossed size={28} />
        <p>Crea un menú primero para poder publicarlo.</p>
      </div>
    )
  }

  const text = buildMenuShareText(menu, items)

  const publish = async (target: PublishTarget) => {
    const ok = await copyText(text)
    markPublished(menu.id, true)
    if (target === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
      setStatus('Abierto WhatsApp con el texto del menú.')
      return
    }
    if (target === 'instagram' || target === 'facebook') {
      setStatus(
        ok
          ? `Texto copiado. Pégalo en ${target === 'instagram' ? 'Instagram' : 'Facebook'} Business.`
          : 'No se pudo copiar. Selecciona el texto manualmente.',
      )
      return
    }
    if (target === 'google') {
      window.open('https://business.google.com/posts', '_blank', 'noopener,noreferrer')
      setStatus(
        ok
          ? 'Texto copiado. Pégalo en Google Business Profile → Publicaciones.'
          : 'Abre Google Business y pega el menú.',
      )
    }
  }

  return (
    <div className="admin-v2__stack">
      <div className="admin-v2__chips admin-v2__chips--wrap">
        {menus.map((m) => (
          <button
            key={m.id}
            type="button"
            className={menu.id === m.id ? 'is-active' : ''}
            onClick={() => setMenuId(m.id)}
          >
            {m.title}
          </button>
        ))}
      </div>

      <div className="admin-v2__panel">
        <header className="admin-v2__panel-head">
          <h3>Vista previa</h3>
          <p>Revisa y publica en un toque</p>
        </header>
        <pre className="admin-v2__preview">{text}</pre>
        <div className="admin-v2__actions-row">
          <button
            type="button"
            className="admin-v2__btn"
            onClick={async () => {
              const ok = await copyText(text)
              setStatus(ok ? 'Texto copiado al portapapeles.' : 'No se pudo copiar.')
            }}
          >
            <ClipboardCopy size={14} /> Copiar texto
          </button>
        </div>
      </div>

      <div className="admin-v2__publish-grid">
        <button type="button" className="admin-v2__publish" onClick={() => publish('instagram')}>
          <Share2 size={18} /> Instagram
        </button>
        <button type="button" className="admin-v2__publish" onClick={() => publish('facebook')}>
          <Share2 size={18} /> Facebook
        </button>
        <button type="button" className="admin-v2__publish" onClick={() => publish('google')}>
          <Share2 size={18} /> Google Business
        </button>
        <button type="button" className="admin-v2__publish" onClick={() => publish('whatsapp')}>
          <Share2 size={18} /> WhatsApp
        </button>
      </div>

      {status ? <p className="admin-v2__status">{status}</p> : null}
      <p className="admin-v2__hint">
        En esta prueba la publicación copia el menú y abre la red. Más adelante se puede conectar
        la API oficial de Instagram/Facebook/Google para publicar automático.
      </p>
    </div>
  )
}

export function AdminCarta() {
  const [tab, setTab] = useState<AdminTab>('productos')
  const [publishMenuId, setPublishMenuId] = useState<string | undefined>()

  return (
    <section id="admin" className="admin-v2" aria-labelledby="admin-title">
      <div className="admin-v2__inner">
        <header className="admin-v2__intro">
          <p className="admin-v2__eyebrow">Panel Chaini</p>
          <h2 id="admin-title">Administración fácil</h2>
          <p>
            Casi sin escribir: selecciona productos, controla inventario, arma menús con plantillas
            y publícalos.
          </p>
        </header>

        <nav className="admin-v2__tabs" aria-label="Secciones del panel">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.id === 'productos' ? <Package size={15} /> : null}
              {item.id === 'inventario' ? <Package size={15} /> : null}
              {item.id === 'menus' ? <UtensilsCrossed size={15} /> : null}
              {item.id === 'reservas' ? <CalendarDays size={15} /> : null}
              {item.id === 'analitica' ? <BarChart3 size={15} /> : null}
              {item.id === 'publicar' ? <Share2 size={15} /> : null}
              {item.label}
            </button>
          ))}
        </nav>

        {tab === 'productos' ? <ProductsPanel /> : null}
        {tab === 'inventario' ? <InventoryPanel /> : null}
        {tab === 'menus' ? (
          <MenusPanel
            onOpenPublish={(menuId) => {
              setPublishMenuId(menuId)
              setTab('publicar')
            }}
          />
        ) : null}
        {tab === 'reservas' ? <ReservationsPanel /> : null}
        {tab === 'analitica' ? <AnalyticsPanel /> : null}
        {tab === 'publicar' ? <PublishPanel initialMenuId={publishMenuId} /> : null}
      </div>
    </section>
  )
}

function ReservationsPanel() {
  const {
    reservations,
    updateStatus,
    config,
    setConfig,
    printer,
    setPrinter,
    activateReservationAllergies,
    printTicket,
    lastPrintMessage,
  } = useReservations()
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [printerOpen, setPrinterOpen] = useState(false)
  const [printBusy, setPrintBusy] = useState(false)
  const [printNote, setPrintNote] = useState('')

  const rows = useMemo(() => {
    const list =
      filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)
    return [...list].sort((a, b) => a.datetime.localeCompare(b.datetime))
  }, [reservations, filter])

  const runTestPrint = async () => {
    setPrintBusy(true)
    const result = await testPosPrinter(config, printer)
    setPrintBusy(false)
    setPrintNote(result.ok ? `Prueba OK (${result.method})` : result.error)
  }

  return (
    <div className="admin-v2__stack">
      <div className="admin-v2__panel">
        <header className="admin-v2__panel-head">
          <h3>Reglas de reserva</h3>
          <p>Capacidad, plazos y detección de alergias</p>
        </header>
        <button
          type="button"
          className="admin-v2__btn"
          onClick={() => setRulesOpen((v) => !v)}
        >
          {rulesOpen ? 'Ocultar reglas' : 'Configurar reglas'}
        </button>
        {rulesOpen ? (
          <div className="admin-v2__rules">
            <label>
              Intervalo (min)
              <input
                type="number"
                min={5}
                max={120}
                value={config.timeInterval}
                onChange={(e) => setConfig({ timeInterval: Number(e.target.value) || 30 })}
              />
            </label>
            <label>
              Bloque mesa (min)
              <input
                type="number"
                min={30}
                max={240}
                value={config.diningBlockMinutes}
                onChange={(e) =>
                  setConfig({ diningBlockMinutes: Number(e.target.value) || 120 })
                }
              />
            </label>
            <label>
              Días anticipación
              <input
                type="number"
                min={1}
                max={180}
                value={config.earlyBookingsDays ?? 60}
                onChange={(e) =>
                  setConfig({ earlyBookingsDays: Number(e.target.value) || 60 })
                }
              />
            </label>
            <label>
              Minutos mínimos antes
              <input
                type="number"
                min={0}
                max={1440}
                value={config.lateBookingsMinutes ?? 0}
                onChange={(e) =>
                  setConfig({ lateBookingsMinutes: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Comensales máx.
              <input
                type="number"
                min={1}
                max={40}
                value={config.partySizeMax}
                onChange={(e) => setConfig({ partySizeMax: Number(e.target.value) || 12 })}
              />
            </label>
            <label>
              Auto-confirmar si &lt;
              <input
                type="number"
                min={1}
                max={20}
                value={config.autoConfirmMaxPartySize}
                onChange={(e) =>
                  setConfig({ autoConfirmMaxPartySize: Number(e.target.value) || 3 })
                }
              />
            </label>
            <label>
              Máx. reservas / bloque
              <input
                type="number"
                min={1}
                max={50}
                value={config.maxReservations ?? 8}
                onChange={(e) =>
                  setConfig({ maxReservations: Number(e.target.value) || null })
                }
              />
            </label>
            <label>
              Máx. comensales / bloque
              <input
                type="number"
                min={1}
                max={200}
                value={config.maxSeats ?? 40}
                onChange={(e) => setConfig({ maxSeats: Number(e.target.value) || null })}
              />
            </label>
            <label>
              WhatsApp (solo dígitos)
              <input
                type="text"
                value={config.whatsapp ?? ''}
                onChange={(e) =>
                  setConfig({ whatsapp: e.target.value.replace(/\D/g, '') || undefined })
                }
              />
            </label>
            <div className="admin-v2__toggles">
              <button
                type="button"
                className={`admin-v2__toggle${config.requirePhone ? ' is-on' : ''}`}
                onClick={() => setConfig({ requirePhone: !config.requirePhone })}
              >
                Teléfono obligatorio
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${config.askAllergies ? ' is-on' : ''}`}
                onClick={() => setConfig({ askAllergies: !config.askAllergies })}
              >
                Preguntar alergias
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${config.detectAllergiesFromNotes ? ' is-on' : ''}`}
                onClick={() =>
                  setConfig({ detectAllergiesFromNotes: !config.detectAllergiesFromNotes })
                }
              >
                Detectar en notas
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${config.syncAllergiesToCarta ? ' is-on' : ''}`}
                onClick={() =>
                  setConfig({ syncAllergiesToCarta: !config.syncAllergiesToCarta })
                }
              >
                Resaltar en carta
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="admin-v2__panel">
        <header className="admin-v2__panel-head">
          <h3>
            <Printer size={16} /> Impresora térmica POS
          </h3>
          <p>USB al PC, WiFi o LAN (IP:9100). Tique al confirmar reserva.</p>
        </header>
        <button
          type="button"
          className="admin-v2__btn"
          onClick={() => setPrinterOpen((v) => !v)}
        >
          {printerOpen ? 'Ocultar impresora' : 'Configurar impresora'}
        </button>
        {printerOpen ? (
          <div className="admin-v2__printer">
            <div className="admin-v2__toggles">
              <button
                type="button"
                className={`admin-v2__toggle${printer.enabled ? ' is-on' : ''}`}
                onClick={() => setPrinter({ enabled: !printer.enabled })}
              >
                Impresora activa
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${printer.autoPrintOnConfirm ? ' is-on' : ''}`}
                onClick={() =>
                  setPrinter({ autoPrintOnConfirm: !printer.autoPrintOnConfirm })
                }
              >
                Auto al confirmar
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${printer.autoPrintOnArrive ? ' is-on' : ''}`}
                onClick={() => setPrinter({ autoPrintOnArrive: !printer.autoPrintOnArrive })}
              >
                Auto al llegar
              </button>
              <button
                type="button"
                className={`admin-v2__toggle${printer.cutPaper ? ' is-on' : ''}`}
                onClick={() => setPrinter({ cutPaper: !printer.cutPaper })}
              >
                Corte de papel
              </button>
            </div>

            <div className="admin-v2__rules">
              <label>
                Conexión
                <select
                  value={printer.mode}
                  onChange={(e) =>
                    setPrinter({ mode: e.target.value as PosConnectionMode })
                  }
                >
                  <option value="browser">Driver Windows / diálogo imprimir</option>
                  <option value="usb-serial">USB / Serial (cable al PC)</option>
                  <option value="network">Red WiFi / LAN (IP + bridge)</option>
                </select>
              </label>
              <label>
                Ancho papel
                <select
                  value={printer.paperWidth}
                  onChange={(e) =>
                    setPrinter({ paperWidth: Number(e.target.value) as PosPaperWidth })
                  }
                >
                  <option value={58}>58 mm</option>
                  <option value={80}>80 mm</option>
                </select>
              </label>
              <label>
                Copias
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={printer.copies}
                  onChange={(e) => setPrinter({ copies: Number(e.target.value) || 1 })}
                />
              </label>
              <label>
                IP impresora (LAN/WiFi)
                <input
                  type="text"
                  value={printer.host}
                  onChange={(e) => setPrinter({ host: e.target.value.trim() })}
                  placeholder="192.168.1.100"
                />
              </label>
              <label>
                Puerto raw
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={printer.port}
                  onChange={(e) => setPrinter({ port: Number(e.target.value) || 9100 })}
                />
              </label>
              <label>
                Bridge local
                <input
                  type="text"
                  value={printer.bridgeUrl}
                  onChange={(e) => setPrinter({ bridgeUrl: e.target.value.trim() })}
                  placeholder="http://127.0.0.1:17777/print"
                />
              </label>
              <label>
                Cabecera tique
                <input
                  type="text"
                  value={printer.restaurantHeader}
                  onChange={(e) => setPrinter({ restaurantHeader: e.target.value })}
                />
              </label>
              <label>
                Pie tique
                <input
                  type="text"
                  value={printer.footer}
                  onChange={(e) => setPrinter({ footer: e.target.value })}
                />
              </label>
            </div>

            <p className="admin-v2__printer-help">
              Red/WiFi: en el PC del local ejecuta <code>pnpm pos:bridge</code> y pon la IP de la
              térmica (puerto 9100). USB: usa Chrome/Edge y elige el puerto. Driver: imprime con el
              diálogo del sistema.
            </p>

            <div className="admin-v2__actions-row">
              <button
                type="button"
                className="admin-v2__btn"
                disabled={printBusy}
                onClick={() => void runTestPrint()}
              >
                <Printer size={14} /> Imprimir tique de prueba
              </button>
            </div>
            {printNote || lastPrintMessage ? (
              <p className="admin-v2__printer-status">{printNote || lastPrintMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="admin-v2__toolbar">
        <div className="admin-v2__chips">
          {(
            [
              ['all', 'Todas'],
              ['pending', 'Pendientes'],
              ['confirmed', 'Confirmadas'],
              ['cancelled', 'Canceladas'],
              ['arrived', 'Llegaron'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? 'is-active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="admin-v2__empty">
          <p>Aún no hay reservas. Desde la web: Reservar mesa.</p>
        </div>
      ) : (
        <div className="admin-v2__inv-list">
          {rows.map((item) => {
            const allergens = resolveGuestAllergens(item.allergens, item.message, item.notes)
            const hasAllergy = allergens.length > 0
            return (
              <article
                key={item.id}
                className={`admin-v2__inv-row admin-v2__rsv-row is-${item.status}${
                  hasAllergy ? ' has-allergy' : ''
                }`}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {formatDisplayDate(item.datetime.slice(0, 10), config.locale)} ·{' '}
                    {item.datetime.slice(11, 16)} · {item.party} pax · {item.status}
                    {item.phone ? ` · ${item.phone}` : ''}
                  </span>
                  {hasAllergy ? (
                    <div className="admin-v2__rsv-alert" role="alert">
                      <AlertTriangle size={15} aria-hidden="true" />
                      <div>
                        <strong>Alerta alergia</strong>
                        <span>
                          {allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
                          {item.message ? ` · “${item.message}”` : ''}
                        </span>
                      </div>
                    </div>
                  ) : item.message ? (
                    <em className="admin-v2__rsv-note">{item.message}</em>
                  ) : null}
                </div>
                <div className="admin-v2__inv-controls">
                  <button
                    type="button"
                    className="admin-v2__visibility"
                    onClick={() => void printTicket(item.id)}
                    title="Imprimir tique"
                  >
                    <Printer size={14} /> Tique
                  </button>
                  {hasAllergy ? (
                    <button
                      type="button"
                      className="admin-v2__visibility admin-v2__visibility--alert"
                      onClick={() => {
                        activateReservationAllergies(item.id)
                        window.location.hash = '#carta'
                      }}
                    >
                      Ver en carta
                    </button>
                  ) : null}
                  {item.status === 'pending' ? (
                    <button
                      type="button"
                      className="admin-v2__visibility"
                      onClick={() => void updateStatus(item.id, 'confirmed')}
                    >
                      <Check size={14} /> Confirmar
                    </button>
                  ) : null}
                  {item.status === 'confirmed' ? (
                    <button
                      type="button"
                      className="admin-v2__visibility"
                      onClick={() => void updateStatus(item.id, 'arrived')}
                    >
                      Llegó
                    </button>
                  ) : null}
                  {item.status !== 'cancelled' && item.status !== 'closed' ? (
                    <button
                      type="button"
                      className="admin-v2__visibility is-off"
                      onClick={() => void updateStatus(item.id, 'cancelled')}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
