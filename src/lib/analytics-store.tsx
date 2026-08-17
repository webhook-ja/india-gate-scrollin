import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { demoAnalyticsState } from './demo-data'
import { USE_DEMO_ANALYTICS } from './demo-flags'

const STORAGE_KEY = 'india-gate-analytics:v1'

export type DishStats = {
  orders: number
  views: number
  lastOrderedAt?: string
}

export type AnalyticsState = {
  dishes: Record<string, DishStats>
  /** YYYY-MM-DD → reservation-like service covers counted when stock sold */
  dailyOrders: Record<string, number>
}

type AnalyticsStore = {
  ready: boolean
  dishes: Record<string, DishStats>
  dailyOrders: Record<string, number>
  recordOrder: (productId: string, qty?: number) => void
  recordView: (productId: string) => void
  resetAnalytics: () => void
  topOrdered: (limit?: number) => Array<{ id: string; orders: number; views: number }>
  topViewed: (limit?: number) => Array<{ id: string; orders: number; views: number }>
}

const Ctx = createContext<AnalyticsStore | null>(null)

const emptyState = (): AnalyticsState => ({ dishes: {}, dailyOrders: {} })

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): AnalyticsState {
  if (USE_DEMO_ANALYTICS) return demoAnalyticsState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as AnalyticsState
    const loaded = {
      dishes: parsed.dishes ?? {},
      dailyOrders: parsed.dailyOrders ?? {},
    }
    if (Object.keys(loaded.dishes).length === 0) return emptyState()
    return loaded
  } catch {
    return emptyState()
  }
}

export function AnalyticsStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalyticsState>(() =>
    USE_DEMO_ANALYTICS ? demoAnalyticsState() : emptyState(),
  )
  const [ready, setReady] = useState(USE_DEMO_ANALYTICS)

  useEffect(() => {
    if (USE_DEMO_ANALYTICS) return
    setState(load())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || USE_DEMO_ANALYTICS) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, ready])

  const recordOrder = useCallback((productId: string, qty = 1) => {
    const amount = Math.max(1, qty)
    const day = todayISO()
    setState((current) => {
      const prev = current.dishes[productId] ?? { orders: 0, views: 0 }
      return {
        dishes: {
          ...current.dishes,
          [productId]: {
            ...prev,
            orders: prev.orders + amount,
            lastOrderedAt: new Date().toISOString(),
          },
        },
        dailyOrders: {
          ...current.dailyOrders,
          [day]: (current.dailyOrders[day] ?? 0) + amount,
        },
      }
    })
  }, [])

  const recordView = useCallback((productId: string) => {
    setState((current) => {
      const prev = current.dishes[productId] ?? { orders: 0, views: 0 }
      return {
        ...current,
        dishes: {
          ...current.dishes,
          [productId]: { ...prev, views: prev.views + 1 },
        },
      }
    })
  }, [])

  const resetAnalytics = useCallback(
    () => setState(USE_DEMO_ANALYTICS ? demoAnalyticsState() : emptyState()),
    [],
  )

  const topOrdered = useCallback(
    (limit = 8) =>
      Object.entries(state.dishes)
        .map(([id, stats]) => ({ id, orders: stats.orders, views: stats.views }))
        .filter((row) => row.orders > 0)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, limit),
    [state.dishes],
  )

  const topViewed = useCallback(
    (limit = 8) =>
      Object.entries(state.dishes)
        .map(([id, stats]) => ({ id, orders: stats.orders, views: stats.views }))
        .filter((row) => row.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, limit),
    [state.dishes],
  )

  const value = useMemo(
    () => ({
      ready,
      dishes: state.dishes,
      dailyOrders: state.dailyOrders,
      recordOrder,
      recordView,
      resetAnalytics,
      topOrdered,
      topViewed,
    }),
    [
      ready,
      state.dishes,
      state.dailyOrders,
      recordOrder,
      recordView,
      resetAnalytics,
      topOrdered,
      topViewed,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAnalytics() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsStoreProvider')
  return ctx
}
