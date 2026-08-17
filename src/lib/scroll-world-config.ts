import { publicUrl } from './public-url'

export type ScrollClip = {
  id: string
  src: string
  mobileSrc: string
  poster: string
  weight: number
  kind: 'dive' | 'connector'
}

export type StoryScene = {
  id: string
  index: string
  eyebrow: string
  title: string
  body: string
  note: string
  align: 'left' | 'right'
  start: number
  end: number
  cta?: boolean
}

export type FeastDish = {
  id: string
  src: string
  alt: string
  /** Lane offset: -1 left, 0 center, 1 right */
  lane: -1 | 0 | 1
  /** Progress window where this dish is the hero (0–1 global) */
  start: number
  end: number
}

export const scrollWorldConfig = {
  scrollHeightVh: 760,
  smoothing: 0.052,
  seekEpsilon: 1 / 30,
  crossfade: 0.28,
  scrub: 1.55,
  /** Logo stays in foreground, zooms, then fades before food journey continues */
  brandIntroEnd: 0.16,
  /** Feast path 3D becomes dominant after this progress */
  feastPathStart: 0.14,
  clips: [
    {
      id: 'brand',
      src: publicUrl('/scroll-world/video/dive-00.mp4'),
      mobileSrc: publicUrl('/scroll-world/video/dive-00-m.mp4'),
      poster: publicUrl('/scroll-world/stills/poster-dive-00.png'),
      weight: 1.5,
      kind: 'dive',
    },
    {
      id: 'biryani',
      src: publicUrl('/scroll-world/video/dive-feast-biryani.mp4'),
      mobileSrc: publicUrl('/scroll-world/video/dive-feast-biryani-m.mp4'),
      poster: publicUrl('/scroll-world/stills/poster-dive-feast-biryani.png'),
      weight: 1.25,
      kind: 'dive',
    },
    {
      id: 'sizzler',
      src: publicUrl('/scroll-world/video/dive-feast-sizzler.mp4'),
      mobileSrc: publicUrl('/scroll-world/video/dive-feast-sizzler-m.mp4'),
      poster: publicUrl('/scroll-world/stills/poster-dive-feast-sizzler.png'),
      weight: 1.35,
      kind: 'dive',
    },
    {
      id: 'firma',
      src: publicUrl('/scroll-world/video/dive-feast-firma.mp4'),
      mobileSrc: publicUrl('/scroll-world/video/dive-feast-firma-m.mp4'),
      poster: publicUrl('/scroll-world/stills/poster-dive-feast-firma.png'),
      weight: 1.4,
      kind: 'dive',
    },
  ] satisfies ScrollClip[],
  feastDishes: [
    {
      id: 'samosas',
      src: publicUrl('/scroll-world/stills/feast/01-samosas.png'),
      alt: 'Samosas crujientes',
      lane: -1,
      start: 0.16,
      end: 0.3,
    },
    {
      id: 'biryani',
      src: publicUrl('/scroll-world/stills/feast/02-biryani.png'),
      alt: 'Biryani de la casa',
      lane: 1,
      start: 0.26,
      end: 0.42,
    },
    {
      id: 'sizzler',
      src: publicUrl('/scroll-world/stills/feast/03-sizzler.png'),
      alt: 'Sizzler al carbón',
      lane: 0,
      start: 0.38,
      end: 0.54,
    },
    {
      id: 'curry-rojo',
      src: publicUrl('/scroll-world/stills/feast/04-curry-rojo.png'),
      alt: 'Masala de la olla',
      lane: -1,
      start: 0.5,
      end: 0.66,
    },
    {
      id: 'naan',
      src: publicUrl('/scroll-world/stills/feast/05-naan.png'),
      alt: 'Naan del tandoor',
      lane: 1,
      start: 0.62,
      end: 0.78,
    },
    {
      id: 'firma',
      src: publicUrl('/scroll-world/stills/feast/06-curry-firma.png'),
      alt: 'El plato para recordar',
      lane: 0,
      start: 0.74,
      end: 0.96,
    },
  ] satisfies FeastDish[],
  scenes: [
    {
      id: 'arrival',
      index: '01',
      eyebrow: 'Bienvenida',
      title: 'India Gate',
      body: 'Desliza: el logo se acerca y comienza el camino de sabores.',
      note: 'Desliza hacia los platos',
      align: 'left',
      start: 0,
      end: 0.15,
    },
    {
      id: 'samosas',
      index: '02',
      eyebrow: 'Entrantes',
      title: 'Samosas crujientes',
      body: 'Masa dorada, vapor de especias y el primer saludo de la mesa.',
      note: 'Sigue el camino',
      align: 'right',
      start: 0.16,
      end: 0.3,
    },
    {
      id: 'biryani',
      index: '03',
      eyebrow: 'Arroces',
      title: 'Biryani de la casa',
      body: 'Arroz perfumado, cobre caliente y hierbas frescas sobre la mesa.',
      note: 'Continúa al tandoor',
      align: 'left',
      start: 0.28,
      end: 0.42,
    },
    {
      id: 'sizzler',
      index: '04',
      eyebrow: 'Tandoor',
      title: 'Sizzler al carbón',
      body: 'Fuego contenido, pimientos y limón: el plato que abre el apetito.',
      note: 'Baja hacia los curries',
      align: 'right',
      start: 0.4,
      end: 0.54,
    },
    {
      id: 'curry-rojo',
      index: '05',
      eyebrow: 'Curries',
      title: 'Masala de la olla',
      body: 'Salsa brillante, cilantro y el calor lento de la cocina india.',
      note: 'El pan te espera',
      align: 'left',
      start: 0.52,
      end: 0.66,
    },
    {
      id: 'naan',
      index: '06',
      eyebrow: 'Panes',
      title: 'Naan del tandoor',
      body: 'Bordes tostados, miga suave: el compañero perfecto de cada salsa.',
      note: 'Último plato del camino',
      align: 'right',
      start: 0.64,
      end: 0.78,
    },
    {
      id: 'firma',
      index: '07',
      eyebrow: 'Firma',
      title: 'El plato para recordar',
      body: 'Cuchara lista, aroma denso y el cierre del viaje por la mesa.',
      note: 'Fin del camino',
      align: 'left',
      start: 0.76,
      end: 1,
      cta: true,
    },
  ] satisfies StoryScene[],
} as const
