// Virtual wardrobe — domain taxonomy
// Everything the rule engine needs to know about a garment.

export type Category =
  | 'top' // shirt, tee, polo, blouse
  | 'bottom' // trousers, jeans, shorts, skirt
  | 'onepiece' // dress, jumpsuit, overalls
  | 'shoes'
  | 'outerwear' // blazer, jacket, sweater, coat
  | 'accessory' // belt, watch, cap, scarf

// 1 = very casual (beach, gym) … 5 = black tie (full suit)
export type Formality = 1 | 2 | 3 | 4 | 5

export type Occasion =
  | 'office'
  | 'client-meeting'
  | 'night-out'
  | 'daily-casual'
  | 'sport'
  | 'home'
  | 'formal-event'

export type Pattern = 'solid' | 'stripes' | 'checks' | 'print' | 'textured'

export type Season = 'hot' | 'rain' | 'cool' | 'all-year'

export const ALL_SEASONS: readonly Season[] = ['hot', 'rain', 'cool', 'all-year'] as const

export type ColorFamily =
  // neutrals
  | 'black'
  | 'white'
  | 'gray'
  | 'beige'
  | 'navy'
  // saturated
  | 'blue'
  | 'lightblue'
  | 'green'
  | 'red'
  | 'wine'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'brown'

export const NEUTRALS: ReadonlySet<ColorFamily> = new Set([
  'black',
  'white',
  'gray',
  'beige',
  'navy',
] as const)

// Pairs that clash visually. The relation is symmetric: normalized by sorting.
export const CLASHES: ReadonlyArray<[ColorFamily, ColorFamily]> = [
  ['black', 'navy'],
  ['brown', 'black'],
  ['red', 'pink'],
  ['orange', 'red'],
  ['green', 'red'],
  ['purple', 'brown'],
]

export interface Garment {
  id: string
  category: Category
  subtype: string // 'long sleeve shirt', 'loafer', free text
  imageUrl: string
  cutoutUrl?: string // background removed, for the collage

  primaryColor: ColorFamily
  secondaryColor?: ColorFamily
  pattern: Pattern
  material?: string

  formality: Formality
  occasions: Occasion[]
  seasons: Season[]

  favorite: boolean
  active: boolean // false = stored away, lent out, in the wash
  rainSafe: boolean // suede and canvas → false

  timesWorn: number
  lastWorn: string | null // ISO date
}

export interface Outfit {
  id: string // deterministic hash of the sorted ids
  garmentIds: string[]
  formality: Formality // taken from the outfit's top
  occasions: Occasion[] // intersection across the pieces
  seasons: Season[]
  score: number
  renderUrl?: string // only filled in once the try-on has been paid for
  timesWorn: number
  lastWorn: string | null
}

export interface Context {
  occasion: Occasion
  season: Season
  rain: boolean
}
