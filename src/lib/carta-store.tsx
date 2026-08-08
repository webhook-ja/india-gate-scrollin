import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cartaItems, type CartaItem, type CartaOffer } from '../data/carta'
import { enrichDiet, type CartaItemEnriched } from './carta-diet'

const STORAGE_KEY = 'india-gate-admin-db:v2'

export type CartaOverrides = Partial<
  Pick<CartaItem, 'name' | 'price' | 'ingredients' | 'imageUrl' | 'offer' | 'available' | 'category'>
>

export type InventoryItem = {
  productId: string
  stock: number
  unit: 'ud' | 'raciones' | 'kg'
  minStock: number
  track: boolean
}

export type MenuSectionKey = 'entrantes' | 'principales' | 'acompanamientos' | 'postres' | 'bebidas'

export type MenuSection = {
  key: MenuSectionKey
  label: string
  maxItems: number
  productIds: string[]
}

export type MenuTemplateId =
  | 'blank'
  | 'daily'
  | 'weekend'
  | 'mothers-day'
  | 'christmas'
  | 'valentine'
  | 'custom'

export type DailyMenu = {
  id: string
  title: string
  occasion: string
  templateId: MenuTemplateId
  date: string
  price: number
  notes: string
  published: boolean
  sections: MenuSection[]
  updatedAt: string
}

export type PublishTarget = 'instagram' | 'facebook' | 'google' | 'whatsapp'

type PersistedDb = {
  overrides: Record<string, CartaOverrides>
  inventory: Record<string, InventoryItem>
  menus: DailyMenu[]
}

type StoreShape = {
  items: CartaItemEnriched[]
  inventory: Record<string, InventoryItem>
  menus: DailyMenu[]
  updateItem: (id: string, patch: CartaOverrides) => void
  setOffer: (id: string, offer: CartaOffer | null) => void
  resetItem: (id: string) => void
  resetAllProducts: () => void
  setInventory: (productId: string, patch: Partial<InventoryItem>) => void
  bumpStock: (productId: string, delta: number) => void
  createMenuFromTemplate: (templateId: MenuTemplateId, title?: string) => string
  updateMenu: (id: string, patch: Partial<DailyMenu>) => void
  setMenuSectionProducts: (menuId: string, sectionKey: MenuSectionKey, productIds: string[]) => void
  setMenuSectionMax: (menuId: string, sectionKey: MenuSectionKey, maxItems: number) => void
  deleteMenu: (id: string) => void
  duplicateMenu: (id: string) => string
  markPublished: (id: string, published?: boolean) => void
}

const CartaStoreContext = createContext<StoreShape | null>(null)

export const MENU_SECTION_DEFS: { key: MenuSectionKey; label: string; defaultMax: number }[] = [
  { key: 'entrantes', label: 'Entrantes', defaultMax: 3 },
  { key: 'principales', label: 'Platos fuertes', defaultMax: 4 },
  { key: 'acompanamientos', label: 'Acompañamientos', defaultMax: 3 },
  { key: 'postres', label: 'Postres', defaultMax: 2 },
  { key: 'bebidas', label: 'Bebidas', defaultMax: 2 },
]

export const MENU_TEMPLATES: {
  id: MenuTemplateId
  label: string
  occasion: string
  price: number
  hint: string
  maxes: Partial<Record<MenuSectionKey, number>>
}[] = [
  {
    id: 'blank',
    label: 'Plantilla vacía',
    occasion: 'Personalizado',
    price: 0,
    hint: 'Empieza de cero y elige secciones',
    maxes: { entrantes: 2, principales: 3, acompanamientos: 2, postres: 1, bebidas: 1 },
  },
  {
    id: 'daily',
    label: 'Menú del día',
    occasion: 'Menú diario',
    price: 14.9,
    hint: 'Entrante + fuerte + postre',
    maxes: { entrantes: 2, principales: 3, acompanamientos: 2, postres: 2, bebidas: 1 },
  },
  {
    id: 'weekend',
    label: 'Menú fin de semana',
    occasion: 'Fin de semana',
    price: 18.9,
    hint: 'Más opciones para sábado/domingo',
    maxes: { entrantes: 3, principales: 4, acompanamientos: 3, postres: 2, bebidas: 2 },
  },
  {
    id: 'mothers-day',
    label: 'Día de la Madre',
    occasion: 'Día de la Madre',
    price: 29.9,
    hint: 'Especial celebración familiar',
    maxes: { entrantes: 3, principales: 4, acompanamientos: 3, postres: 3, bebidas: 2 },
  },
  {
    id: 'christmas',
    label: 'Menú Navidad',
    occasion: 'Navidad',
    price: 39.9,
    hint: 'Menú festivo ampliado',
    maxes: { entrantes: 4, principales: 5, acompanamientos: 3, postres: 3, bebidas: 2 },
  },
  {
    id: 'valentine',
    label: 'San Valentín',
    occasion: 'San Valentín',
    price: 34.9,
    hint: 'Menú para dos',
    maxes: { entrantes: 2, principales: 3, acompanamientos: 2, postres: 2, bebidas: 2 },
  },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function sectionsFromTemplate(templateId: MenuTemplateId): MenuSection[] {
  const template = MENU_TEMPLATES.find((t) => t.id === templateId) ?? MENU_TEMPLATES[0]
  return MENU_SECTION_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    maxItems: template.maxes[def.key] ?? def.defaultMax,
    productIds: [],
  }))
}

function defaultInventory(): Record<string, InventoryItem> {
  const map: Record<string, InventoryItem> = {}
  for (const item of cartaItems) {
    map[item.id] = {
      productId: item.id,
      stock: 20,
      unit: 'raciones',
      minStock: 5,
      track: true,
    }
  }
  return map
}

function loadDb(): PersistedDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { overrides: {}, inventory: defaultInventory(), menus: [] }
    }
    const parsed = JSON.parse(raw) as PersistedDb
    return {
      overrides: parsed.overrides ?? {},
      inventory: { ...defaultInventory(), ...(parsed.inventory ?? {}) },
      menus: Array.isArray(parsed.menus) ? parsed.menus : [],
    }
  } catch {
    return { overrides: {}, inventory: defaultInventory(), menus: [] }
  }
}

function mergeItems(overrides: Record<string, CartaOverrides>): CartaItemEnriched[] {
  return cartaItems.map((base) => {
    const patch = overrides[base.id]
    const merged: CartaItem = {
      ...base,
      ...patch,
      ingredients: patch?.ingredients ?? base.ingredients,
      offer: patch?.offer === undefined ? (base.offer ?? null) : patch.offer,
      available: patch?.available ?? base.available ?? true,
      imageUrl: patch?.imageUrl ?? base.imageUrl ?? '',
    }
    return { ...merged, diet: enrichDiet(merged) }
  })
}

export function CartaStoreProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, CartaOverrides>>({})
  const [inventory, setInventoryState] = useState<Record<string, InventoryItem>>({})
  const [menus, setMenus] = useState<DailyMenu[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const db = loadDb()
    setOverrides(db.overrides)
    setInventoryState(db.inventory)
    setMenus(db.menus)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      const payload: PersistedDb = { overrides, inventory, menus }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [overrides, inventory, menus, ready])

  const items = useMemo(() => mergeItems(overrides), [overrides])

  const updateItem = useCallback((id: string, patch: CartaOverrides) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  }, [])

  const setOffer = useCallback((id: string, offer: CartaOffer | null) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], offer } }))
  }, [])

  const resetItem = useCallback((id: string) => {
    setOverrides((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const resetAllProducts = useCallback(() => setOverrides({}), [])

  const setInventory = useCallback((productId: string, patch: Partial<InventoryItem>) => {
    setInventoryState((current) => ({
      ...current,
      [productId]: {
        productId,
        stock: current[productId]?.stock ?? 0,
        unit: current[productId]?.unit ?? 'raciones',
        minStock: current[productId]?.minStock ?? 5,
        track: current[productId]?.track ?? true,
        ...patch,
      },
    }))
  }, [])

  const bumpStock = useCallback((productId: string, delta: number) => {
    setInventoryState((current) => {
      const prev = current[productId] ?? {
        productId,
        stock: 0,
        unit: 'raciones' as const,
        minStock: 5,
        track: true,
      }
      return {
        ...current,
        [productId]: { ...prev, stock: Math.max(0, prev.stock + delta) },
      }
    })
  }, [])

  const createMenuFromTemplate = useCallback((templateId: MenuTemplateId, title?: string) => {
    const template = MENU_TEMPLATES.find((t) => t.id === templateId) ?? MENU_TEMPLATES[0]
    const id = uid('menu')
    const menu: DailyMenu = {
      id,
      title: title || template.label,
      occasion: template.occasion,
      templateId,
      date: todayISO(),
      price: template.price,
      notes: '',
      published: false,
      sections: sectionsFromTemplate(templateId),
      updatedAt: new Date().toISOString(),
    }
    setMenus((current) => [menu, ...current])
    return id
  }, [])

  const updateMenu = useCallback((id: string, patch: Partial<DailyMenu>) => {
    setMenus((current) =>
      current.map((menu) =>
        menu.id === id ? { ...menu, ...patch, updatedAt: new Date().toISOString() } : menu,
      ),
    )
  }, [])

  const setMenuSectionProducts = useCallback(
    (menuId: string, sectionKey: MenuSectionKey, productIds: string[]) => {
      setMenus((current) =>
        current.map((menu) => {
          if (menu.id !== menuId) return menu
          return {
            ...menu,
            updatedAt: new Date().toISOString(),
            sections: menu.sections.map((section) =>
              section.key === sectionKey
                ? { ...section, productIds: productIds.slice(0, section.maxItems) }
                : section,
            ),
          }
        }),
      )
    },
    [],
  )

  const setMenuSectionMax = useCallback(
    (menuId: string, sectionKey: MenuSectionKey, maxItems: number) => {
      const safe = Math.max(0, Math.min(12, maxItems))
      setMenus((current) =>
        current.map((menu) => {
          if (menu.id !== menuId) return menu
          return {
            ...menu,
            updatedAt: new Date().toISOString(),
            sections: menu.sections.map((section) =>
              section.key === sectionKey
                ? {
                    ...section,
                    maxItems: safe,
                    productIds: section.productIds.slice(0, safe),
                  }
                : section,
            ),
          }
        }),
      )
    },
    [],
  )

  const deleteMenu = useCallback((id: string) => {
    setMenus((current) => current.filter((menu) => menu.id !== id))
  }, [])

  const duplicateMenu = useCallback((id: string) => {
    const nextId = uid('menu')
    setMenus((current) => {
      const source = current.find((menu) => menu.id === id)
      if (!source) return current
      const copy: DailyMenu = {
        ...source,
        id: nextId,
        title: `${source.title} (copia)`,
        published: false,
        date: todayISO(),
        updatedAt: new Date().toISOString(),
        sections: source.sections.map((section) => ({
          ...section,
          productIds: [...section.productIds],
        })),
      }
      return [copy, ...current]
    })
    return nextId
  }, [])

  const markPublished = useCallback((id: string, published = true) => {
    setMenus((current) =>
      current.map((menu) =>
        menu.id === id
          ? { ...menu, published, updatedAt: new Date().toISOString() }
          : menu,
      ),
    )
  }, [])

  const value = useMemo(
    () => ({
      items,
      inventory,
      menus,
      updateItem,
      setOffer,
      resetItem,
      resetAllProducts,
      setInventory,
      bumpStock,
      createMenuFromTemplate,
      updateMenu,
      setMenuSectionProducts,
      setMenuSectionMax,
      deleteMenu,
      duplicateMenu,
      markPublished,
    }),
    [
      items,
      inventory,
      menus,
      updateItem,
      setOffer,
      resetItem,
      resetAllProducts,
      setInventory,
      bumpStock,
      createMenuFromTemplate,
      updateMenu,
      setMenuSectionProducts,
      setMenuSectionMax,
      deleteMenu,
      duplicateMenu,
      markPublished,
    ],
  )

  return <CartaStoreContext.Provider value={value}>{children}</CartaStoreContext.Provider>
}

export function useCartaStore() {
  const ctx = useContext(CartaStoreContext)
  if (!ctx) throw new Error('useCartaStore must be used within CartaStoreProvider')
  return ctx
}

export function buildMenuShareText(
  menu: DailyMenu,
  products: CartaItemEnriched[],
): string {
  const byId = new Map(products.map((p) => [p.id, p]))
  const lines = [
    `🍽️ ${menu.title}`,
    menu.occasion ? `✨ ${menu.occasion}` : '',
    menu.date ? `📅 ${menu.date}` : '',
    menu.price > 0 ? `💶 ${menu.price.toFixed(2)} €` : '',
    '',
  ].filter(Boolean)

  for (const section of menu.sections) {
    if (section.productIds.length === 0) continue
    lines.push(`— ${section.label} —`)
    for (const id of section.productIds) {
      const product = byId.get(id)
      if (!product) continue
      lines.push(`• ${product.name}`)
    }
    lines.push('')
  }

  if (menu.notes.trim()) {
    lines.push(menu.notes.trim(), '')
  }

  lines.push('India Gate — Tres Hermanos Boadilla', 'Reserva y consulta disponibilidad.')
  return lines.join('\n')
}
