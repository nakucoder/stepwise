/**
 * TEMPORARY (design/robot, never merged): one robot design drawing one step. The values are
 * crates whose height is the value; the robot scans, locks on, and carries.
 *
 * React draws the step's end state. On entering a step (or Replay) the motion that explains it
 * plays once with the Web Animations API, like the real stage; with reduced motion it doesn't
 * play, so the end state shows at once.
 */
import { useLayoutEffect, useRef } from 'react'
import {
  CLAW_CLOSED,
  CLAW_OPEN,
  HOPPER,
  HOPPER_HAPPY,
  ROVER,
  ROVER_HAPPY,
  TROLLEY,
  TROLLEY_HAPPY,
} from './spriteData'
import { SpritePaths } from './SpritePaths'
import type { MockStep } from './steps'

export type Design = 'gantry' | 'hopper' | 'rover'

const SLOT = 32
const COUNT = 6
const PAD = 16
const WIDTH = SLOT * COUNT
/** The rover needs its lane in front of the crates; the others end just under the floor. */
const heightOf = (design: Design) => (design === 'rover' ? 180 : 144)
const FLOOR = 132
const CRATE_W = 24
/** The gantry's claw hangs this far under the trolley when parked. */
const PARKED = 1

const crateX = (k: number) => k * SLOT + 4
const crateH = (value: number) => 10 + value * 9
const crateTop = (value: number) => FLOOR - crateH(value)
const at = (x: number, y: number) => `translate(${String(x)}px, ${String(y)}px)`
const attr = (x: number, y: number) => `translate(${String(x)} ${String(y)})`

/** Gantry: the trolley's left edge above slot k. */
const trolleyX = (k: number) => k * SLOT + 8
/** Hopper: standing on the crate in slot k. */
const hopperAt = (k: number, value: number) => ({ x: crateX(k) + 5, y: crateTop(value) - 16 })
/** Rover: its lifting arm under the left part of the crate in slot k. */
const roverX = (k: number) => k * SLOT - 15
const ROVER_Y = 151
/** The rover is drawn at 1.5× so it reads on a phone. */
const ROVER_SCALE = 1.5
const roverAt = (k: number) => `${at(roverX(k), ROVER_Y)} scale(${String(ROVER_SCALE)})`
/** The rover's camera, in scene units. */
const roverCamera = (k: number) => ({ x: roverX(k) + 2 * ROVER_SCALE, y: ROVER_Y + ROVER_SCALE })
/** The rover's arm, where a carried crate's bottom rests. */
const ARM_Y = ROVER_Y + 7 * ROVER_SCALE

interface RobotSceneProps {
  readonly design: Design
  readonly step: MockStep
  readonly motion: boolean
  /** Changes on Replay, to play the step's motion again. */
  readonly replay: number
  readonly title: string
}

export function RobotScene({ design, step, motion, replay, title }: RobotSceneProps) {
  const crates = useRef(new Map<number, SVGGElement>())
  const robot = useRef<SVGGElement>(null)
  const cable = useRef<SVGGElement>(null)
  const claw = useRef<SVGGElement>(null)
  const clawOpen = useRef<SVGGElement>(null)
  const clawClosed = useRef<SVGGElement>(null)
  const arms = useRef<SVGGElement>(null)
  const reticle = useRef<SVGGElement>(null)
  const beam = useRef<SVGGElement>(null)
  const gate = useRef<SVGGElement>(null)
  const newlySorted = useRef<SVGRectElement>(null)
  const ghost = useRef<SVGGElement>(null)

  const { array, sortedCount } = step
  const finale = step.id === 'finale'
  const robotSlot =
    design === 'hopper'
      ? (step.smallest ?? COUNT - 1)
      : step.carry
        ? step.carry.to
        : (step.checking ?? COUNT - 1)

  useLayoutEffect(() => {
    if (!motion) return
    const running: Animation[] = []
    const play = (
      element: Element | null,
      keyframes: Keyframe[],
      duration: number,
      options: KeyframeAnimationOptions = {},
    ) => {
      if (!element || typeof element.animate !== 'function') return
      running.push(element.animate(keyframes, { duration, easing: 'ease-in-out', ...options }))
    }
    const crate = (value: number | undefined) =>
      value === undefined ? null : (crates.current.get(value) ?? null)

    if (step.id === 'compare') {
      // The beam moves on from the last value it checked (2 steps left: 8) to this one.
      if (design === 'gantry') {
        play(
          robot.current,
          [{ transform: at(trolleyX(2), 0) }, { transform: at(trolleyX(3), 0) }],
          600,
        )
      }
      if (design === 'rover') {
        play(robot.current, [{ transform: roverAt(2) }, { transform: roverAt(3) }], 600)
      }
      play(beam.current, [{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], 900)
    }

    if (step.id === 'lock') {
      // The reticle jumps from the old smallest (2, slot 1) to the new one (1, slot 3) and snaps.
      play(
        reticle.current,
        [
          { transform: at(crateX(1), crateTop(2)) },
          { transform: `${at(crateX(3), crateTop(1))} scale(1.35)`, offset: 0.55 },
          { transform: `${at(crateX(3), crateTop(1))} scale(0.92)`, offset: 0.75 },
          { transform: at(crateX(3), crateTop(1)) },
        ],
        700,
      )
      play(
        reticle.current,
        [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }],
        500,
        {
          delay: 700,
        },
      )
      if (design === 'hopper') {
        const from = hopperAt(1, 2)
        const to = hopperAt(3, 1)
        play(
          robot.current,
          [
            { transform: at(from.x, from.y) },
            { transform: at((from.x + to.x) / 2, 14), offset: 0.5 },
            { transform: at(to.x, to.y) },
          ],
          700,
          { easing: 'linear' },
        )
      }
    }

    if (step.id === 'grab' && step.carry) {
      const { from, to } = step.carry
      const carried = crate(array[to])
      const other = crate(array[from])
      const value = array[to] ?? 0
      const top = crateTop(value)
      const total = 2200
      // The other crate becomes a dashed outline (a ghost) while it slides across, in front of
      // the others, so it never seems to crash through them; the crate reappears where it lands.
      play(
        other,
        [
          { transform: at(crateX(to), FLOOR), opacity: 1, offset: 0 },
          { transform: at(crateX(to), FLOOR), opacity: 1, offset: 0.43 },
          { transform: at(crateX(to), FLOOR), opacity: 0, offset: 0.45 },
          { transform: at(crateX(from), FLOOR), opacity: 0, offset: 0.75 },
          { transform: at(crateX(from), FLOOR), opacity: 1, offset: 0.77 },
          { transform: at(crateX(from), FLOOR), opacity: 1 },
        ],
        total,
      )
      play(
        ghost.current,
        [
          { transform: at(crateX(to), FLOOR), opacity: 0, offset: 0 },
          { transform: at(crateX(to), FLOOR), opacity: 0, offset: 0.43 },
          { transform: at(crateX(to), FLOOR), opacity: 1, offset: 0.45 },
          { transform: at(crateX(from), FLOOR), opacity: 1, offset: 0.75 },
          { transform: at(crateX(from), FLOOR), opacity: 0, offset: 0.77 },
          { transform: at(crateX(from), FLOOR), opacity: 0 },
        ],
        total,
      )
      // The front is final once the crate lands: its platform and the gate appear then.
      const appear = [{ opacity: 0 }, { opacity: 0, offset: 0.88 }, { opacity: 1 }]
      play(gate.current, appear, total)
      play(newlySorted.current, appear, total)
      if (design === 'gantry') {
        // Claw down, close, lift, travel, lower, open, back up.
        const reach = top + 2 - 8 - 16
        const lifted = 4
        const lift = reach - lifted
        play(
          robot.current,
          [
            { transform: at(trolleyX(from), 0), offset: 0 },
            { transform: at(trolleyX(from), 0), offset: 0.45 },
            { transform: at(trolleyX(to), 0), offset: 0.75 },
            { transform: at(trolleyX(to), 0) },
          ],
          total,
        )
        const cableAt = (length: number) => `translate(7.5px, 16px) scale(1, ${String(length)})`
        play(
          cable.current,
          [
            { transform: cableAt(PARKED), offset: 0 },
            { transform: cableAt(reach), offset: 0.2 },
            { transform: cableAt(reach), offset: 0.28 },
            { transform: cableAt(lifted), offset: 0.45 },
            { transform: cableAt(lifted), offset: 0.75 },
            { transform: cableAt(reach), offset: 0.88 },
            { transform: cableAt(reach), offset: 0.93 },
            { transform: cableAt(PARKED) },
          ],
          total,
        )
        const clawAt = (length: number) => at(2, 16 + length)
        play(
          claw.current,
          [
            { transform: clawAt(PARKED), offset: 0 },
            { transform: clawAt(reach), offset: 0.2 },
            { transform: clawAt(reach), offset: 0.28 },
            { transform: clawAt(lifted), offset: 0.45 },
            { transform: clawAt(lifted), offset: 0.75 },
            { transform: clawAt(reach), offset: 0.88 },
            { transform: clawAt(reach), offset: 0.93 },
            { transform: clawAt(PARKED) },
          ],
          total,
        )
        const closed = [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.24 },
          { opacity: 1, offset: 0.25 },
          { opacity: 1, offset: 0.9 },
          { opacity: 0, offset: 0.91 },
          { opacity: 0 },
        ]
        play(clawClosed.current, closed, total)
        play(
          clawOpen.current,
          closed.map((frame) => ({ ...frame, opacity: 1 - frame.opacity })),
          total,
        )
        play(
          carried,
          [
            { transform: at(crateX(from), FLOOR), offset: 0 },
            { transform: at(crateX(from), FLOOR), offset: 0.28 },
            { transform: at(crateX(from), FLOOR - lift), offset: 0.45 },
            { transform: at(crateX(to), FLOOR - lift), offset: 0.75 },
            { transform: at(crateX(to), FLOOR), offset: 0.88 },
            { transform: at(crateX(to), FLOOR) },
          ],
          total,
        )
      }
      if (design === 'hopper') {
        // The robot grips its crate and jumps with it, in an arc over the others, to the front.
        const peak = 40
        const start = hopperAt(from, value)
        const end = hopperAt(to, value)
        const rise = FLOOR - peak
        play(
          carried,
          [
            { transform: at(crateX(from), FLOOR), offset: 0 },
            { transform: at(crateX(from), FLOOR), offset: 0.3 },
            { transform: at((crateX(from) + crateX(to)) / 2, FLOOR - rise), offset: 0.6 },
            { transform: at(crateX(to), FLOOR), offset: 0.88 },
            { transform: at(crateX(to), FLOOR) },
          ],
          total,
        )
        play(
          robot.current,
          [
            { transform: at(start.x, start.y), offset: 0 },
            { transform: at(start.x, start.y + 3), offset: 0.22 },
            { transform: at(start.x, start.y), offset: 0.3 },
            { transform: at((start.x + end.x) / 2, start.y - rise), offset: 0.6 },
            { transform: at(end.x, end.y), offset: 0.88 },
            { transform: at(end.x, end.y) },
          ],
          total,
        )
        play(
          arms.current,
          [
            { opacity: 0, transform: at(crateX(from), top), offset: 0 },
            { opacity: 1, transform: at(crateX(from), top), offset: 0.2 },
            { opacity: 1, transform: at(crateX(from), top), offset: 0.3 },
            { opacity: 1, transform: at((crateX(from) + crateX(to)) / 2, top - rise), offset: 0.6 },
            { opacity: 1, transform: at(crateX(to), top), offset: 0.88 },
            { opacity: 0, transform: at(crateX(to), top) },
          ],
          total,
        )
      }
      if (design === 'rover') {
        // The crate is lowered onto the rover's arm in the front lane, driven to the front, and
        // pushed back up into the line.
        const drop = ARM_Y - FLOOR
        play(
          carried,
          [
            { transform: at(crateX(from), FLOOR), offset: 0 },
            { transform: at(crateX(from), FLOOR), offset: 0.15 },
            { transform: at(crateX(from), FLOOR + drop), offset: 0.35 },
            { transform: at(crateX(from), FLOOR + drop), offset: 0.45 },
            { transform: at(crateX(to), FLOOR + drop), offset: 0.75 },
            { transform: at(crateX(to), FLOOR), offset: 0.92 },
            { transform: at(crateX(to), FLOOR) },
          ],
          total,
        )
        play(
          robot.current,
          [
            { transform: roverAt(from), offset: 0 },
            { transform: roverAt(from), offset: 0.45 },
            { transform: roverAt(to), offset: 0.75 },
            { transform: roverAt(to) },
          ],
          total,
        )
      }
    }

    if (step.id === 'sorted') {
      // The gate moves one slot right and the newly final value's platform lights up.
      play(gate.current, [{ transform: at(2 * SLOT, 0) }, { transform: at(3 * SLOT, 0) }], 700)
      play(newlySorted.current, [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], 900)
      play(beam.current, [{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], 1100)
    }

    if (step.id === 'finale') {
      // The crates bob left to right; the robot goes along the line celebrating.
      array.forEach((value, k) => {
        play(
          crate(value),
          [
            { transform: at(crateX(k), FLOOR) },
            { transform: at(crateX(k), FLOOR - 6) },
            { transform: at(crateX(k), FLOOR) },
          ],
          360,
          { delay: k * 120 },
        )
      })
      if (design === 'gantry') {
        play(
          robot.current,
          [{ transform: at(trolleyX(0), 0) }, { transform: at(trolleyX(5), 0) }],
          1100,
        )
        play(
          claw.current,
          [{ transform: at(2, 17) }, { transform: at(2, 21) }, { transform: at(2, 17) }],
          275,
          {
            iterations: 4,
          },
        )
      }
      if (design === 'rover') {
        play(robot.current, [{ transform: roverAt(0) }, { transform: roverAt(5) }], 1100)
      }
      if (design === 'hopper') {
        const frames: Keyframe[] = []
        array.forEach((value, k) => {
          const spot = hopperAt(k, value)
          frames.push({ transform: at(spot.x, spot.y), offset: k / COUNT })
          frames.push({ transform: at(spot.x + SLOT / 2, spot.y - 14), offset: (k + 0.5) / COUNT })
        })
        const last = hopperAt(5, array[5] ?? 0)
        frames.push({ transform: at(last.x, last.y), offset: 1 })
        play(robot.current, frames, 1300, { easing: 'linear' })
      }
    }

    return () => {
      for (const animation of running) animation.cancel()
    }
  }, [array, design, motion, replay, step])

  const beamTarget = step.checking
  const beamValue = beamTarget === null ? undefined : array[beamTarget]
  const hopperValue = array[robotSlot] ?? 0
  const hopper = hopperAt(robotSlot, hopperValue)

  const drawOrder = array.map((_, k) => k)

  /** The beam, from the robot to the value it's checking. */
  const beamLayer = beamTarget !== null && beamValue !== undefined && (
    <g ref={beam} className="robot-beam">
      {design === 'gantry' && (
        <polygon
          points={`${String(trolleyX(beamTarget) + 6)},20 ${String(trolleyX(beamTarget) + 10)},20 ${String(crateX(beamTarget) + CRATE_W + 1)},${String(crateTop(beamValue))} ${String(crateX(beamTarget) - 1)},${String(crateTop(beamValue))}`}
        />
      )}
      {design === 'hopper' && step.smallest !== null && step.smallest !== beamTarget && (
        <polygon
          points={`${String(hopper.x + 10)},${String(hopper.y + 5)} ${String(hopper.x + 10)},${String(hopper.y + 7)} ${String(crateX(beamTarget) + CRATE_W - 2)},${String(crateTop(beamValue) - 2)} ${String(crateX(beamTarget) + 2)},${String(crateTop(beamValue) - 2)}`}
        />
      )}
      {design === 'rover' && (
        <>
          <polygon
            points={`${String(roverCamera(beamTarget).x)},${String(roverCamera(beamTarget).y)} ${String(roverCamera(beamTarget).x + 3)},${String(roverCamera(beamTarget).y)} ${String(crateX(beamTarget) + CRATE_W)},${String(FLOOR + 3)} ${String(crateX(beamTarget))},${String(FLOOR + 3)}`}
          />
          <rect
            x={crateX(beamTarget) - 1}
            y={crateTop(beamValue) - 1}
            width={CRATE_W + 2}
            height={crateH(beamValue) + 2}
          />
        </>
      )}
      <rect
        className="robot-beam-hit"
        x={crateX(beamTarget) - 1}
        y={crateTop(beamValue) - 2}
        width={CRATE_W + 2}
        height={2}
      />
    </g>
  )

  return (
    <svg
      className="robot-scene"
      viewBox={`${String(-PAD)} 0 ${String(WIDTH + 2 * PAD)} ${String(heightOf(design))}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${title}: ${step.caption}`}
    >
      {/* The floor, and the lit platform under the values in their final spot. */}
      <rect x={-PAD} y={FLOOR} width={WIDTH + 2 * PAD} height={3} fill="var(--color-line)" />
      {Array.from({ length: sortedCount }, (_, k) => (
        <rect
          key={k}
          ref={k === sortedCount - 1 ? newlySorted : undefined}
          x={k * SLOT + 1}
          y={FLOOR + 3}
          width={SLOT - 2}
          height={4}
          fill="var(--role-sorted)"
        />
      ))}

      {design === 'rover' && (
        <rect x={-PAD} y={174} width={WIDTH + 2 * PAD} height={2} fill="var(--robot-steel-dark)" />
      )}

      {/* The gate: just right of the last value in its final spot. */}
      {sortedCount > 0 && sortedCount < COUNT && (
        <g ref={gate} transform={attr(sortedCount * SLOT, 0)}>
          <rect x={-2} y={FLOOR - 34} width={4} height={40} fill="var(--robot-outline)" />
          <rect x={-1} y={FLOOR - 33} width={2} height={38} fill="var(--robot-steel)" />
          <rect x={-3} y={FLOOR - 38} width={6} height={5} fill="var(--robot-outline)" />
          <rect x={-2} y={FLOOR - 37} width={4} height={3} fill="var(--role-sorted)" />
        </g>
      )}

      {/* The beam: behind the crates, except the hopper's, which passes in front of them. */}
      {design !== 'hopper' && beamLayer}

      {/* The crates, keyed by value so the same crate moves when it's carried. */}
      {drawOrder.map((k) => {
        const value = array[k] ?? 0
        return (
          <g
            key={value}
            ref={(element) => {
              if (element) crates.current.set(value, element)
              else crates.current.delete(value)
            }}
            transform={attr(crateX(k), FLOOR)}
          >
            <Crate value={value} />
          </g>
        )
      })}

      {/* While carrying: the outline of the crate going the other way (shown only in motion). */}
      {step.carry && (
        <g ref={ghost} opacity={0} transform={attr(crateX(step.carry.from), FLOOR)}>
          <GhostCrate value={array[step.carry.from] ?? 0} />
        </g>
      )}

      {design === 'hopper' && beamLayer}

      {/* Lock-on: a target reticle on the smallest so far. */}
      {step.smallest !== null && step.id !== 'grab' && (
        <g
          ref={reticle}
          transform={attr(crateX(step.smallest), crateTop(array[step.smallest] ?? 0))}
        >
          <Reticle />
        </g>
      )}

      {/* The hopper's grip, shown while it carries a crate. */}
      {design === 'hopper' && (
        <g ref={arms} opacity={0}>
          <rect x={-2} y={-1} width={3} height={10} fill="var(--robot-outline)" />
          <rect x={CRATE_W - 1} y={-1} width={3} height={10} fill="var(--robot-outline)" />
          <rect x={-1} y={0} width={1} height={8} fill="var(--robot-steel)" />
          <rect x={CRATE_W} y={0} width={1} height={8} fill="var(--robot-steel)" />
        </g>
      )}

      {/* The robot. */}
      {design === 'gantry' && (
        <>
          <Rail />
          <g ref={robot} transform={attr(trolleyX(robotSlot), 0)}>
            <g ref={cable} transform={`translate(7.5 16) scale(1 ${String(PARKED)})`}>
              <rect x={0} y={0} width={1} height={1} fill="var(--robot-outline)" />
            </g>
            <g ref={claw} transform={attr(2, 16 + PARKED)}>
              <g ref={clawOpen}>
                <SpritePaths sprite={CLAW_OPEN} />
              </g>
              <g ref={clawClosed} opacity={0}>
                <SpritePaths sprite={CLAW_CLOSED} />
              </g>
            </g>
            <g transform={attr(0, 4)}>
              <SpritePaths sprite={finale ? TROLLEY_HAPPY : TROLLEY} />
            </g>
          </g>
        </>
      )}
      {design === 'hopper' && (
        <g ref={robot} transform={attr(hopper.x, hopper.y)}>
          <SpritePaths sprite={finale ? HOPPER_HAPPY : HOPPER} />
        </g>
      )}
      {design === 'rover' && (
        <g
          ref={robot}
          transform={`${attr(roverX(robotSlot), ROVER_Y)} scale(${String(ROVER_SCALE)})`}
        >
          <SpritePaths sprite={finale ? ROVER_HAPPY : ROVER} />
        </g>
      )}
    </svg>
  )
}

/** A crate whose height is its value: wooden planks, steel corners, the number near the top. */
function Crate({ value }: { readonly value: number }) {
  const h = crateH(value)
  const planks = Math.floor((h - 2) / 9)
  return (
    <>
      <rect x={0} y={-h} width={CRATE_W} height={h} fill="var(--robot-outline)" />
      <rect x={1} y={-h + 1} width={CRATE_W - 2} height={h - 2} fill="var(--crate-wood)" />
      {Array.from({ length: planks }, (_, m) => (
        <rect
          key={m}
          x={1}
          y={-h + 1 + (m + 1) * 9 - 1}
          width={CRATE_W - 2}
          height={1}
          fill="var(--crate-plank)"
        />
      ))}
      {[
        [1, -h + 1],
        [CRATE_W - 4, -h + 1],
        [1, -4],
        [CRATE_W - 4, -4],
      ].map(([x = 0, y = 0]) => (
        <rect
          key={`${String(x)},${String(y)}`}
          x={x}
          y={y}
          width={3}
          height={3}
          fill="var(--robot-steel-dark)"
        />
      ))}
      <text
        className="crate-number"
        x={CRATE_W / 2}
        y={-h + 9}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </>
  )
}

/** A crate's dashed outline and number, in the theme's ink: a crate on the move. */
function GhostCrate({ value }: { readonly value: number }) {
  const h = crateH(value)
  return (
    <>
      <rect
        x={1}
        y={-h + 1}
        width={CRATE_W - 2}
        height={h - 2}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={2}
        strokeDasharray="3 2"
      />
      <text
        className="crate-number crate-ghost-number"
        x={CRATE_W / 2}
        y={-h + 9}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </>
  )
}

/** Four corner brackets around the top of a crate, in the "looking" yellow with a dark edge. */
function Reticle() {
  const arm = 7
  const corners: readonly (readonly [number, number, number, number])[] = [
    [-4, -4, 1, 1],
    [CRATE_W + 4, -4, -1, 1],
    [-4, 18, 1, -1],
    [CRATE_W + 4, 18, -1, -1],
  ]
  return (
    <g className="robot-reticle">
      {corners.map(([x, y, sx, sy]) => {
        // Each corner: a horizontal and a vertical arm, 2 units thick, outlined.
        const hx = sx > 0 ? x : x - arm
        const vy = sy > 0 ? y : y - arm
        const hy = sy > 0 ? y : y - 2
        const vx = sx > 0 ? x : x - 2
        return (
          <g key={`${String(x)},${String(y)}`}>
            <rect x={hx - 1} y={hy - 1} width={arm + 2} height={4} fill="var(--robot-outline)" />
            <rect x={vx - 1} y={vy - 1} width={4} height={arm + 2} fill="var(--robot-outline)" />
            <rect x={hx} y={hy} width={arm} height={2} fill="var(--role-comparing)" />
            <rect x={vx} y={vy} width={2} height={arm} fill="var(--role-comparing)" />
          </g>
        )
      })}
    </g>
  )
}

/** The gantry's rail across the top, with rivets. */
function Rail() {
  return (
    <g>
      <rect x={-PAD} y={7} width={WIDTH + 2 * PAD} height={5} fill="var(--robot-outline)" />
      <rect x={-PAD} y={8} width={WIDTH + 2 * PAD} height={3} fill="var(--robot-steel-dark)" />
      {Array.from({ length: (WIDTH + 2 * PAD) / 12 }, (_, k) => (
        <rect
          key={k}
          x={-PAD + 4 + k * 12}
          y={9}
          width={1}
          height={1}
          fill="var(--robot-steel-light)"
        />
      ))}
    </g>
  )
}
