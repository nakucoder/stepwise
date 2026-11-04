/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): B2's pieces, large (8×) and at real size,
 * light and dark: the beaver's moods on the stage (the compact lane sprite), the round-three
 * beaver in its three poses, one log and its stacks at the real stage sizes, and the dam's node.
 */
import { useMemo, type ReactNode } from 'react'
import { LANE_BEAVER_H, LANE_BEAVER_W, laneBeaverRows, type BeaverPose } from './beaver'
import { PixelArt } from './BeaverScene'
import { CODES } from './codes'
import {
  BEAVER_H,
  BEAVER_W,
  beaverRows,
  logEndRows,
  stackRows,
  UNIT_STAGES,
  type Pose,
} from './studies'

const THEMES = ['light', 'dark'] as const

/** The pieces in each theme, side by side, each on the stage's grid paper. */
export function BothThemes({ children }: { children: ReactNode }) {
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

const MOODS: readonly (readonly [BeaverPose, string])[] = [
  ['idle', 'waiting'],
  ['walk', 'walking'],
  ['look', 'looking (a family compared)'],
  ['found', 'found a bigger one (with a “!”)'],
  ['shrug', 'a shrug (it stays)'],
  ['carry', 'carrying a stack over its head'],
  ['proud', 'proud (hauling the top to the woodpile)'],
  ['happy', 'happy (the finale)'],
]

export function Moods() {
  return (
    <section className="hm-study" aria-labelledby="moods">
      <h2 id="moods">The beaver on the stage, and its moods</h2>
      <p className="hm-about">
        On the stage the beaver works in a lane under the stacks, as the pizza cart does, so it
        never hides a value. A compact B2 ({LANE_BEAVER_W} × {LANE_BEAVER_H}), the same beaver: dark
        fur, cream cheeks and muzzle, big front teeth, the paddle tail and the orange hard hat, at
        1× or 2× (whole pixels, by the stage’s size). Its moods show in its eyes, mouth and arms; it
        never talks.
      </p>
      <BothThemes>
        <div className="hm-row">
          {MOODS.map(([pose, name]) => (
            <figure key={pose} className="hm-fig">
              <PixelArt rows={laneBeaverRows(pose)} codes={CODES.b2} s={6} kind="b2" />
              <figcaption>{name}, 6×</figcaption>
            </figure>
          ))}
        </div>
        <div className="hm-row is-real">
          {[1, 2].map((s) =>
            MOODS.map(([pose]) => (
              <PixelArt
                key={`${pose}-${String(s)}`}
                rows={laneBeaverRows(pose)}
                codes={CODES.b2}
                s={s}
                kind="b2"
              />
            )),
          )}
          <span className="hm-note">real size: 1×, then 2×</span>
        </div>
      </BothThemes>
    </section>
  )
}

const CARRY_H = 7
const POSES: readonly (readonly [Pose, string])[] = [
  ['idle', 'idle (sitting up)'],
  ['move', 'moving (waddling)'],
  ['carry', 'carrying 3 logs'],
]

function BigBeaver({ pose, s }: { pose: Pose; s: number }) {
  const rows = useMemo(() => beaverRows('B2', pose), [pose])
  const stack = useMemo(() => stackRows('log', 3, CARRY_H, 24), [])
  const top = pose === 'carry' ? 1 - stack.length : 0
  return (
    <span className="hm-piece" style={{ width: BEAVER_W * s, height: (BEAVER_H - top) * s }}>
      {pose === 'carry' && (
        <PixelArt
          rows={stack}
          codes={CODES.log}
          s={s}
          kind="log"
          style={{ position: 'absolute', left: 8 * s, top: 0 }}
        />
      )}
      <PixelArt
        rows={rows}
        codes={CODES.b2}
        s={s}
        kind="b2"
        style={{ position: 'absolute', left: 0, top: -top * s }}
      />
    </span>
  )
}

export function Pieces() {
  const node = useMemo(() => logEndRows(26), [])
  return (
    <section className="hm-design" aria-labelledby="pieces">
      <h2 id="pieces">The pieces (round three’s B2)</h2>
      <section className="hm-study" aria-labelledby="big-beaver">
        <h3 id="big-beaver">B2, the builder beaver, large</h3>
        <BothThemes>
          <div className="hm-row">
            {POSES.map(([pose, name]) => (
              <figure key={pose} className="hm-fig">
                <BigBeaver pose={pose} s={8} />
                <figcaption>{name}, 8×</figcaption>
              </figure>
            ))}
          </div>
        </BothThemes>
      </section>
      <section className="hm-study" aria-labelledby="logs">
        <h3 id="logs">One log = one, and stacks of 1, 5, 12</h3>
        <p className="hm-about">
          A log seen side-on: bark with darker streaks, a rounded left end, its round cut end at the
          right (pale wood with a ring where it fits), a dark outline round each (its top line is
          the line between it and the log over it). Under 5 px a plain log; at 1 px the stack is a
          plain column. The log look uses 1 to 12; bars keep 0 to 99. The stacks below are sized as
          in the round-three study (before the beaver’s lane); the scenes above size them with the
          lane.
        </p>
        <BothThemes>
          <div className="hm-row">
            {[9, 5].map((h) => (
              <figure key={h} className="hm-fig">
                <PixelArt rows={stackRows('log', 1, h, 41)} codes={CODES.log} s={8} kind="log" />
                <figcaption>one log, {h} px high, 8×</figcaption>
              </figure>
            ))}
            <figure className="hm-fig">
              <span className="hm-piece" style={{ width: 28 * 8, height: 28 * 8 }}>
                <PixelArt rows={node} codes={CODES.dam} s={8} kind="dam" />
                <span className="hm-badge is-bare" style={{ fontSize: 88, left: 112, top: 112 }}>
                  7
                </span>
              </span>
              <figcaption>the dam’s node, a log end, 8×</figcaption>
            </figure>
          </div>
          <div className="hm-row is-real">
            {UNIT_STAGES.map(({ size, h, w }) => (
              <figure key={size.id} className="hm-fig">
                <span className="hm-stacks">
                  {[1, 5, 12].map((count) => (
                    <PixelArt
                      key={count}
                      rows={stackRows('log', count, h, w)}
                      codes={CODES.log}
                      s={1}
                      kind="log"
                    />
                  ))}
                </span>
                <figcaption className="hm-stage-name">
                  {size.label.split(':')[0]}; {h} px a log
                </figcaption>
              </figure>
            ))}
          </div>
        </BothThemes>
      </section>
    </section>
  )
}
