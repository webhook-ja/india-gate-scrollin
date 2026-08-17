import { cartaItems } from '../data/carta'
import type { AnalyticsState } from './analytics-store'
import type { CartaOverrides, InventoryItem } from './carta-store'

function idByName(name: string) {
  return cartaItems.find((item) => item.name === name)?.id
}

function isoDaysBack(daysAgo: number) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Realistic week of service so the client can see every analytics panel filled. */
export function demoAnalyticsState(): AnalyticsState {
  const rows: Array<[string, number, number]> = [
    ['BUTTER CHICKEN', 54, 132],
    ['CHICKEN TIKKA MASALA', 47, 118],
    ['TANDOORI CHICKEN', 39, 96],
    ['NAAN DE AJO', 61, 84],
    ['EMPANADA DE LA INDIA (SAMUSA) 3 und', 33, 71],
    ['PALAK PANEER', 28, 64],
    ['CHICKEN BIRIYANI', 26, 58],
    ['MANGO CHICKEN', 22, 81],
    ['LAMB TIKKA MASALA', 19, 44],
    ['TANDOORI ESPECIAL MIXED GRILL', 17, 73],
    ['NAAN DE QUESO', 29, 40],
    ['GULAB JAMUN', 24, 37],
    ['CHICKEN TIKKA', 21, 55],
    ['MANGO LASSI', 18, 29],
    ['VERDURAS PAKORAS', 16, 34],
    ['KING PRAWN', 11, 48],
  ]

  const dishes: AnalyticsState['dishes'] = {}
  for (const [name, orders, views] of rows) {
    const id = idByName(name)
    if (!id) continue
    dishes[id] = {
      orders,
      views,
      lastOrderedAt: new Date().toISOString(),
    }
  }

  // Week pattern: quieter midweek, busy weekend
  const week = [41, 38, 46, 49, 67, 82, 74]
  const dailyOrders: Record<string, number> = {}
  week.forEach((count, index) => {
    dailyOrders[isoDaysBack(6 - index)] = count
  })

  return { dishes, dailyOrders }
}

export function applyDemoCartaHealth(
  overrides: Record<string, CartaOverrides>,
  inventory: Record<string, InventoryItem>,
): {
  overrides: Record<string, CartaOverrides>
  inventory: Record<string, InventoryItem>
} {
  const nextOverrides = { ...overrides }
  const nextInventory = { ...inventory }

  const offers: Array<[string, string, number]> = [
    ['BUTTER CHICKEN', 'Menú mediodía', 13.9],
    ['NAAN DE AJO', '2x1 almuerzo', 3.5],
    ['MANGO CHICKEN', 'Especial de la casa', 14.9],
    ['CHICKEN BIRIYANI', 'Oferta biryani', 10.9],
  ]
  for (const [name, label, price] of offers) {
    const id = idByName(name)
    if (!id) continue
    nextOverrides[id] = {
      ...nextOverrides[id],
      offer: { label, price, active: true },
    }
  }

  for (const name of ['CHICKEN VINDALOO', 'CERDO VINDALOO', 'BEEF VINDALOO']) {
    const id = idByName(name)
    if (!id) continue
    nextOverrides[id] = { ...nextOverrides[id], available: false }
  }

  const low: Array<[string, number, number]> = [
    ['TANDOORI CHICKEN', 2, 8],
    ['NAAN DE AJO', 4, 12],
    ['PALAK PANEER', 1, 6],
    ['GULAB JAMUN', 3, 8],
    ['LAMB TIKKA', 0, 5],
    ['KING PRAWN', 2, 6],
  ]
  for (const [name, stock, minStock] of low) {
    const id = idByName(name)
    if (!id) continue
    const prev = nextInventory[id] ?? {
      productId: id,
      stock,
      unit: 'raciones' as const,
      minStock,
      track: true,
    }
    nextInventory[id] = { ...prev, stock, minStock, track: true }
  }

  return { overrides: nextOverrides, inventory: nextInventory }
}
