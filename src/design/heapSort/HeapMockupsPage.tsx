/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): heap sort's character, round two. Not
 * linked from the site's menus; reached at /design/heap-sort on the PR preview. Step 1: the
 * pieces only, large (8×) and at real size, light and dark: three monkeys to pick from, the
 * banana crate and its stacks, a leafy tree node and a small tree. Nothing here is wired into
 * Watch or Do it, and there are no sounds.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { spritePath } from '../../characters/pixel'
import {
  clumpRows,
  crateStack,
  HOLD_FEET,
  MONKEY_DESIGNS,
  MONKEY_H,
  MONKEY_W,
  monkeyRows,
  treeLayout,
  treeRows,
  type Grid,
  type MonkeyDesign,
  type MonkeyPose,
  type TreeLayout,
} from './studies'
import './HeapMockups.css'

const THEMES = ['light', 'dark'] as const

const MONKEY_CODES = ['v', 'o', 'f', 'd', 'l', 'p', 'e', 'w', 'n', 'm'] as const
const CRATE_CODES = ['o', 'w', 'g', 'k', 'L', 'y', 't'] as const
const TREE_CODES = ['o', 'T', 't', 'a', 'b', 'c'] as const

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

/** One piece in each theme, side by side, each on the stage's grid paper. */
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

/** The crates the hold pose carries in the studies: 3 crates, 9 px each (18 wide). */
const HOLD_CRATE = 9
const HOLD_COUNT = 3

/** A monkey in a pose; in "hold", over a stack of crates it grips with its feet. */
function Monkey({ design, pose, s }: { design: MonkeyDesign['id']; pose: MonkeyPose; s: number }) {
  const rows = useMemo(() => monkeyRows(design, pose), [design, pose])
  const vine = rows[0]?.indexOf('v') ?? -1
  const stack = useMemo(() => crateStack(HOLD_COUNT, HOLD_CRATE), [])
  const stackW = stack[0]?.length ?? 0
  // The feet sit on the stack's top corners, a pixel into its top crate.
  const stackTop = HOLD_FEET.y - 1
  const stackLeft = Math.round(MONKEY_W / 2 - stackW / 2)
  const height = pose === 'hold' ? stackTop + stack.length : MONKEY_H
  return (
    <span
      className="hm-piece"
      style={{ width: MONKEY_W * s, height: height * s, marginTop: vine >= 0 ? 6 * s : 0 }}
    >
      {vine >= 0 && (
        <span
          className="hm-vine"
          style={{ left: vine * s, top: -6 * s, width: s, height: 6 * s }}
          aria-hidden="true"
        />
      )}
      {pose === 'hold' && (
        <PixelArt
          rows={stack}
          codes={CRATE_CODES}
          s={s}
          kind="crate"
          style={{ position: 'absolute', left: stackLeft * s, top: stackTop * s }}
        />
      )}
      <PixelArt
        rows={rows}
        codes={MONKEY_CODES}
        s={s}
        kind={`m${design}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
    </span>
  )
}

const POSES: readonly (readonly [MonkeyPose, string])[] = [
  ['idle', 'idle'],
  ['swing', 'swinging on a vine'],
  ['hold', 'holding a crate stack with its feet'],
]

function MonkeyStudy({ design }: { design: MonkeyDesign }) {
  return (
    <section className="hm-study" aria-labelledby={`monkey-${design.id}`}>
      <h3 id={`monkey-${design.id}`}>{design.name}</h3>
      <p className="hm-about">{design.about}</p>
      <BothThemes>
        <div className="hm-row">
          {POSES.map(([pose, name]) => (
            <figure key={pose} className="hm-fig">
              <Monkey design={design.id} pose={pose} s={8} />
              <figcaption>{name}, 8×</figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row is-real">
          {[1, 2].map((s) =>
            POSES.map(([pose]) => (
              <figure key={`${pose}-${String(s)}`} className="hm-fig">
                <Monkey design={design.id} pose={pose} s={s} />
              </figure>
            )),
          )}
          <span className="hm-note">real size: 1× (34 × 40 px), then 2×</span>
        </div>
      </BothThemes>
    </section>
  )
}

function CrateStudy() {
  return (
    <section className="hm-study" aria-labelledby="crates">
      <h3 id="crates">Banana crates: one crate = one</h3>
      <p className="hm-about">
        A wooden crate seen from the front: a dark outline (its top line is the line between it and
        the crate over it, as with the pizza boxes), darker corner posts, slats with a darker gap
        between them, and a small paper label with a banana where the crate is at least 7 px high
        (under that, plain slats). Every crate on a stage is the same, twice as wide as high;
        nothing sits on top of a stack.
      </p>
      <BothThemes>
        <div className="hm-row">
          {[12, 8].map((h) => (
            <figure key={h} className="hm-fig">
              <PixelArt rows={crateStack(1, h)} codes={CRATE_CODES} s={8} kind="crate" />
              <figcaption>one {h} px crate, 8×</figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row">
          {[1, 5, 12].map((count) => (
            <figure key={count} className="hm-fig">
              <PixelArt rows={crateStack(count, 8)} codes={CRATE_CODES} s={4} kind="crate" />
              <figcaption>{count}, 4× (8 px crates)</figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row is-real">
          {[12, 8, 5, 3].map((h) => (
            <figure key={h} className="hm-fig">
              <span className="hm-stacks">
                {[1, 5, 12].map((count) => (
                  <PixelArt
                    key={count}
                    rows={crateStack(count, h)}
                    codes={CRATE_CODES}
                    s={1}
                    kind="crate"
                  />
                ))}
              </span>
              <figcaption>1, 5, 12 at real size, {h} px crates</figcaption>
            </figure>
          ))}
        </div>
      </BothThemes>
    </section>
  )
}

/** The small tree's numbers: a pyramid (each at least as big as the two under it). */
const SMALL_TREE = [9, 7, 8, 3, 5, 2, 6]
const CLUMP = 26

function Clump({ rows, s, value }: { rows: Grid; s: number; value: number }) {
  const size = CLUMP + 4
  return (
    <span className="hm-piece" style={{ width: size * s, height: size * s }}>
      <PixelArt rows={rows} codes={TREE_CODES} s={s} kind="tree" />
      <span
        className="hm-badge"
        style={{ fontSize: 11 * s, left: (size / 2) * s, top: (size / 2) * s }}
      >
        {value}
      </span>
    </span>
  )
}

function SmallTree({ rows, layout, s }: { rows: Grid; layout: TreeLayout; s: number }) {
  return (
    <span className="hm-piece" style={{ width: layout.w * s, height: layout.h * s }}>
      <PixelArt rows={rows} codes={TREE_CODES} s={s} kind="tree" />
      {layout.nodes.map((node, k) => (
        <span
          key={k}
          className="hm-badge"
          style={{ fontSize: 10 * s, left: node.x * s, top: node.y * s }}
        >
          {SMALL_TREE[k]}
        </span>
      ))}
    </span>
  )
}

function TreeStudy() {
  const clump = useMemo(() => clumpRows(CLUMP), [])
  const layout = useMemo(() => treeLayout(SMALL_TREE.length, 150, 24, 30), [])
  const tree = useMemo(() => treeRows(layout), [layout])
  return (
    <section className="hm-study" aria-labelledby="tree">
      <h3 id="tree">The tree: leafy clumps on real branches</h3>
      <p className="hm-about">
        A node is a round clump of leaves (a bumpy edge, lighter leaves upper left, darker lower
        right, a dark outline) with its number on a small cream disc. The tree has a brown trunk
        from the ground up to the top clump, and a branch from each clump to its children, thinner
        each row down. The numbers are text, as on the site’s tree, so they stay sharp.
      </p>
      <BothThemes>
        <div className="hm-row">
          <figure className="hm-fig">
            <Clump rows={clump} s={8} value={7} />
            <figcaption>a node ({CLUMP} px clump), 8×</figcaption>
          </figure>
          <figure className="hm-fig">
            <Clump rows={clump} s={1} value={7} />
            <figcaption>real size</figcaption>
          </figure>
        </div>
        <div className="hm-row">
          <figure className="hm-fig">
            <SmallTree rows={tree} layout={layout} s={4} />
            <figcaption>a 3-row tree, 4×</figcaption>
          </figure>
        </div>
        <div className="hm-row is-real">
          <figure className="hm-fig">
            <SmallTree rows={tree} layout={layout} s={1} />
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
      <h1>Heap sort’s character, round two: the pieces (DO NOT MERGE)</h1>
      <p className="hm-intro">
        For picking only: nothing here is wired into heap sort’s Watch or Do it, and there are no
        sounds. The pizza cart’s formula: one monkey (three designs to pick from), every value a
        stack of identical wooden banana crates (one crate = one, 1 to 12), and the tree as a real
        tree. Each piece is shown large (8×, or 4× where 8× wouldn’t fit the page) and at real size,
        light and dark, on the stage’s grid paper. Full scenes come after the pick.
      </p>
      <section className="hm-design" aria-labelledby="monkeys">
        <h2 id="monkeys">The monkey: three designs</h2>
        {MONKEY_DESIGNS.map((design) => (
          <MonkeyStudy key={design.id} design={design} />
        ))}
      </section>
      <section className="hm-design" aria-labelledby="values">
        <h2 id="values">The values and the tree</h2>
        <CrateStudy />
        <TreeStudy />
      </section>
    </main>
  )
}
