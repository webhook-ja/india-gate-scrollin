import type { CartaItem } from '../data/carta'

export type DietTag =
  | 'vegan'
  | 'vegetarian'
  | 'glutenFree'
  | 'dairyFree'
  | 'nutFree'
  | 'eggFree'
  | 'halal'

export type Allergen =
  | 'gluten'
  | 'lactose'
  | 'egg'
  | 'nuts'
  | 'shellfish'
  | 'fish'
  | 'soy'
  | 'sesame'

export type DietMeta = {
  tags: DietTag[]
  allergens: Allergen[]
  containsPork: boolean
  containsMeat: boolean
  containsSeafood: boolean
  confidence: 'inferred'
}

export type CartaItemEnriched = CartaItem & { diet: DietMeta }

const includesAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word))

export const DIET_FILTERS: {
  id: DietTag
  label: string
  short: string
  hint: string
}[] = [
  {
    id: 'vegan',
    label: 'Vegano',
    short: 'Vegano',
    hint: 'Sin carne, pescado, lácteos ni huevo',
  },
  {
    id: 'vegetarian',
    label: 'Vegetariano',
    short: 'Veggie',
    hint: 'Sin carne ni pescado (puede llevar lácteos)',
  },
  {
    id: 'glutenFree',
    label: 'Sin gluten / celíaco',
    short: 'Sin gluten',
    hint: 'Sin trigo ni masas típicas; confirma en cocina',
  },
  {
    id: 'dairyFree',
    label: 'Sin lácteos',
    short: 'Sin lácteos',
    hint: 'Sin yogur, crema, queso, mantequilla o leche',
  },
  {
    id: 'nutFree',
    label: 'Sin frutos secos',
    short: 'Sin frutos secos',
    hint: 'Sin almendras, pistacho u otros frutos secos',
  },
  {
    id: 'eggFree',
    label: 'Sin huevo',
    short: 'Sin huevo',
    hint: 'Sin huevo en la receta base',
  },
  {
    id: 'halal',
    label: 'Apto Halal',
    short: 'Halal',
    hint: 'Sin cerdo; verifica procedencia en el local',
  },
]

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  lactose: 'Lácteos',
  egg: 'Huevo',
  nuts: 'Frutos secos',
  shellfish: 'Crustáceos',
  fish: 'Pescado',
  soy: 'Soja',
  sesame: 'Sésamo',
}

const ALLERGEN_PATTERNS: { id: Allergen; patterns: RegExp[] }[] = [
  {
    id: 'gluten',
    patterns: [
      /\bgluten\b/i,
      /\bcel[ií]ac/i,
      /\bsin\s+gluten\b/i,
      /\bwheat\b/i,
      /\btrigo\b/i,
      /\bharina\b/i,
    ],
  },
  {
    id: 'lactose',
    patterns: [
      /\bl[aá]cteos?\b/i,
      /\blactosa\b/i,
      /\bintolerancia\s+(a\s+)?(la\s+)?lactosa\b/i,
      /\balergia\s+(a\s+)?(los\s+)?l[aá]cteos?\b/i,
      /\bleche\b/i,
      /\bqueso\b/i,
      /\byogur\b/i,
      /\bcrema\b/i,
      /\bmantequilla\b/i,
      /\bdairy\b/i,
      /\bmilk\b/i,
    ],
  },
  {
    id: 'egg',
    patterns: [/\bhuevos?\b/i, /\beggs?\b/i],
  },
  {
    id: 'nuts',
    patterns: [
      /\bfrutos?\s+secos?\b/i,
      /\balmendr/i,
      /\bpistacho/i,
      /\banacardo/i,
      /\bnuez\b/i,
      /\bnueces\b/i,
      /\bnuts?\b/i,
      /\bcacahuete/i,
      /\bpeanut/i,
    ],
  },
  {
    id: 'shellfish',
    patterns: [
      /\bmarisco/i,
      /\bcrust[aá]ceo/i,
      /\bgambas?\b/i,
      /\blangostino/i,
      /\bshellfish\b/i,
      /\bprawn/i,
      /\bshrimp\b/i,
    ],
  },
  {
    id: 'fish',
    patterns: [/\bpescado\b/i, /\bfish\b/i],
  },
  {
    id: 'soy',
    patterns: [/\bsoja\b/i, /\bsoy\b/i, /\bsoya\b/i],
  },
  {
    id: 'sesame',
    patterns: [/\bs[eé]samo\b/i, /\bsesame\b/i],
  },
]

/** Detect allergens mentioned in free text (notes, allergy field, WhatsApp, etc.). */
export function detectAllergensFromText(text: string): Allergen[] {
  const raw = text.trim()
  if (!raw) return []
  const found = new Set<Allergen>()
  for (const { id, patterns } of ALLERGEN_PATTERNS) {
    if (patterns.some((re) => re.test(raw))) found.add(id)
  }
  return Array.from(found)
}

export function mergeAllergens(...lists: Allergen[][]): Allergen[] {
  return Array.from(new Set(lists.flat()))
}

export function dishAllergenConflict(
  dishAllergens: Allergen[],
  guestAllergens: Allergen[],
): Allergen[] {
  if (guestAllergens.length === 0) return []
  return dishAllergens.filter((a) => guestAllergens.includes(a))
}

/** Merge saved allergens with anything found in free-text notes. */
export function resolveGuestAllergens(
  saved: Allergen[] | undefined,
  ...texts: Array<string | undefined>
): Allergen[] {
  return mergeAllergens(saved ?? [], ...texts.map((t) => detectAllergensFromText(t ?? '')))
}

export function enrichDiet(item: CartaItem): DietMeta {
  const blob = `${item.name} ${item.category} ${item.ingredients.join(' ')}`.toLowerCase()

  const containsPork = includesAny(blob, ['cerdo', 'pork'])
  const containsSeafood = includesAny(blob, [
    'gamba',
    'gambas',
    'langostino',
    'langostinos',
    'prawn',
    'jheenga',
    'marisco',
  ])
  const containsMeat =
    containsPork ||
    includesAny(blob, [
      'pollo',
      'pechuga',
      'pechugas',
      'alitas',
      'cordero',
      'lamb',
      'ternera',
      'beef',
      'chicken',
      'carne',
      'kabab',
      'sheek',
      'mixed grill',
      'special mix',
    ])

  const hasDairy = includesAny(blob, [
    'yogur',
    'yogurt',
    'crema',
    'queso',
    'paneer',
    'mantequilla',
    'butter',
    'leche',
    'malai',
    'lassi',
    'cheesecake',
    'gulfi',
    'kulfi',
    'dahi',
  ])

  const hasEgg = includesAny(blob, ['huevo', 'egg'])
  const hasNuts = includesAny(blob, [
    'frutos secos',
    'pistacho',
    'almendra',
    'almendras',
    'nueces',
    'anacardo',
    'anacardos',
    'peswari',
  ])

  const hasGluten =
    includesAny(blob, [
      'naan',
      'chapati',
      'chapati',
      'roty',
      'roti',
      'porota',
      'empanada',
      'samusa',
      'samosa',
      'cutlets',
      'trigo',
      'harina de trigo',
    ]) || item.category.startsWith('NAAN')

  const glutenFree = !hasGluten

  const allergens: Allergen[] = []
  if (hasGluten) allergens.push('gluten')
  if (hasDairy) allergens.push('lactose')
  if (hasEgg) allergens.push('egg')
  if (hasNuts) allergens.push('nuts')
  if (containsSeafood) allergens.push('shellfish')
  if (includesAny(blob, ['pescado', 'fish']) && !containsSeafood) allergens.push('fish')
  if (includesAny(blob, ['soja', 'soy', 'soya'])) allergens.push('soy')
  if (includesAny(blob, ['sésamo', 'sesamo', 'sesame'])) allergens.push('sesame')

  const vegetarian = !containsMeat && !containsSeafood
  const vegan = vegetarian && !hasDairy && !hasEgg
  const dairyFree = !hasDairy
  const nutFree = !hasNuts
  const eggFree = !hasEgg
  const gf = glutenFree && !hasGluten
  const halal = !containsPork

  const tags: DietTag[] = []
  if (vegan) tags.push('vegan')
  if (vegetarian) tags.push('vegetarian')
  if (gf) tags.push('glutenFree')
  if (dairyFree) tags.push('dairyFree')
  if (nutFree) tags.push('nutFree')
  if (eggFree) tags.push('eggFree')
  if (halal) tags.push('halal')

  return {
    tags,
    allergens,
    containsPork,
    containsMeat,
    containsSeafood,
    confidence: 'inferred',
  }
}

export function withDiet(items: CartaItem[]): CartaItemEnriched[] {
  return items.map((item) => ({ ...item, diet: enrichDiet(item) }))
}
