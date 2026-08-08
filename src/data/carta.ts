export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'none-labeled'

export type CartaOffer = {
  label: string
  price: number
  active: boolean
}

export type CartaItem = {
  id: string
  category: string
  name: string
  ingredients: string[]
  price: number
  spice: SpiceLevel
  spiceLabel: string
  imageUrl?: string
  offer?: CartaOffer | null
  available?: boolean
}


export type CartaCategory = {
  id: string
  label: string
  note?: string
}

const spiceFrom = (raw: string): { spice: SpiceLevel; spiceLabel: string } => {
  const t = raw.trim()
  if (!t || t === '-') return { spice: 'none', spiceLabel: '' }
  const lower = t.toLowerCase()
  if (lower.includes('muy')) return { spice: 'hot', spiceLabel: t }
  if (lower.includes('medio')) return { spice: 'medium', spiceLabel: t }
  if (lower.includes('poco')) return { spice: 'mild', spiceLabel: t }
  if (lower.includes('no picante')) return { spice: 'none-labeled', spiceLabel: t }
  return { spice: 'none', spiceLabel: t }
}

const parseIngredients = (raw: string): string[] => {
  const t = raw.trim()
  if (!t || t === '-') return []
  return t
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

type RawRow = [category: string, name: string, ingredients: string, price: number, spice: string]

const RAW: RawRow[] = [
  ['ENTRADAS', 'ENSALADA DE LA CASA', '-', 7.5, '-'],
  ['ENTRADAS', 'RAITA', 'Yogur, pepino, cebolla, tomate', 4.9, '-'],
  ['ENTRADAS', 'VERDURAS PAKORAS', 'Verduras variadas rebozado con harina de garbanzos', 8.5, '-'],
  ['ENTRADAS', 'EMPANADA DE LA INDIA (SAMUSA) 3 und', 'Patatas, guisantes, pollo, especias', 7.5, '-'],
  ['ENTRADAS', 'CUTLETS', 'Patatas, pollo, especias', 7.5, '-'],
  ['ENTRADAS', 'BERENJENAS PAKORAS', 'Berenjena rebozados con harina de garbanzos', 7.5, '-'],
  ['ENTRADAS', 'DAL VADA', 'Lentejas, jengibre, cebolla, ajo', 7.5, '-'],
  ['ENTRADAS', 'CEBOLLA BAJI', 'Cebolla rebozado con harina de garbanzos', 7.8, '-'],
  ['ENTRADAS', 'ALITAS DE POLLO', 'Alitas de pollo con especias', 7.8, '-'],
  ['ENTRADAS', 'POLLO PAKORA', 'Pechugas de pollo rebozado con harina de garbanzos', 7.9, '-'],
  ['ENTRADAS', 'PATATAS PAKORA', '-', 6.5, '-'],
  ['ENTRADAS', 'SOPA DE POLLO', '-', 8.5, '-'],
  ['ENTRADAS', 'ENTRADAS VARIADAS', '-', 12.5, '-'],
  ['VERDURAS (incluye arroz)', 'VERDURAS KORMA', 'Verduras variadas, salsa de cebolla, crema, pasas, coco', 11.9, '-'],
  ['VERDURAS (incluye arroz)', 'CHANA MASALA', 'Garbanzos, salsa de cebolla, tomate, jengibre, especias', 11.5, '-'],
  ['VERDURAS (incluye arroz)', 'BERENJENA BAJI', 'Berenjena, salsa de cebolla, especias', 11.5, '-'],
  ['VERDURAS (incluye arroz)', 'PALAK PANEER', 'Queso natural, espinacas, salsa, especias', 12.5, '-'],
  ['VERDURAS (incluye arroz)', 'VERDURAS MADRAS', 'Verduras variadas, salsa de cebolla, especias', 11.9, 'Medio picante'],
  ['VERDURAS (incluye arroz)', 'ALOO GOBI', 'Patatas, coliflor, salsa de cebolla, especias', 11.2, '-'],
  ['VERDURAS (incluye arroz)', 'PANEER MASALA', 'Queso natural, salsa de cebolla, especias', 12.3, '-'],
  ['VERDURAS (incluye arroz)', 'ALOO SAAG', 'Patatas, espinacas, salsa de cebolla, especias', 11.2, '-'],
  ['VERDURAS (incluye arroz)', 'DAL THADKA', 'Lentejas, salsa de cebolla, especias', 11.9, '-'],
  ['PLATOS TANDOORI (no picante)', 'TANDOORI CHICKEN', 'Pollo, especias, yogur, limón, pimientos', 13.2, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'CHICKEN TIKKA', 'Pechuga de pollo, especias, yogur, limón, pimientos', 14.2, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'LAMB TIKKA', 'Cordero, especias, limón, pimientos', 18.5, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'SHEEK KABAB', 'Pollo, especias, ajo, limón', 14.9, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'KING PRAWN', 'Langostinos, especias, yogur, limón', 18.0, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'TANDOORI ESPECIAL MIXED GRILL', 'Pollo tikka, cordero tikka, langostinos', 24.5, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'MUSHROOM TIKKA', 'Champiñón, masala, ajo, jengibre', 11.5, 'No picante'],
  ['PLATOS TANDOORI (no picante)', 'MALAI TIKKA', 'Pollo, yogur, limón, especias', 14.8, 'No picante'],
  ['POLLO (incluye arroz)', 'BUTTER CHICKEN', 'Pollo, salsa de cebolla, mantequilla, especias, crema', 15.9, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN TIKKA MASALA', 'Pollo, salsa de cebolla, crema, garam masala, tomate', 15.9, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN KORMA', 'Pollo, salsa de cebolla, crema, pasas, coco, especias', 15.7, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN CURRY', 'Pollo, salsa de cebolla, especias', 15.9, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN DOPIAZA', 'Pollo, pimientos, tomate, salsa de cebolla, especias', 15.7, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN KADAI', 'Pollo, salsa de cebolla, tomate, especias', 15.9, 'No picante'],
  ['POLLO (incluye arroz)', 'CHICKEN JALFREZI', 'Pollo, pimiento, zanahoria, salsa de cebolla', 15.7, 'Poco picante'],
  ['POLLO (incluye arroz)', 'CHICKEN MADRAS', 'Pollo, salsa de cebolla, ajo, limón, especias', 15.5, 'Medio picante'],
  ['POLLO (incluye arroz)', 'CHICKEN VINDALOO', 'Pollo, salsa de cebolla, especias', 15.5, 'Muy picante'],
  ['POLLO (incluye arroz)', 'CHICKEN PASANDA', 'Pollo, crema, especias', 15.7, '-'],
  ['POLLO (incluye arroz)', 'CHICKEN KASHMIRI', 'Pollo, tomate, jengibre, salsa de cebolla', 15.9, '-'],
  ['POLLO (incluye arroz)', 'CHICKEN SAAG', 'Pollo, espinacas, salsa de cebolla, especias', 15.5, '-'],
  ['POLLO (incluye arroz)', 'CHICKEN ROGHAN JOSH', 'Pollo, jengibre, salsa de cebolla, crema, masala', 15.8, 'Muy picante'],
  ['CERDO (incluye arroz)', 'CERDO CURRY', 'Cerdo, salsa de cebolla, especias', 15.5, 'No picante'],
  ['CERDO (incluye arroz)', 'CERDO DOPIAZA', 'Cerdo, pimientos, tomate, salsa de cebolla', 15.7, 'No picante'],
  ['CERDO (incluye arroz)', 'CERDO KADAI', 'Cerdo, salsa de cebolla, tomate, especias', 15.6, 'No picante'],
  ['CERDO (incluye arroz)', 'CERDO JALFREZI', 'Cerdo, pimiento, zanahoria, salsa de cebolla, crema', 15.7, 'Poco picante'],
  ['CERDO (incluye arroz)', 'CERDO MADRAS', 'Cerdo, salsa de cebolla, ajo, limón, especias', 15.5, 'Medio picante'],
  ['CERDO (incluye arroz)', 'CERDO VINDALOO', 'Cerdo, salsa de cebolla, especias', 15.9, 'Muy picante'],
  ['CERDO (incluye arroz)', 'CERDO SAAG', 'Cerdo, espinacas, salsa de cebolla, especias', 15.5, '-'],
  ['CERDO (incluye arroz)', 'CERDO ROGHAN JOSH', 'Cerdo, jengibre, salsa de cebolla, crema, masala', 15.8, 'Muy picante'],
  ['GAMBA (incluye arroz)', 'GAMBA CURRY', 'Gambas, salsa de cebolla, especias', 16.3, 'No picante'],
  ['GAMBA (incluye arroz)', 'GAMBA DOPIAZA', 'Gambas, pimientos, tomate, salsa de cebolla, especias', 16.1, 'No picante'],
  ['GAMBA (incluye arroz)', 'GAMBA KADAI', 'Gambas, salsa de cebolla, tomate, especias', 16.5, 'No picante'],
  ['GAMBA (incluye arroz)', 'GAMBA JALFREZI', 'Gambas, pimiento, zanahoria, salsa de cebolla', 15.7, 'Poco picante'],
  ['GAMBA (incluye arroz)', 'GAMBA MADRAS', 'Gambas, ajo, tomate, especias', 16.8, 'Medio picante'],
  ['GAMBA (incluye arroz)', 'GAMBA VINDALOO', 'Gambas, salsa de cebolla, especias, jengibre', 16.8, 'Muy picante'],
  ['GAMBA (incluye arroz)', 'GAMBA SAAG', 'Gambas, espinacas, salsa de cebolla, especias', 15.5, '-'],
  ['CORDERO (incluye arroz)', 'LAMB TIKKA MASALA', 'Cordero, salsa de cebolla, crema, tomate, garam masala', 17.5, 'No picante'],
  ['CORDERO (incluye arroz)', 'LAMB CURRY', 'Cordero, salsa de cebolla, especias', 17.7, 'No picante'],
  ['CORDERO (incluye arroz)', 'LAMB DOPIAZA', 'Cordero, pimientos, tomate, salsa de cebolla', 17.5, 'No picante'],
  ['CORDERO (incluye arroz)', 'LAMB KADAI', 'Cordero, salsa de cebolla, tomate, especias', 17.8, '-'],
  ['CORDERO (incluye arroz)', 'LAMB JALFREZI', 'Cordero, pimientos, zanahoria, salsa de cebolla', 17.9, 'Poco picante'],
  ['CORDERO (incluye arroz)', 'LAMB MADRAS', 'Cordero, salsa de cebolla, ajo, limón, especias', 17.8, 'Medio picante'],
  ['CORDERO (incluye arroz)', 'LAMB VINDALOO', 'Cordero, salsa de cebolla, especias', 16.5, 'Muy picante'],
  ['CORDERO (incluye arroz)', 'LAMB SAAG', 'Cordero, salsa de cebolla, espinacas, especias', 17.5, '-'],
  ['CORDERO (incluye arroz)', 'LAMB ROGHAN JOSH', 'Cordero, jengibre, salsa de cebolla, crema, masala', 17.7, 'Muy picante'],
  ['TERNERA (incluye arroz)', 'BEEF CURRY', 'Ternera, salsa de cebolla, especias', 15.7, 'No picante'],
  ['TERNERA (incluye arroz)', 'BEEF DOPIAZA', 'Ternera, pimiento, tomate, salsa de cebolla, especias', 15.6, 'No picante'],
  ['TERNERA (incluye arroz)', 'BEEF KADAI', 'Ternera, salsa de cebolla, tomate, especias', 15.5, 'No picante'],
  ['TERNERA (incluye arroz)', 'BEEF JALFREZI', 'Ternera, pimiento, zanahoria, salsa de cebolla', 15.8, 'Poco picante'],
  ['TERNERA (incluye arroz)', 'BEEF MADRAS', 'Ternera, salsa de cebolla, ajo, limón, especias', 15.7, 'Medio picante'],
  ['TERNERA (incluye arroz)', 'BEEF VINDALOO', 'Ternera, salsa de cebolla, especias', 15.8, 'Muy picante'],
  ['TERNERA (incluye arroz)', 'BEEF SAAG', 'Ternera, salsa de cebolla, espinacas, especias', 15.5, '-'],
  ['ESPECIALIDAD DE LA CASA', 'MANGO CHICKEN', 'Pollo, mango, salsa de cebolla, especias', 16.9, '-'],
  ['ESPECIALIDAD DE LA CASA', 'LAMB DAHIWALA', 'Cordero, yogur, salsa de cebolla, crema, especias', 17.8, '-'],
  ['ESPECIALIDAD DE LA CASA', 'JHEENGA KUMBHWALA', 'Gamba, champiñones, salsa cebolla, especias', 17.5, '-'],
  ['ESPECIALIDAD DE LA CASA', 'INDIA GATE SPECIAL MIX', 'Cordero, ternera, pollo, especias', 16.9, '-'],
  ['NAAN / PAN', 'NAAN DE AJO', '-', 4.5, '-'],
  ['NAAN / PAN', 'NAAN DE CEBOLLA', '-', 4.5, '-'],
  ['NAAN / PAN', 'NAAN DE QUESO', '-', 5.5, '-'],
  ['NAAN / PAN', 'NAAN DE PESWARI', 'Frutos secos', 5.5, '-'],
  ['NAAN / PAN', 'TANDOORI ROTY', 'Naan normal', 3.8, '-'],
  ['NAAN / PAN', 'CHAPATY', '-', 3.5, '-'],
  ['NAAN / PAN', 'PAPPADAM', 'Pan de lentejas crujiente', 1.5, '-'],
  ['NAAN / PAN', 'POROTA', '-', 3.8, '-'],
  ['ARROZ BIRYANI', 'ARROZ BASMATI', '-', 6.5, '-'],
  ['ARROZ BIRYANI', 'FRIED RICE', 'Arroz basmati, huevo, guisantes', 8.9, '-'],
  ['ARROZ BIRYANI', 'CHICKEN BIRIYANI', 'Arroz basmati, pollo, especias', 12.9, '-'],
  ['ARROZ BIRYANI', 'GAMBAS BIRIYANI', 'Arroz basmati, gambas, especias', 15.5, '-'],
  ['ARROZ BIRYANI', 'VEGETAL BIRIYANI', 'Arroz basmati, verduras variadas', 12.5, '-'],
  ['ARROZ BIRYANI', 'TERNERA BIRIYANI', 'Arroz basmati, ternera', 14.5, '-'],
  ['ARROZ BIRYANI', 'CORDERO BIRIYANI', 'Arroz basmati, cordero', 15.5, '-'],
  ['ARROZ BIRYANI', 'KASMIRI PULAO', '-', 8.5, '-'],
  ['POSTRES', 'MANGO GULFI', 'Helado especial de la India', 6.5, '-'],
  ['POSTRES', 'PISTACHO GULFI/KULFI', 'Helado especial de la India, cardamomo', 6.5, '-'],
  ['POSTRES', 'CHEESECAKE', '-', 5.9, '-'],
  ['POSTRES', 'MANGO LAZY', '-', 5.2, '-'],
  ['POSTRES', 'GULAB JAMUN', 'Leche frita en almíbar', 5.2, '-'],
  ['POSTRES', 'ACHAPPAN', 'Galleta crujiente de harina de arroz, leche de coco', 4.5, '-'],
  ['POSTRES', 'HELADOS VARIADOS', '-', 5.5, '-'],
  ['POSTRES', 'MANGO LASSI', 'Batido de mango, yogur natural', 5.2, '-'],
  ['POSTRES', 'TÉ MASALA', '-', 2.9, '-'],
  ['POSTRES', 'CAFÉ DE LA INDIA', '-', 2.5, '-'],
  ['POSTRES', 'CAFÉ', '-', 1.5, '-'],
]

export const cartaItems: CartaItem[] = RAW.map(([category, name, ingredients, price, spice], index) => {
  const spiceInfo = spiceFrom(spice)
  return {
    id: `${slug(name)}-${index}`,
    category,
    name,
    ingredients: parseIngredients(ingredients),
    price,
    spice: spiceInfo.spice,
    spiceLabel: spiceInfo.spiceLabel,
  }
})

export const cartaCategories: CartaCategory[] = [
  { id: 'all', label: 'Toda la carta' },
  ...Array.from(new Set(cartaItems.map((item) => item.category))).map((label) => ({
    id: slug(label),
    label,
    note: label.includes('incluye arroz')
      ? 'Incluye arroz'
      : label.includes('no picante')
        ? 'Sin picante'
        : undefined,
  })),
]

export const formatPrice = (price: number) =>
  price.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
