/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): heap sort's character, round three. Not
 * linked from the site's menus; reached at /design/heap-sort on the PR preview. Step 1: the
 * pieces only, large (8×) and at real size, light and dark: for each design, two variants of its
 * character in three poses, its unit and stacks at the real stage sizes, a node with a number and
 * a small 3-row tree view. Nothing here is wired into Watch or Do it, and there are no sounds.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { spritePath } from '../../characters/pixel'
import {
  BEAVER_H,
  BEAVER_W,
  beaverRows,
  BEAVERS,
  clumpRows,
  damRows,
  EAGLE_H,
  EAGLE_W,
  eagleRows,
  EAGLES,
  logEndRows,
  stackRows,
  TALONS,
  treeLayout,
  treeRows,
  UNIT_STAGES,
  type Grid,
  type Pose,
  type TreeLayout,
  type UnitKind,
  type Variant,
} from './studies'
import './HeapMockups.css'

const THEMES = ['light', 'dark'] as const

const CODES = {
  beaver: ['o', 'f', 'l', 'd', 't', 'x', 'e', 's', 'n', 'w', 'h', 'H'],
  eagle: ['o', 'f', 'd', 'F', 'H', 'T', 'z', 'b', 'k', 'e', 's', 'c'],
  log: ['o', 'B', 'S', 'C', 'R'],
  sticks: ['o', 'P', 'Q', 'K'],
  dam: ['o', 'M', 'm', 'S', 'B', 'C', 'R'],
  tree: ['o', 'T', 't', 'a', 'b', 'c'],
} as const

/** Pixel art from a grid: one path per code, `s` screen pixels a pixel. */
function PixelArt({
  rows,
  codes,
  s,
  kind,
  style,
}: {
  rows: Grid
  codes: readonly string[]
  s: number
  kind: string
  style?: CSSProperties
}) {
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(0, ...rows.map((row) => row.length))
  return (
    <svg
      className="hm-sprite"
      style={style}
      width={w * s}
      height={rows.length * s}
      viewBox={`0 0 ${String(w)} ${String(rows.length)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paths.map(([code, d]) => (
        <path key={code} d={d} className={`px-${kind}-${code}`} />
      ))}
    </svg>
  )
}

/** The pieces in each theme, side by side, each on the stage's grid paper. */
function BothThemes({ children }: { children: ReactNode }) {
  return (
    <div className="hm-themes">
      {THEMES.map((theme) => (
        <div key={theme} className={`force-${theme}`}>
          <span className="hm-theme-label">{theme}</span>
          <div className="hm-paper">{children}</div>
        </div>
      ))}
    </div>
  )
}

/** The carried stack in the studies: 3 units, 7 px each. */
const CARRY_H = 7

interface DesignSpec {
  readonly id: 'beaver' | 'eagle'
  readonly unit: UnitKind
  readonly w: number
  readonly h: number
  readonly rows: (variant: string, pose: Pose) => Grid
  /** Where the carried stack goes, in sprite pixels: its left, top and width. */
  readonly carry: { readonly left: number; readonly top: number; readonly width: number }
}

const BEAVER: DesignSpec = {
  id: 'beaver',
  unit: 'log',
  w: BEAVER_W,
  h: BEAVER_H,
  rows: beaverRows,
  // Over its head, on its raised paws.
  carry: { left: 8, top: 1 - (3 * CARRY_H + 1), width: 24 },
}

const EAGLE: DesignSpec = {
  id: 'eagle',
  unit: 'sticks',
  w: EAGLE_W,
  h: EAGLE_H,
  rows: eagleRows,
  // Under it, its talons on the stack's top corners.
  carry: {
    left: TALONS.left - 1,
    top: TALONS.y - 1,
    width: TALONS.right - TALONS.left + 3,
  },
}

/** A character in a pose; carrying, with its 3-unit stack. */
function Character({
  spec,
  variant,
  pose,
  s,
}: {
  spec: DesignSpec
  variant: string
  pose: Pose
  s: number
}) {
  const rows = useMemo(() => spec.rows(variant, pose), [spec, variant, pose])
  const stack = useMemo(
    () => stackRows(spec.unit, 3, CARRY_H, spec.carry.width),
    [spec.unit, spec.carry.width],
  )
  const carrying = pose === 'carry'
  const top = carrying ? Math.min(0, spec.carry.top) : 0
  const bottom = carrying ? Math.max(spec.h, spec.carry.top + stack.length) : spec.h
  return (
    <span className="hm-piece" style={{ width: spec.w * s, height: (bottom - top) * s }}>
      {carrying && (
        <PixelArt
          rows={stack}
          codes={CODES[spec.unit]}
          s={s}
          kind={spec.unit}
          style={{
            position: 'absolute',
            left: spec.carry.left * s,
            top: (spec.carry.top - top) * s,
          }}
        />
      )}
      <PixelArt
        rows={rows}
        codes={CODES[spec.id]}
        s={s}
        kind={variant.toLowerCase()}
        style={{ position: 'absolute', left: 0, top: -top * s }}
      />
    </span>
  )
}

const POSES: Readonly<Record<DesignSpec['id'], readonly (readonly [Pose, string])[]>> = {
  beaver: [
    ['idle', 'idle (sitting up)'],
    ['move', 'moving (waddling)'],
    ['carry', 'carrying 3 logs'],
  ],
  eagle: [
    ['idle', 'idle (perched)'],
    ['move', 'moving (flying)'],
    ['carry', 'carrying 3 bundles in its talons'],
  ],
}

function CharacterStudy({ spec, variant }: { spec: DesignSpec; variant: Variant }) {
  const poses = POSES[spec.id]
  return (
    <section className="hm-study" aria-labelledby={`variant-${variant.id}`}>
      <h4 id={`variant-${variant.id}`}>{variant.name}</h4>
      <p className="hm-about">{variant.about}</p>
      <BothThemes>
        <div className="hm-row">
          {poses.map(([pose, name]) => (
            <figure key={pose} className="hm-fig">
              <Character spec={spec} variant={variant.id} pose={pose} s={8} />
              <figcaption>{name}, 8×</figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row is-real">
          {[1, 2].map((s) =>
            poses.map(([pose]) => (
              <figure key={`${pose}-${String(s)}`} className="hm-fig">
                <Character spec={spec} variant={variant.id} pose={pose} s={s} />
              </figure>
            )),
          )}
          <span className="hm-note">
            real size: 1× ({spec.w} × {spec.h} px), then 2×
          </span>
        </div>
      </BothThemes>
    </section>
  )
}

const UNIT_WORDS: Readonly<Record<UnitKind, { title: string; about: string; one: string }>> = {
  log: {
    title: 'The unit: one log = one',
    one: 'log',
    about:
      'A log seen side-on: brown bark with darker streaks, a rounded left end, and its round cut end at the right (pale wood with a ring and a center where it fits), a dark outline round each log (its top line is the line between it and the log over it, as the pizza boxes). Under 5 px: a plain log (bark and a paler cut end); at 1 px the stack is a plain column.',
  },
  sticks: {
    title: 'The unit: one bundle of sticks = one',
    one: 'bundle',
    about:
      'A bundle of nest sticks seen side-on: pale and dark sticks in rows, their ends staggered, tied in the middle with blue-grey twine, a dark outline round each bundle (its top line is the line between it and the bundle over it). Under 5 px: plain stick rows (the twine from 4 px); at 1 px the stack is a plain column.',
  },
}

function UnitStudy({ unit }: { unit: UnitKind }) {
  const words = UNIT_WORDS[unit]
  return (
    <section className="hm-study" aria-labelledby={`unit-${unit}`}>
      <h3 id={`unit-${unit}`}>{words.title}</h3>
      <p className="hm-about">
        {words.about} Sized like the pizza boxes: for 12 (the most the look carries), whole pixels,
        at most 12 px, after the number under the stack (14 px); the character’s own room is set
        when the scenes are drawn, so a unit may get a pixel smaller there.
      </p>
      <BothThemes>
        <div className="hm-row">
          {[
            [9, 41],
            [5, 44],
          ].map(([h = 9, w = 41]) => (
            <figure key={h} className="hm-fig">
              <PixelArt rows={stackRows(unit, 1, h, w)} codes={CODES[unit]} s={8} kind={unit} />
              <figcaption>
                one {words.one}, {h} px high, 8×
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row is-real">
          {UNIT_STAGES.map(({ size, h, w }) => (
            <figure key={size.id} className="hm-fig">
              <span className="hm-stacks">
                {[1, 5, 12].map((count) => (
                  <PixelArt
                    key={count}
                    rows={stackRows(unit, count, h, w)}
                    codes={CODES[unit]}
                    s={1}
                    kind={unit}
                  />
                ))}
              </span>
              <figcaption className="hm-stage-name">
                1, 5, 12: {size.label.split(':')[0]}; {h} px a {words.one}
              </figcaption>
            </figure>
          ))}
        </div>
      </BothThemes>
    </section>
  )
}

/** The small tree view's numbers: a pyramid (each at least as big as the two under it). */
const SMALL_TREE = [9, 7, 8, 3, 5, 2, 6]
const NODE = 26

function Node({ rows, kind, s }: { rows: Grid; kind: 'dam' | 'tree'; s: number }) {
  const size = rows.length
  return (
    <span className="hm-piece" style={{ width: size * s, height: size * s }}>
      <PixelArt rows={rows} codes={CODES[kind]} s={s} kind={kind} />
      <span
        className={kind === 'dam' ? 'hm-badge is-bare' : 'hm-badge'}
        style={{ fontSize: 11 * s, left: (size / 2) * s, top: (size / 2) * s }}
      >
        7
      </span>
    </span>
  )
}

function SmallTree({
  rows,
  layout,
  kind,
  s,
}: {
  rows: Grid
  layout: TreeLayout
  kind: 'dam' | 'tree'
  s: number
}) {
  return (
    <span className="hm-piece" style={{ width: layout.w * s, height: layout.h * s }}>
      <PixelArt rows={rows} codes={CODES[kind]} s={s} kind={kind} />
      {layout.nodes.map((node, k) => (
        <span
          key={k}
          className={kind === 'dam' ? 'hm-badge is-bare' : 'hm-badge'}
          style={{ fontSize: 10 * s, left: node.x * s, top: node.y * s }}
        >
          {SMALL_TREE[k]}
        </span>
      ))}
    </span>
  )
}

function TreeStudy({ kind }: { kind: 'dam' | 'tree' }) {
  const dam = kind === 'dam'
  const node = useMemo(() => (dam ? logEndRows(NODE) : clumpRows(NODE)), [dam])
  const layout = useMemo(
    () => treeLayout(SMALL_TREE.length, 150, dam ? 24 : 24, dam ? 24 : 30),
    [dam],
  )
  const rows = useMemo(() => (dam ? damRows(layout) : treeRows(layout)), [dam, layout])
  return (
    <section className="hm-study" aria-labelledby={`tree-${kind}`}>
      <h3 id={`tree-${kind}`}>
        {dam ? 'The tree view: a dam of log ends' : 'The tree view: a real tree'}
      </h3>
      <p className="hm-about">
        {dam
          ? 'A node is a log’s round cut end (bark ring, pale wood, two growth rings, a dark outline) with its number right on the wood. The tree is the beaver’s dam: a mound of mud and sticks in the pyramid’s shape, its bottom row on the ground, each log end set into it, and a stick from each log to the two it rests on.'
          : 'A node is a round clump of autumn leaves (orange, lighter leaves upper left, rust lower right, a dark outline; no green) with its number on a small cream disc. The tree has a brown trunk from the ground up to the top clump, and a branch from each clump to its children, thinner each row down.'}{' '}
        The numbers are text, as on the site’s tree, so they stay sharp.
      </p>
      <BothThemes>
        <div className="hm-row">
          <figure className="hm-fig">
            <Node rows={node} kind={kind} s={8} />
            <figcaption>a node ({NODE} px), 8×</figcaption>
          </figure>
          <figure className="hm-fig">
            <Node rows={node} kind={kind} s={1} />
            <figcaption>real size</figcaption>
          </figure>
        </div>
        <div className="hm-row">
          <figure className="hm-fig">
            <SmallTree rows={rows} layout={layout} kind={kind} s={4} />
            <figcaption>a 3-row {dam ? 'dam' : 'tree'}, 4×</figcaption>
          </figure>
          <figure className="hm-fig">
            <SmallTree rows={rows} layout={layout} kind={kind} s={1} />
            <figcaption>
              real size ({layout.w} × {layout.h} px)
            </figcaption>
          </figure>
        </div>
      </BothThemes>
    </section>
  )
}

export function HeapMockupsPage() {
  return (
    <main id="main" className="hm-page" tabIndex={-1}>
      <h1>Heap sort’s character, round three: the pieces (DO NOT MERGE)</h1>
      <p className="hm-intro">
        For picking only: nothing here is wired into heap sort’s Watch or Do it, and there are no
        sounds. The pizza cart’s formula: one character, and every value a stack of identical,
        outlined, countable units (1 to 12). Two designs, each with two variants of its character in
        three poses, its unit and its stacks at the real stage sizes, a node with its number and a
        small 3-row tree view. Large is 8× (4× for the trees, to fit the page); real size is 1× (and
        2×, as on roomier stages). Light and dark, on the stage’s grid paper. Nothing takes the
        green of the “in its final spot” mark. Full scenes come after the pick.
      </p>
      <section className="hm-design" aria-labelledby="design-beaver">
        <h2 id="design-beaver">B. Beaver and logs</h2>
        <p className="hm-about">
          The beaver builds a dam, a pyramid of logs. A climb: it rolls the bigger child’s stack up
          past the parent’s. The special move: it hauls the top stack to its woodpile at the end.
        </p>
        {BEAVERS.map((variant) => (
          <CharacterStudy key={variant.id} spec={BEAVER} variant={variant} />
        ))}
        <UnitStudy unit="log" />
        <TreeStudy kind="dam" />
      </section>
      <section className="hm-design" aria-labelledby="design-eagle">
        <h2 id="design-eagle">E. Eagle and stick bundles</h2>
        <p className="hm-about">
          A climb: the eagle grabs the bigger child’s stack in its talons and lifts it up. The
          special move: it carries the top stack away to its nest at the end. The units are bundles
          of nest sticks.
        </p>
        {EAGLES.map((variant) => (
          <CharacterStudy key={variant.id} spec={EAGLE} variant={variant} />
        ))}
        <UnitStudy unit="sticks" />
        <TreeStudy kind="tree" />
      </section>
    </main>
  )
}
