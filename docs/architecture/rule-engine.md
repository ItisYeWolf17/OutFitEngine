# The rule engine

`src/domain/outfitEngine.ts`. No AI decides what matches — rules decide, and
the AI only draws. Runs entirely on the client, costs nothing, works offline.

## The cascade

Five rules, ordered cheapest first and by how much each prunes:

1. **Formality** — the spread between pieces is at most one step. Accessories
   are ignored: a formal watch goes with everything.
2. **Occasion** — the pieces must share at least one occasion.
3. **Pattern** — at most one patterned piece. Stripes count as half.
4. **Color** — at most two saturated colors, and no clashing pair. Accessories
   are excluded from the saturated budget but **included** in clash checks: a
   brown belt against black shoes is the textbook clash.
5. **Season** — the pieces must share at least one season.

## Monotonicity, and why the pruning is sound

Every rule is monotone: adding a garment to a viable set can only make it
worse, never better. Each metric either grows (pattern weight, color count) or
shrinks (occasion and season intersections) in the wrong direction.

That property is what licenses the early exit in `generateOutfits`: if a
top+bottom pair already fails, no pair of shoes can rescue it, so the inner
loop is skipped. A test asserts this by comparing the pruned output against a
brute force pass over every combination.

If you add a rule, check it is monotone. A rule that can turn a failing set
into a passing one silently breaks the pruning.

## `all-year` expansion

A garment marked `all-year` is usable in every season. That expansion happens
in `seasonsOf()` and both the season rule and the outfit's own season list go
through it.

They used to disagree: the rule expanded, generation did not. An `all-year`
shirt worn with hot-weather trousers passed the rule and came out with an empty
season list, which made `suggest()` drop it forever. Most garments are
`all-year`, so this silently hid a large slice of the wardrobe.

## Scoring

Four terms, weights in `DEFAULT_WEIGHTS`:

- **novelty** — days since this exact outfit was worn, capped at 90
- **favorites** — per piece marked favorite
- **rest** — penalizes garments worn in the last 14 days
- **versatility** — `log1p` of how many viable outfits the piece appears in

Two things the signature enforces:

**The clock is injected.** `now` defaults to `Date.now()` but tests pass a
fixed instant. Without that nothing about scoring was assertable.

**Appearances are counted over the full set.** Passing an already-filtered list
would make versatility mean "combines with many things *at the office*", so a
garment's score would change depending on which screen you were on.
`suggest()` counts over everything, then filters, then scores.

## Known gaps

`generateOutfits` always returns `timesWorn: 0` and `lastWorn: null`. The merge
against outfits persisted in Firestore, keyed by `outfitId`, is missing — until
it exists the novelty term is a constant. That belongs to phase 4, when the
repository exists. `scoreOutfits` already accepts what it will need.

The weights are module constants, shared by every user. If the app ever has
more than one, they move to the user document.
