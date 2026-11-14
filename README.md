# a happy little grove

Seeded landscape paintings, written as SVG. No dependencies, no canvas, no
browser: one number goes in, a painting comes out.

```sh
node grove.mjs --seed 7 --scene lake --out lake.svg
```

![five scenes](examples/index.html)

## What it does

`grove.mjs` paints a landscape the way a painter builds one — sky, then far
ridge, then near ridge, then water, then shore, then trees, then foreground
brush — and writes it as a single self-contained SVG. Every dab, ridge line and
tree comes from one seeded generator, so a seed always paints the same picture,
and a different seed paints a different one.

Five compositions, five palettes:

| scene    | what it is                                    | default palette |
| -------- | --------------------------------------------- | --------------- |
| `lake`   | mountains, a far shore, water with a sun path | morning         |
| `valley` | open meadow, layered ridges                   | noon            |
| `forest` | more trees than sky                           | storm           |
| `cabin`  | a cabin in the middle distance                | dusk            |
| `winter` | snow on the ground and on the branches        | winter          |

```sh
node grove.mjs --list                              # scenes and palettes
node grove.mjs --seed 3 --scene winter --out w.svg
node grove.mjs --seed 12 --scene cabin --palette storm
node grove.mjs --gallery examples --count 8        # paintings + index.html
```

`--out` takes a path; without it the SVG goes to stdout, so it pipes.

## How the paint is made

- **A ridge is not a silhouette.** The crest is grown by midpoint displacement,
  then hung with spurs, a rim of light and snow only above a height threshold —
  all clipped to the mountain's own outline.
- **A tree is one mass, not a stack of triangles.** The conifer's silhouette is
  a single path whose edge is a sawtooth, so the skirts droop; the tiers show
  through as faint chevrons, and needles are laid along the lit flank only.
- **The water answers the sky.** The sun leaves a broken column of light, the
  ridges are mirrored and blurred, and the ripples thin out toward the horizon.
- **Everything is deterministic.** `mulberry32` over an FNV-1a hash of
  `scene:seed`. Same string in, same file out — which is also what the tests
  check.

## Tests

```sh
node --test
```

Twelve tests: determinism, seed and scene divergence, palettes, a complete SVG
document, no `NaN` anywhere, shape counts, custom sizes, and both CLI paths
(`--out`, `--gallery`).

## Difference from the first build

[vexaries.xyz/a-happy-little-tree](https://tangled.org/vexaries.xyz/a-happy-little-tree)
was the first answer to this ask: a browser page you click to paint a new scene
and save as SVG. This one is deliberately the other shape — headless and
scriptable, meant for dozens of pictures from a loop rather than one at a time,
with the palette and the composition chosen by name and the whole painting
reproducible from a seed.

## Where it came from

The idea is [NaNdi's](https://rainshare.dev/seed/nandi.uk/3n27pwkdntc2u), asked
for on [Rainshare](https://rainshare.dev) — *"a bob ross painting generator that
creates happy little trees with svg"*. Built by an agent running
`deepseek-v4.1-flash` in Hermes, for Kat Suricata, who keeps the repo.

MIT licensed. Go and paint something.
