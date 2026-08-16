// Test wardrobes. Deterministic on purpose: no randomness, no clock.

import type { Category, ColorFamily, Garment, Occasion, Pattern, Season } from './types'

let counter = 0

export function garment(over: Partial<Garment> = {}): Garment {
  counter += 1
  return {
    id: `g${counter}`,
    category: 'top',
    subtype: 'shirt',
    imageUrl: '',
    primaryColor: 'white',
    pattern: 'solid',
    formality: 3,
    occasions: ['office', 'daily-casual'],
    seasons: ['all-year'],
    favorite: false,
    active: true,
    rainSafe: true,
    timesWorn: 0,
    lastWorn: null,
    ...over,
  }
}

export function resetIds() {
  counter = 0
}

// A small, hand-checked wardrobe. Every piece here exists to exercise a
// specific branch of the cascade, so the assertions can name what they mean.
export function smallWardrobe(): Garment[] {
  resetIds()
  return [
    // Tops
    garment({ id: 'top-white', primaryColor: 'white', formality: 3 }),
    garment({ id: 'top-navy', primaryColor: 'navy', formality: 3 }),
    garment({ id: 'top-striped', primaryColor: 'white', pattern: 'stripes', formality: 3 }),
    garment({ id: 'top-print', primaryColor: 'green', pattern: 'print', formality: 2 }),
    garment({ id: 'top-tee', primaryColor: 'gray', formality: 1, occasions: ['home', 'sport'] }),

    // Bottoms
    garment({ id: 'bottom-gray', category: 'bottom', primaryColor: 'gray', formality: 3 }),
    garment({ id: 'bottom-jeans', category: 'bottom', primaryColor: 'blue', formality: 2 }),
    garment({
      id: 'bottom-checks',
      category: 'bottom',
      primaryColor: 'beige',
      pattern: 'checks',
      formality: 3,
    }),
    garment({
      id: 'bottom-shorts',
      category: 'bottom',
      primaryColor: 'beige',
      formality: 1,
      occasions: ['home', 'sport'],
      seasons: ['hot'],
    }),

    // Shoes
    garment({ id: 'shoes-black', category: 'shoes', primaryColor: 'black', formality: 4 }),
    garment({ id: 'shoes-brown', category: 'shoes', primaryColor: 'brown', formality: 3 }),
    garment({
      id: 'shoes-sneakers',
      category: 'shoes',
      primaryColor: 'white',
      formality: 2,
      rainSafe: false,
    }),

    // Outerwear
    garment({ id: 'coat-navy', category: 'outerwear', primaryColor: 'navy', formality: 3 }),

    // Accessories
    garment({ id: 'belt-brown', category: 'accessory', primaryColor: 'brown', formality: 3 }),
    garment({ id: 'watch', category: 'accessory', primaryColor: 'black', formality: 5 }),
  ]
}

const COLORS: ColorFamily[] = ['white', 'gray', 'navy', 'beige', 'black', 'blue', 'green', 'wine']
const PATTERNS: Pattern[] = ['solid', 'solid', 'solid', 'stripes', 'textured']
const OCCASION_SETS: Occasion[][] = [
  ['office', 'client-meeting', 'daily-casual'],
  ['office', 'daily-casual'],
  ['daily-casual', 'night-out'],
  ['office', 'daily-casual', 'night-out'],
]
const SEASON_SETS: Season[][] = [['all-year'], ['all-year'], ['hot'], ['cool'], ['all-year']]

// The wardrobe the acceptance criterion talks about: 15 tops, 8 bottoms,
// 5 pairs of shoes. Built by cycling fixed lists so the result is identical
// on every run.
export function wardrobe(tops = 15, bottoms = 8, shoes = 5): Garment[] {
  resetIds()
  const out: Garment[] = []

  const build = (category: Category, n: number, prefix: string) => {
    for (let i = 0; i < n; i++) {
      out.push(
        garment({
          id: `${prefix}${i}`,
          category,
          primaryColor: COLORS[i % COLORS.length],
          pattern: PATTERNS[i % PATTERNS.length],
          formality: ((i % 3) + 2) as Garment['formality'],
          occasions: OCCASION_SETS[i % OCCASION_SETS.length],
          seasons: SEASON_SETS[i % SEASON_SETS.length],
          favorite: i % 5 === 0,
          rainSafe: i % 3 !== 0,
        }),
      )
    }
  }

  build('top', tops, 't')
  build('bottom', bottoms, 'b')
  build('shoes', shoes, 's')
  return out
}
