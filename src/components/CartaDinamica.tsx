import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Check,
  ChevronDown,
  Flame,
  Leaf,
  MilkOff,
  NutOff,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WheatOff,
  X,
} from 'lucide-react'
import { cartaCategories, formatPrice, type SpiceLevel } from '../data/carta'
import {
  ALLERGEN_LABELS,
  DIET_FILTERS,
  type Allergen,
  type CartaItemEnriched,
  type DietTag,
} from '../lib/carta-diet'
import { useCartaStore } from '../lib/carta-store'

const PREFS_KEY = 'india-gate-carta-prefs:v1'

type SortMode = 'menu' | 'price-asc' | 'price-desc' | 'name'

const spiceDots = (spice: SpiceLevel) => {
  if (spice === 'mild') return 1
  if (spice === 'medium') return 2
  if (spice === 'hot') return 3
  return 0
}

const dietIcon = (id: DietTag) => {
  if (id === 'vegan' || id === 'vegetarian') return Leaf
  if (id === 'glutenFree') return WheatOff
  if (id === 'dairyFree') return MilkOff
  if (id === 'nutFree') return NutOff
  if (id === 'halal') return ShieldCheck
  return Check
}

function loadPrefs(): DietTag[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DietTag[]
    return Array.isArray(parsed) ? parsed.filter((id) => DIET_FILTERS.some((f) => f.id === id)) : []
  } catch {
    return []
  }
}

function shortCategory(label: string) {
  return label.replace(' (incluye arroz)', '').replace(' (no picante)', '')
}

function SpiceBadge({ item }: { item: CartaItemEnriched }) {
  const dots = spiceDots(item.spice)
  if (!item.spiceLabel && dots === 0) return null
  return (
    <span className={`carta-dinamica__spice carta-dinamica__spice--${item.spice}`}>
      {Array.from({ length: dots }).map((_, index) => (
        <Flame key={index} size={11} strokeWidth={2} aria-hidden="true" />
      ))}
      {item.spiceLabel || 'Picante'}
    </span>
  )
}

function DietBadges({ item }: { item: CartaItemEnriched }) {
  const highlight: DietTag[] = ['vegan', 'vegetarian', 'glutenFree', 'dairyFree', 'halal']
  const shown = highlight.filter((tag) => item.diet.tags.includes(tag))
  if (shown.length === 0) return null
  return (
    <ul className="carta-dinamica__diet-badges">
      {shown.map((tag) => {
        const meta = DIET_FILTERS.find((f) => f.id === tag)!
        const Icon = dietIcon(tag)
        return (
          <li key={tag} className={`carta-dinamica__diet-badge carta-dinamica__diet-badge--${tag}`}>
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
            {meta.short}
          </li>
        )
      })}
    </ul>
  )
}

function AllergenRow({ allergens }: { allergens: Allergen[] }) {
  if (allergens.length === 0) {
    return <p className="carta-dinamica__allergens-empty">Sin alérgenos principales detectados*</p>
  }
  return (
    <ul className="carta-dinamica__allergens" aria-label="Alérgenos">
      {allergens.map((allergen) => (
        <li key={allergen}>{ALLERGEN_LABELS[allergen]}</li>
      ))}
    </ul>
  )
}

function DishCard({
  item,
  expanded,
  onToggle,
}: {
  item: CartaItemEnriched
  expanded: boolean
  onToggle: () => void
}) {
  const onOffer = Boolean(item.offer?.active)
  const price = onOffer && item.offer ? item.offer.price : item.price

  return (
    <article className={`carta-dinamica__dish${expanded ? ' carta-dinamica__dish--open' : ''}`}>
      <button type="button" className="carta-dinamica__dish-toggle" onClick={onToggle}>
        <div className="carta-dinamica__dish-top">
          <div className="carta-dinamica__thumb" aria-hidden="true">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" loading="lazy" />
            ) : (
              <span>{item.name.slice(0, 1)}</span>
            )}
            {onOffer ? (
              <em className="carta-dinamica__offer-pill">{item.offer?.label || 'Oferta'}</em>
            ) : null}
          </div>
          <header className="carta-dinamica__dish-head">
            <div>
              <h3>{item.name}</h3>
              <DietBadges item={item} />
            </div>
            <div className="carta-dinamica__dish-meta">
              <p className="carta-dinamica__price">
                {onOffer ? <s>{formatPrice(item.price)}</s> : null}
                <span>{formatPrice(price)}</span>
              </p>
              <ChevronDown size={16} className="carta-dinamica__chevron" aria-hidden="true" />
            </div>
          </header>
        </div>
      </button>

      {expanded ? (
        <div className="carta-dinamica__dish-body">
          {item.ingredients.length > 0 ? (
            <ul className="carta-dinamica__ingredients">
              {item.ingredients.map((ingredient) => (
                <li key={`${item.id}-${ingredient}`}>{ingredient}</li>
              ))}
            </ul>
          ) : (
            <p className="carta-dinamica__ingredients-empty">Ingredientes a consultar en sala</p>
          )}
          <div className="carta-dinamica__dish-foot">
            <SpiceBadge item={item} />
            <AllergenRow allergens={item.diet.allergens} />
          </div>
        </div>
      ) : (
        <div className="carta-dinamica__dish-preview">
          <SpiceBadge item={item} />
          {item.diet.allergens.length > 0 ? (
            <span className="carta-dinamica__allergen-count">
              {item.diet.allergens.length} alérgeno
              {item.diet.allergens.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      )}
    </article>
  )
}

export function CartaDinamica() {
  const { items } = useCartaStore()
  const stickyRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const scrollSelectionToTop = useRef(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [prefs, setPrefs] = useState<DietTag[]>([])
  const [sort, setSort] = useState<SortMode>('menu')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
  }, [prefs])

  /** After a selection, jump to the start of that filtered list (under navbar + sticky filters). */
  const goToSelectionStart = useCallback(() => {
    scrollSelectionToTop.current = true
  }, [])

  const togglePref = (id: DietTag) => {
    goToSelectionStart()
    setPrefs((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const clearFilters = () => {
    goToSelectionStart()
    setPrefs([])
    setQuery('')
    setActiveCategory('all')
    setSort('menu')
  }

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    let list = items.filter((item) => {
      if (item.available === false) return false
      const categoryMatch =
        activeCategory === 'all' ||
        cartaCategories.find((c) => c.id === activeCategory)?.label === item.category
      if (!categoryMatch) return false
      if (prefs.length > 0 && !prefs.every((pref) => item.diet.tags.includes(pref))) {
        return false
      }
      if (!q) return true
      const haystack = [
        item.name,
        item.category,
        ...item.ingredients,
        item.spiceLabel,
        ...item.diet.tags,
        ...item.diet.allergens.map((a) => ALLERGEN_LABELS[a]),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })

    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => {
        const pa = a.offer?.active ? a.offer.price : a.price
        const pb = b.offer?.active ? b.offer.price : b.price
        return pa - pb
      })
    }
    if (sort === 'price-desc') {
      list = [...list].sort((a, b) => {
        const pa = a.offer?.active ? a.offer.price : a.price
        const pb = b.offer?.active ? b.offer.price : b.price
        return pb - pa
      })
    }
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    return list
  }, [items, activeCategory, deferredQuery, prefs, sort])

  useLayoutEffect(() => {
    if (!scrollSelectionToTop.current) return
    scrollSelectionToTop.current = false

    const results = resultsRef.current
    const sticky = stickyRef.current
    if (!results) return

    const stickyTop = sticky
      ? Number.parseFloat(getComputedStyle(sticky).top) || 88
      : 88
    const stickyH = sticky?.offsetHeight ?? 0
    const top =
      window.scrollY + results.getBoundingClientRect().top - stickyTop - stickyH - 8

    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  }, [activeCategory, prefs, sort, deferredQuery, filtered.length])

  const grouped = useMemo(() => {
    if (sort !== 'menu') return [['Resultados', filtered] as const]
    const map = new Map<string, CartaItemEnriched[]>()
    for (const item of filtered) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return Array.from(map.entries())
  }, [filtered, sort])

  const activeFilterCount = prefs.length + (activeCategory !== 'all' ? 1 : 0) + (query ? 1 : 0)

  return (
    <section id="carta" className="carta-dinamica" aria-labelledby="carta-title">
      <div className="carta-dinamica__inner">
        <header className="carta-dinamica__intro">
          <p className="carta-dinamica__eyebrow">Carta inteligente</p>
          <h2 id="carta-title">Tu mesa, a tu manera</h2>
          <p className="carta-dinamica__lead">
            Busca, filtra por dieta y encuentra tu plato al instante. Toca una tarjeta para ver
            ingredientes y alérgenos.
          </p>
        </header>

        <div className="carta-dinamica__sticky" ref={stickyRef}>
          <div className="carta-dinamica__toolbar">
            <label className="carta-dinamica__search">
              <Search size={16} strokeWidth={1.6} aria-hidden="true" />
              <span className="visually-hidden">Buscar en la carta</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Plato, ingrediente o alérgeno…"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  className="carta-dinamica__clear-input"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    goToSelectionStart()
                    setQuery('')
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </label>

            <div className="carta-dinamica__toolbar-actions">
              <button
                type="button"
                className={`carta-dinamica__filters-btn${filtersOpen ? ' is-open' : ''}`}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal size={15} strokeWidth={1.7} aria-hidden="true" />
                Preferencias
                {prefs.length > 0 ? <span>{prefs.length}</span> : null}
              </button>

              <label className="carta-dinamica__sort">
                <span className="visually-hidden">Ordenar</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    goToSelectionStart()
                    setSort(event.target.value as SortMode)
                  }}
                >
                  <option value="menu">Orden de carta</option>
                  <option value="price-asc">Precio ↑</option>
                  <option value="price-desc">Precio ↓</option>
                  <option value="name">Nombre A–Z</option>
                </select>
              </label>
            </div>
          </div>

          <div
            className={`carta-dinamica__prefs${filtersOpen ? ' carta-dinamica__prefs--open' : ''}`}
            role="group"
            aria-label="Preferencias alimentarias"
          >
            {DIET_FILTERS.map((filter) => {
              const active = prefs.includes(filter.id)
              const Icon = dietIcon(filter.id)
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`carta-dinamica__pref${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  title={filter.hint}
                  onClick={() => togglePref(filter.id)}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{filter.short}</span>
                </button>
              )
            })}
          </div>

          <div className="carta-dinamica__tabs" role="tablist" aria-label="Categorías de la carta">
            {cartaCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === category.id}
                className={`carta-dinamica__tab${
                  activeCategory === category.id ? ' carta-dinamica__tab--active' : ''
                }`}
                onClick={() => {
                  if (activeCategory === category.id) return
                  goToSelectionStart()
                  setActiveCategory(category.id)
                }}
              >
                {shortCategory(category.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="carta-dinamica__results" ref={resultsRef}>
          <div className="carta-dinamica__status">
            <p aria-live="polite">
              <strong>{filtered.length}</strong> {filtered.length === 1 ? 'plato' : 'platos'}
              {activeFilterCount > 0
                ? ` · ${activeFilterCount} filtro${activeFilterCount === 1 ? '' : 's'}`
                : ''}
            </p>
            {activeFilterCount > 0 ? (
              <button type="button" className="carta-dinamica__reset" onClick={clearFilters}>
                Limpiar todo
              </button>
            ) : null}
          </div>

          {prefs.length > 0 ? (
            <ul className="carta-dinamica__active-prefs">
              {prefs.map((id) => {
                const meta = DIET_FILTERS.find((f) => f.id === id)!
                return (
                  <li key={id}>
                    <button type="button" onClick={() => togglePref(id)}>
                      {meta.label}
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          <aside className="carta-dinamica__legend" aria-label="Leyenda dietética">
            <p>
              * Sellos orientativos según ingredientes de la carta. En alergias graves o requisitos
              Halal estrictos, confirma siempre en cocina.
            </p>
          </aside>

          {grouped.length === 0 ? (
            <div className="carta-dinamica__empty">
              <p>No hay platos con esa combinación.</p>
              <button type="button" onClick={clearFilters}>
                Quitar filtros
              </button>
            </div>
          ) : (
            <div className="carta-dinamica__groups">
              {grouped.map(([category, groupItems]) => {
                const meta = cartaCategories.find((c) => c.label === category)
                return (
                  <section key={category} className="carta-dinamica__group">
                    <header className="carta-dinamica__group-head">
                      <h3>{category === 'Resultados' ? category : shortCategory(category)}</h3>
                      {meta?.note ? <span>{meta.note}</span> : null}
                      <em>{groupItems.length}</em>
                    </header>
                    <div className="carta-dinamica__grid">
                      {groupItems.map((item) => (
                        <DishCard
                          key={item.id}
                          item={item}
                          expanded={Boolean(expanded[item.id])}
                          onToggle={() =>
                            setExpanded((state) => ({
                              ...state,
                              [item.id]: !state[item.id],
                            }))
                          }
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
