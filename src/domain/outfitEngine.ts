// Virtual wardrobe — rule engine
// Generates, filters and ranks outfits without using AI. Runs on the client.

import {
  ALL_SEASONS,
  CLASHES,
  type Context,
  type Formality,
  NEUTRALS,
  type Occasion,
  type Outfit,
  type Garment,
  type Season,
} from './types'

// ── Utilities ────────────────────────────────────────────────

const clashSet = new Set(CLASHES.map(([a, b]) => [a, b].sort().join('|')))

function clash(a: string, b: string): boolean {
  return clashSet.has([a, b].sort().join('|'))
}

function intersect<T>(lists: T[][]): T[] {
  if (lists.length === 0) return []
  return lists.reduce((acc, l) => acc.filter((x) => l.includes(x)))
}

// A garment marked all-year is usable in every season. Expanding it here,
// rather than at each call site, is what keeps the viability rule and the
// outfit's own seasons in agreement — they disagreed before, and outfits that
// passed the rule came out with an empty season list and became unsuggestable.
function seasonsOf(garment: Garment): Season[] {
  return garment.seasons.includes('all-year') ? [...ALL_SEASONS] : garment.seasons
}

// Deterministic: the same set of garments always yields the same id, whatever
// the order. This is what makes the render cache work.
export function outfitId(garmentIds: string[]): string {
  return [...garmentIds].sort().join('_')
}

function byCategory(garments: Garment[], category: string): Garment[] {
  return garments.filter((g) => g.active && g.category === category)
}

// ── Filter cascade ───────────────────────────────────────────
// Ordered cheapest first and by how much each one prunes.
//
// Every rule is monotone: adding a garment can only make an outfit worse,
// never better. That is what licenses the early pruning in generateOutfits.

type Rule = (pieces: Garment[]) => boolean

// 1. Formality: you do not pair sneakers with dress trousers.
//    Accessories are ignored — a watch goes with everything.
const formalityRule: Rule = (pieces) => {
  const levels = pieces.filter((p) => p.category !== 'accessory').map((p) => p.formality)
  if (levels.length === 0) return true
  return Math.max(...levels) - Math.min(...levels) <= 1
}

// 2. Occasion: if there is no context where every piece works, the outfit
//    does not exist.
const occasionRule: Rule = (pieces) => intersect(pieces.map((p) => p.occasions)).length > 0

// 3. Pattern: at most one printed or checked piece. Thin stripes count half,
//    hence the 0.5 weight.
const patternRule: Rule = (pieces) => {
  const weight = pieces.reduce((acc, p) => {
    if (p.pattern === 'solid' || p.pattern === 'textured') return acc
    return acc + (p.pattern === 'stripes' ? 0.5 : 1)
  }, 0)
  return weight <= 1
}

// 4. Color: at most two saturated colors, and no clashing pair.
//
//    Accessories do not count toward the saturated budget — a red watch strap
//    is not a third color — but they DO count for clashes, because a brown
//    belt against black shoes is the textbook clash and excluding accessories
//    outright meant the rule could never catch it.
const colorRule: Rule = (pieces) => {
  const garments = pieces.filter((p) => p.category !== 'accessory')

  const saturated = garments.map((p) => p.primaryColor).filter((c) => !NEUTRALS.has(c))
  if (new Set(saturated).size > 2) return false

  const colors = pieces.flatMap((p) =>
    p.secondaryColor ? [p.primaryColor, p.secondaryColor] : [p.primaryColor],
  )
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (clash(colors[i], colors[j])) return false
    }
  }
  return true
}

// 5. Season: there has to be at least one season they all share.
const seasonRule: Rule = (pieces) => intersect(pieces.map(seasonsOf)).length > 0

const CASCADE: Rule[] = [formalityRule, occasionRule, patternRule, colorRule, seasonRule]

export function isViable(pieces: Garment[]): boolean {
  return CASCADE.every((rule) => rule(pieces))
}

// ── Generation ───────────────────────────────────────────────

export interface GenerateOptions {
  includeOuterwear?: boolean
}

export function generateOutfits(garments: Garment[], opts: GenerateOptions = {}): Outfit[] {
  const tops = byCategory(garments, 'top')
  const bottoms = byCategory(garments, 'bottom')
  const onepieces = byCategory(garments, 'onepiece')
  const shoes = byCategory(garments, 'shoes')
  const outerwear = opts.includeOuterwear ? byCategory(garments, 'outerwear') : []

  const bases: Garment[][] = []

  for (const t of tops) {
    for (const b of bottoms) {
      // Early pruning: if the top+bottom pair already fails, do not try the N
      // pairs of shoes on top of it. Sound because every rule is monotone.
      if (!isViable([t, b])) continue
      for (const s of shoes) bases.push([t, b, s])
    }
  }
  for (const o of onepieces) {
    for (const s of shoes) bases.push([o, s])
  }

  const combos: Garment[][] = []
  for (const base of bases) {
    combos.push(base)
    for (const o of outerwear) combos.push([...base, o])
  }

  const seen = new Set<string>()
  const outfits: Outfit[] = []

  for (const pieces of combos) {
    if (!isViable(pieces)) continue
    const id = outfitId(pieces.map((p) => p.id))
    if (seen.has(id)) continue
    seen.add(id)

    const top = pieces.find((p) => p.category === 'top' || p.category === 'onepiece')
    outfits.push({
      id,
      garmentIds: pieces.map((p) => p.id),
      formality: (top?.formality ?? 3) as Formality,
      occasions: intersect(pieces.map((p) => p.occasions)) as Occasion[],
      seasons: intersect(pieces.map(seasonsOf)),
      score: 0,
      timesWorn: 0,
      lastWorn: null,
    })
  }

  return outfits
}

// ── Scoring ──────────────────────────────────────────────────
// Decides WHAT you get shown first and WHAT is worth rendering.

const DAY_MS = 86_400_000

function daysSince(iso: string | null, now: number): number {
  if (!iso) return 999
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS)
}

export interface ScoreWeights {
  novelty: number
  favorites: number
  rest: number
  versatility: number
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  novelty: 1.0, // how long since you wore this exact outfit
  favorites: 8, // per piece marked as a favorite
  rest: 2.0, // penalizes reusing a garment worn recently
  versatility: 0.5, // rewards pieces that combine with many others
}

// How many viable outfits each garment appears in.
//
// Always compute this over the FULL outfit list, never over an already
// filtered one. Measured over the candidates for a single occasion it stops
// meaning "combines with many things" and starts meaning "combines with many
// things at the office", which makes a garment's score depend on which screen
// you are looking at.
export function countAppearances(outfits: Outfit[]): Map<string, number> {
  const appearances = new Map<string, number>()
  for (const o of outfits) {
    for (const id of o.garmentIds) {
      appearances.set(id, (appearances.get(id) ?? 0) + 1)
    }
  }
  return appearances
}

export interface ScoreOptions {
  weights?: ScoreWeights
  appearances?: Map<string, number>
  // Injected so tests are deterministic instead of depending on the wall clock.
  now?: number
}

export function scoreOutfits(
  outfits: Outfit[],
  garments: Garment[],
  opts: ScoreOptions = {},
): Outfit[] {
  const { weights = DEFAULT_WEIGHTS, now = Date.now() } = opts
  const appearances = opts.appearances ?? countAppearances(outfits)
  const byId = new Map(garments.map((g) => [g.id, g]))

  return outfits
    .map((o) => {
      const pieces = o.garmentIds.map((id) => byId.get(id)).filter((g): g is Garment => !!g)

      const novelty = Math.min(daysSince(o.lastWorn, now), 90) * weights.novelty
      const favorites = pieces.filter((p) => p.favorite).length * weights.favorites

      // If you wore a garment yesterday, you do not want to see it today in a
      // different outfit.
      const rest = pieces.reduce((acc, p) => {
        const d = daysSince(p.lastWorn, now)
        return acc - Math.max(0, 14 - d) * weights.rest
      }, 0)

      const versatility = pieces.reduce(
        (acc, p) => acc + Math.log1p(appearances.get(p.id) ?? 0) * weights.versatility,
        0,
      )

      return { ...o, score: Math.round(novelty + favorites + rest + versatility) }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

// ── Main query ───────────────────────────────────────────────
// What the "what do I wear today" screen actually calls.

export interface SuggestOptions extends ScoreOptions {
  limit?: number
}

export function suggest(
  outfits: Outfit[],
  garments: Garment[],
  ctx: Context,
  opts: SuggestOptions = {},
): Outfit[] {
  const { limit = 5, ...scoreOpts } = opts
  const byId = new Map(garments.map((g) => [g.id, g]))

  // Measured before filtering, on purpose. See countAppearances.
  const appearances = scoreOpts.appearances ?? countAppearances(outfits)

  const candidates = outfits.filter((o) => {
    if (!o.occasions.includes(ctx.occasion)) return false
    if (!o.seasons.includes(ctx.season)) return false
    if (ctx.rain) {
      const pieces = o.garmentIds.map((id) => byId.get(id)).filter((g): g is Garment => !!g)
      if (pieces.some((p) => p.category === 'shoes' && !p.rainSafe)) return false
    }
    return true
  })

  return scoreOutfits(candidates, garments, { ...scoreOpts, appearances }).slice(0, limit)
}

// Which ones to render with the budget you have.
export function renderPriority(
  outfits: Outfit[],
  garments: Garment[],
  imageBudget: number,
  opts: ScoreOptions = {},
): Outfit[] {
  return scoreOutfits(outfits, garments, opts)
    .filter((o) => !o.renderUrl)
    .slice(0, imageBudget)
}
