/** Thermal POS printer config + ESC/POS ticket helpers. */

export type PosConnectionMode = 'browser' | 'usb-serial' | 'network'

export type PosPaperWidth = 58 | 80

export type PosPrinterConfig = {
  enabled: boolean
  /** How to reach the printer */
  mode: PosConnectionMode
  /** LAN/WiFi printer IP (also used by local bridge) */
  host: string
  /** Raw port — almost always 9100 for thermal ESC/POS */
  port: number
  /**
   * Local bridge that can open TCP to the printer (browsers cannot).
   * Default: http://127.0.0.1:17777/print
   */
  bridgeUrl: string
  paperWidth: PosPaperWidth
  copies: number
  autoPrintOnConfirm: boolean
  autoPrintOnArrive: boolean
  restaurantHeader: string
  footer: string
  cutPaper: boolean
  openCashDrawer: boolean
}

export const defaultPosPrinterConfig = (): PosPrinterConfig => ({
  enabled: false,
  mode: 'browser',
  host: '192.168.1.100',
  port: 9100,
  bridgeUrl: 'http://127.0.0.1:17777/print',
  paperWidth: 80,
  copies: 1,
  autoPrintOnConfirm: true,
  autoPrintOnArrive: false,
  restaurantHeader: 'INDIA GATE',
  footer: 'Gracias · Tres Hermanos Boadilla',
  cutPaper: true,
  openCashDrawer: false,
})

export type PosPrintResult =
  | { ok: true; method: PosConnectionMode }
  | { ok: false; error: string }
