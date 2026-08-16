import { describe, expect, it } from 'vitest'
import { garment, smallWardrobe, wardrobe } from './fixtures'
import {
  countAppearances,
  generateOutfits,
  isViable,
  outfitId,
  scoreOutfits,
  suggest,
} from './outfitEngine'
import type { Context, Garment } from './types'

// A fixed instant so nothing here depends on the day the suite runs.
const NOW = Date.parse('2026-08-16T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

describe('the cascade rejects what it should', () => {
  it('rejects a formality spread wider than one step', () => {
    const gym = garment({ category: 'top', formality: 1 })
    const dressShoes = garment({ category: 'shoes', formality: 4 })
    expect(isViable([gym, dressShoes])).toBe(false)
  })

  it('accepts a formality spread of exactly one step', () => {
    const top = garment({ category: 'top', formality: 3 })
    const shoes = garment({ category: 'shoes', formality: 4 })
    expect(isViable([top, shoes])).toBe(true)
  })

  it('ignores accessories when measuring formality', () => {
    // A formality-5 watch must not veto an otherwise casual outfit.
    const top = garment({ category: 'top', formality: 2 })
    const shoes = garment({ category: 'shoes', formality: 2 })
    const watch = garment({ category: 'accessory', formality: 5 })
    expect(isViable([top, shoes, watch])).toBe(true)
  })

  it('rejects two patterned pieces', () => {
    const top = garment({ category: 'top', pattern: 'print' })
    const bottom = garment({ category: 'bottom', pattern: 'checks' })
    expect(isViable([top, bottom])).toBe(false)
  })

  it('counts stripes as half a pattern, so stripes plus a print still fails', () => {
    const striped = garment({ category: 'top', pattern: 'stripes' })
    const solid = garment({ category: 'bottom', pattern: 'solid' })
    expect(isViable([striped, solid])).toBe(true)

    const printed = garment({ category: 'bottom', pattern: 'print' })
    expect(isViable([striped, printed])).toBe(false)
  })

  it('rejects black against navy', () => {
    const top = garment({ category: 'top', primaryColor: 'navy' })
    const shoes = garment({ category: 'shoes', primaryColor: 'black' })
    expect(isViable([top, shoes])).toBe(false)
  })

  it('rejects a clash carried by an accessory', () => {
    // The textbook case: brown belt against black shoes. Accessories used to
    // be excluded from the color rule entirely, which made this unreachable.
    const top = garment({ category: 'top', primaryColor: 'white' })
    const shoes = garment({ category: 'shoes', primaryColor: 'black' })
    const belt = garment({ category: 'accessory', primaryColor: 'brown' })
    expect(isViable([top, shoes])).toBe(true)
    expect(isViable([top, shoes, belt])).toBe(false)
  })

  it('does not let an accessory eat the saturated color budget', () => {
    const top = garment({ category: 'top', primaryColor: 'green' })
    const bottom = garment({ category: 'bottom', primaryColor: 'blue' })
    const cap = garment({ category: 'accessory', primaryColor: 'yellow' })
    expect(isViable([top, bottom, cap])).toBe(true)
  })

  it('rejects three saturated colors', () => {
    const top = garment({ category: 'top', primaryColor: 'green' })
    const bottom = garment({ category: 'bottom', primaryColor: 'blue' })
    const shoes = garment({ category: 'shoes', primaryColor: 'yellow' })
    expect(isViable([top, bottom, shoes])).toBe(false)
  })

  it('rejects pieces with no season in common', () => {
    const hot = garment({ category: 'top', seasons: ['hot'] })
    const cool = garment({ category: 'bottom', seasons: ['cool'] })
    expect(isViable([hot, cool])).toBe(false)
  })

  it('rejects pieces with no occasion in common', () => {
    const office = garment({ category: 'top', occasions: ['office'] })
    const gym = garment({ category: 'bottom', occasions: ['sport'] })
    expect(isViable([office, gym])).toBe(false)
  })
})

describe('outfitId', () => {
  it('is stable under reordering', () => {
    expect(outfitId(['b', 'a', 'c'])).toBe(outfitId(['c', 'b', 'a']))
  })

  it('distinguishes different sets', () => {
    expect(outfitId(['a', 'b'])).not.toBe(outfitId(['a', 'c']))
  })

  it('does not mutate its argument', () => {
    const ids = ['c', 'a', 'b']
    outfitId(ids)
    expect(ids).toEqual(['c', 'a', 'b'])
  })
})

describe('generation', () => {
  it('early pruning discards nothing a brute force pass would keep', () => {
    const w = wardrobe()
    const tops = w.filter((g) => g.category === 'top')
    const bottoms = w.filter((g) => g.category === 'bottom')
    const shoes = w.filter((g) => g.category === 'shoes')

    const brute: string[] = []
    for (const t of tops) {
      for (const b of bottoms) {
        for (const s of shoes) {
          if (isViable([t, b, s])) brute.push(outfitId([t.id, b.id, s.id]))
        }
      }
    }

    const pruned = generateOutfits(w).map((o) => o.id)
    expect(pruned.slice().sort()).toEqual(brute.slice().sort())
  })

  it('skips inactive garments', () => {
    const w = wardrobe().map((g) => (g.category === 'shoes' ? { ...g, active: false } : g))
    expect(generateOutfits(w)).toHaveLength(0)
  })

  it('only adds outerwear when asked', () => {
    const w = smallWardrobe()
    const bare = generateOutfits(w).length
    const coated = generateOutfits(w, { includeOuterwear: true }).length
    expect(coated).toBeGreaterThan(bare)
  })

  // The bug this guards: seasonsOf expands 'all-year' inside the rule, but the
  // outfit used to be built from the raw lists. A shirt marked all-year worn
  // with hot-weather trousers passed the rule and then came out with an empty
  // season list, which made suggest() drop it forever.
  it('gives an all-year piece the seasons of the pieces it is worn with', () => {
    const top = garment({ category: 'top', seasons: ['all-year'], occasions: ['office'] })
    const bottom = garment({ category: 'bottom', seasons: ['hot'], occasions: ['office'] })
    const shoes = garment({ category: 'shoes', seasons: ['hot'], occasions: ['office'] })

    const [outfit] = generateOutfits([top, bottom, shoes])
    expect(outfit).toBeDefined()
    expect(outfit.seasons).toContain('hot')

    const ctx: Context = { occasion: 'office', season: 'hot', rain: false }
    expect(suggest([outfit], [top, bottom, shoes], ctx, { now: NOW })).toHaveLength(1)
  })
})

describe('scoring', () => {
  const base = () => {
    const top = garment({ category: 'top', occasions: ['office'] })
    const bottom = garment({ category: 'bottom', occasions: ['office'] })
    const shoes = garment({ category: 'shoes', occasions: ['office'] })
    return [top, bottom, shoes]
  }

  it('is deterministic for a given instant', () => {
    const w = base()
    const outfits = generateOutfits(w)
    const a = scoreOutfits(outfits, w, { now: NOW })
    const b = scoreOutfits(outfits, w, { now: NOW })
    expect(a[0].score).toBe(b[0].score)
  })

  it('rewards an outfit you have not worn in a while', () => {
    const w = base()
    const [outfit] = generateOutfits(w)
    const fresh = scoreOutfits([{ ...outfit, lastWorn: daysAgo(60) }], w, { now: NOW })
    const stale = scoreOutfits([{ ...outfit, lastWorn: daysAgo(1) }], w, { now: NOW })
    expect(fresh[0].score).toBeGreaterThan(stale[0].score)
  })

  it('penalizes an outfit whose garments were worn recently', () => {
    const w = base()
    const [outfit] = generateOutfits(w)
    const rested = scoreOutfits([outfit], w, { now: NOW })

    const tired = w.map((g) => ({ ...g, lastWorn: daysAgo(1) }))
    const tiredScore = scoreOutfits([outfit], tired, { now: NOW })

    expect(tiredScore[0].score).toBeLessThan(rested[0].score)
  })

  it('measures versatility over the whole wardrobe, not the filtered slice', () => {
    const w = wardrobe()
    const all = generateOutfits(w)
    const appearances = countAppearances(all)
    const ctx: Context = { occasion: 'office', season: 'all-year', rain: false }

    const fromSuggest = suggest(all, w, ctx, { now: NOW, limit: 50 })

    const candidates = all.filter(
      (o) => o.occasions.includes(ctx.occasion) && o.seasons.includes(ctx.season),
    )
    // The comparison below is only meaningful if the filter actually kept
    // something and threw something away.
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.length).toBeLessThan(all.length)

    const manual = scoreOutfits(candidates, w, { now: NOW, appearances }).slice(0, 50)

    expect(fromSuggest.map((o) => [o.id, o.score])).toEqual(manual.map((o) => [o.id, o.score]))

    // And the distinction is real: the filtered pool counts fewer appearances.
    const filteredCounts = countAppearances(candidates)
    const someGarment = candidates[0].garmentIds[0]
    expect(filteredCounts.get(someGarment)).toBeLessThan(appearances.get(someGarment)!)
  })
})

describe('suggest', () => {
  const ctx: Context = { occasion: 'office', season: 'all-year', rain: false }

  it('drops outfits that do not match the occasion', () => {
    const w = wardrobe()
    const all = generateOutfits(w)
    const out = suggest(all, w, { ...ctx, occasion: 'sport' }, { now: NOW })
    expect(out).toHaveLength(0)
  })

  it('drops shoes that do not survive the rain', () => {
    const w = wardrobe()
    const all = generateOutfits(w)
    const byId = new Map(w.map((g) => [g.id, g]))

    const dry = suggest(all, w, ctx, { now: NOW, limit: 100 })
    const wet = suggest(all, w, { ...ctx, rain: true }, { now: NOW, limit: 100 })

    expect(wet.length).toBeLessThan(dry.length)
    for (const o of wet) {
      const shoes = o.garmentIds.map((id) => byId.get(id)!).filter((g) => g.category === 'shoes')
      expect(shoes.every((s) => s.rainSafe)).toBe(true)
    }
  })

  it('honors the limit', () => {
    const w = wardrobe()
    const all = generateOutfits(w)
    expect(suggest(all, w, ctx, { now: NOW, limit: 3 })).toHaveLength(3)
  })
})

describe('acceptance', () => {
  it('generates a stable, non-trivial set of outfits from a 15/8/5 wardrobe', () => {
    const w = wardrobe(15, 8, 5)
    const outfits = generateOutfits(w)

    // Deterministic fixture, so this number is a regression guard: it moves
    // only when a rule changes, and then it should be looked at.
    expect(outfits.length).toMatchInlineSnapshot(`274`)

    // What actually matters is that the cascade is doing work without
    // emptying the wardrobe.
    const total = 15 * 8 * 5
    expect(outfits.length).toBeGreaterThan(total * 0.05)
    expect(outfits.length).toBeLessThan(total * 0.75)
  })

  it('generates in well under 100 ms', () => {
    const w = wardrobe(15, 8, 5)
    const started = performance.now()
    const outfits = generateOutfits(w)
    const elapsed = performance.now() - started

    expect(outfits.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(100)
  })

  it('ranks a full wardrobe without breaking a sweat', () => {
    const w = wardrobe(15, 8, 5)
    const all = generateOutfits(w)
    const started = performance.now()
    suggest(all, w, { occasion: 'office', season: 'all-year', rain: false }, { now: NOW })
    expect(performance.now() - started).toBeLessThan(100)
  })
})

describe('garments held out of the wardrobe', () => {
  it('never appear in a generated outfit', () => {
    const w: Garment[] = wardrobe(4, 3, 2)
    const inactive = w[0].id
    const withHold = w.map((g) => (g.id === inactive ? { ...g, active: false } : g))
    const outfits = generateOutfits(withHold)
    expect(outfits.some((o) => o.garmentIds.includes(inactive))).toBe(false)
  })
})
