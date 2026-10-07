/**
 * TEMPORARY (design/robot, never merged): one robot design drawing one step. The values are
 * crates whose height is the value; the robot scans, locks on, and carries.
 *
 * React draws the step's end state. On entering a step (or Replay) the motion that explains it
 * plays once with the Web Animations API, like the real stage; with reduced motion it doesn't
 * play, so the end state shows at once.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CLAW_CLOSED,
  CLAW_OPEN,
  HOPPER,
  HOPPER_HAPPY,
  ROVER,
  ROVER_HAPPY,
  HOOK,
  TROLLEY,
  TROLLEY_HAPPY,
  TROLLEY_SMALL,
} from './spriteData'
import { SpritePaths } from './SpritePaths'
import type { MockStep } from './steps'

/**
 * E ('scout') is B's hopper plus a crane on a thin rail; F ('boom') is B's hopper with a crane
 * arm; D ('mix') is B's robot with A's claw on jets.
 */
export type Design = 'scout' | 'boom' | 'mix' | 'gantry' | 'hopper' | 'rover'

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
/**
 * D's claw rig: the cable is this long when the claw grips, so the robot hovers RIG_ABOVE above
 * the top of the crate it carries (16 for its body, 6 of cable, 8 of claw, less 2 of grip).
 */
const RIG_CABLE = 6
const RIG_ABOVE = 28
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

// ---------- E and F: carries described as a pose over time, then sampled ----------

/** Eases between keyed values (ease-in-out in each stretch), like a hand-made timeline. */
type Key = readonly [number, number]
function curve(keys: readonly Key[]): (t: number) => number {
  return (t) => {
    const first = keys[0]
    if (!first || t <= first[0]) return first?.[1] ?? 0
    for (let k = 1; k < keys.length; k++) {
      const [t0, v0] = keys[k - 1] ?? first
      const [t1, v1] = keys[k] ?? first
      if (t <= t1) {
        const u = t1 === t0 ? 1 : (t - t0) / (t1 - t0)
        const eased = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
        return v0 + (v1 - v0) * eased
      }
    }
    return keys[keys.length - 1]?.[1] ?? 0
  }
}

/** Where E's and F's parts are at one moment of the carry. */
interface Pose {
  readonly robotX: number
  readonly robotY: number
  readonly carriedX: number
  readonly carriedBottom: number
  readonly otherX: number
  readonly otherOpacity: number
  readonly ghostOpacity: number
  /** E: the shadow under a crate passing in front of the others. */
  readonly shadow: number
  /** The front's platform and the gate: 0 until the crate lands. */
  readonly appear: number
  /** The cable hangs from (cableX, cableTop) and is `cable` long; the hook is on its end. */
  readonly cableX: number
  readonly cableTop: number
  readonly cable: number
  // E
  readonly trolleyX: number
  readonly armsLift: number
  readonly signal: number
  // F
  readonly pivotX: number
  readonly pivotY: number
  readonly angle: number
  readonly length: number
}

/**
 * E's thin rail: the trolley's left edge when parked near the right end (with room to roll in
 * the dance), and over slot k.
 */
const TROLLEY_PARK = WIDTH + PAD - 20
const trolleyOver = (k: number) => crateX(k) + 7
/** E: the cable hangs from the trolley's bottom. */
const TROLLEY_BOTTOM = 7
/** F: the boom's tip is at this height while it carries. */
const TIP_Y = 4
/** E's and F's carry takes a little longer: a signal or a step aside, then the crane. */
const TEAM_CARRY_MS = 3400
/** F: folded, the boom stands up from the robot's back this far. */
const FOLDED = 12
/** The hook: 6 tall, and it hooks 2 into the crate's top. */
const HOOK_H = 6

/** The crate next to the smallest that the scout steps onto, so the smallest can be lifted. */
const asideOf = (from: number) => (from + 1 < COUNT ? from + 1 : from - 1)

/** How low the carried crate's bottom must be to clear the crates it passes (and the scout). */
function clearBottomFor(array: readonly number[], from: number, to: number): number {
  const aside = asideOf(from)
  const tops = array
    .map((value, k) => (k > to && k < from ? crateTop(value) - (k === aside ? 16 : 0) : FLOOR))
    .concat(FLOOR + 2)
  return Math.min(...tops) - 2
}

/**
 * E's carry rule: lift the crate as high as fits under the trolley (its top no higher than
 * HIGHEST_TOP). If that clears the crates it passes, it goes over them; if not, it passes in
 * front of them, with a small shadow under it.
 */
const HIGHEST_TOP = TROLLEY_BOTTOM + 1 + HOOK_H - 2
function carryPlan(step: MockStep): { readonly clears: boolean; readonly bottom: number } {
  const { from, to } = step.carry ?? { from: 0, to: 0 }
  const h = crateH(step.array[to] ?? 0)
  const needed = clearBottomFor(step.array, from, to)
  const highest = HIGHEST_TOP + h
  return needed >= highest ? { clears: true, bottom: needed } : { clears: false, bottom: highest }
}

/** The scout's hop from one crate top to another, as an arc. */
function hop(
  t: number,
  t0: number,
  t1: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
  const peak = Math.min(start.y, end.y) - 14
  const y = start.y + (end.y - start.y) * u
  return {
    x: start.x + (end.x - start.x) * u,
    y: y - (Math.min(start.y, end.y) - peak) * 4 * u * (1 - u),
  }
}

function teamPose(design: 'scout' | 'boom', step: MockStep): (t: number) => Pose {
  const { array } = step
  const { from, to } = step.carry ?? { from: 0, to: 0 }
  const value = array[to] ?? 0
  const h = crateH(value)
  const top = crateTop(value)
  const aside = asideOf(from)
  const standStart = hopperAt(from, value)
  const standEnd = hopperAt(aside, array[aside] ?? 0)
  const clear = clearBottomFor(array, from, to)
  const scout = design === 'scout'

  // When the crate hangs, and when the other one slides (as a ghost).
  const [hookOn, hookOff] = scout ? [0.42, 0.87] : [0.4, 0.86]
  const [slideFrom, slideTo] = scout ? [0.53, 0.75] : [0.52, 0.76]
  const appear = curve(
    scout
      ? [
          [0, 0],
          [0.86, 0],
          [0.9, 1],
        ]
      : [
          [0, 0],
          [0.84, 0],
          [0.88, 1],
        ],
  )
  const other = curve([
    [slideFrom, crateX(to)],
    [slideTo, crateX(from)],
  ])

  // E: the trolley rolls over, the cable lowers, lifts, travels, lowers, rises.
  const trolley = curve([
    [0, TROLLEY_PARK],
    [0.14, TROLLEY_PARK],
    [0.3, trolleyOver(from)],
    [slideFrom, trolleyOver(from)],
    [slideTo, trolleyOver(to)],
  ])
  // The cable's length when the hook grips a crate on the floor, and when it's lifted clear.
  const gripCable = scout ? top - 11 : top - TIP_Y - HOOK_H
  // E lifts as high as fits (over the others, or in front of them); F as before.
  const plan = carryPlan(step)
  const liftCable = scout
    ? gripCable - (FLOOR - plan.bottom)
    : Math.max(1, gripCable - (FLOOR - clear))
  const cable = curve(
    scout
      ? [
          [0, 2],
          [0.3, 2],
          [0.4, gripCable],
          [0.44, gripCable],
          [slideFrom, liftCable],
          [slideTo, liftCable],
          [0.85, gripCable],
          [0.88, gripCable],
          [0.95, 2],
        ]
      : [
          [0, 1],
          [0.3, 1],
          [0.38, gripCable],
          [0.42, gripCable],
          [slideFrom, liftCable],
          [slideTo, liftCable],
          [0.84, gripCable],
          [0.87, gripCable],
          [0.9, 1],
        ],
  )
  // E: the scout waves (arms up and down) and its antenna flashes, then steps aside.
  const arms = curve([
    [0, 0],
    [0.02, -7],
    [0.04, 0],
    [0.06, -7],
    [0.08, 0],
    [0.1, -7],
    [0.12, 0],
  ])
  const signal = curve([
    [0, 0],
    [0.005, 1],
    [0.115, 1],
    [0.125, 0],
  ])
  // F: the boom's tip goes from folded, out over the smallest, to the front, and back.
  const tipPhase = curve([
    [0, 0],
    [0.14, 0],
    [0.3, 1],
    [slideFrom, 1],
    [slideTo, 2],
    [0.88, 2],
    [0.98, 3],
  ])

  return (t) => {
    const stepT = scout ? 0.12 : 0
    const robot = t < stepT ? standStart : hop(t, stepT, stepT + 0.1, standStart, standEnd)
    const pivotX = robot.x + 1
    const pivotY = robot.y + 1
    const folded = { x: pivotX, y: pivotY - FOLDED }
    const over = (k: number) => ({ x: crateX(k) + CRATE_W / 2, y: TIP_Y })
    const phase = tipPhase(t)
    const legs = [folded, over(from), over(to), folded]
    const leg = Math.min(2, Math.floor(phase))
    const u = phase - leg
    const a = legs[leg] ?? folded
    const b = legs[leg + 1] ?? folded
    const tip = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }

    const trolleyX = trolley(t)
    const cableX = scout ? trolleyX + 5 : tip.x
    const cableTop = scout ? TROLLEY_BOTTOM : tip.y + 2
    const length = cable(t)
    const hanging = t >= hookOn && t <= hookOff
    const carriedBottom = hanging ? cableTop + length + HOOK_H - 2 + h : FLOOR
    const carriedX = hanging ? cableX - CRATE_W / 2 : t < hookOn ? crateX(from) : crateX(to)
    const sliding = t > slideFrom - 0.01 && t < slideTo + 0.01
    return {
      robotX: robot.x,
      robotY: robot.y,
      carriedX,
      carriedBottom,
      otherX: t < slideFrom ? crateX(to) : t > slideTo ? crateX(from) : other(t),
      otherOpacity: sliding ? 0 : 1,
      ghostOpacity: sliding ? 1 : 0,
      shadow: scout && !plan.clears && hanging && carriedBottom < FLOOR - 1 ? 1 : 0,
      appear: appear(t),
      cableX,
      cableTop,
      cable: length,
      trolleyX,
      armsLift: arms(t),
      signal: scout ? signal(t) : 0,
      pivotX,
      pivotY,
      angle: (Math.atan2(tip.y - pivotY, tip.x - pivotX) * 180) / Math.PI,
      length: Math.hypot(tip.x - pivotX, tip.y - pivotY),
    }
  }
}

/** E and F at rest (any step but the carry): crane parked, boom folded, scout on `slot`. */
function restPose(slot: number, value: number): Pose {
  const robot = hopperAt(slot, value)
  return {
    robotX: robot.x,
    robotY: robot.y,
    carriedX: 0,
    carriedBottom: FLOOR,
    otherX: 0,
    otherOpacity: 1,
    ghostOpacity: 0,
    shadow: 0,
    appear: 1,
    cableX: TROLLEY_PARK + 5,
    cableTop: TROLLEY_BOTTOM,
    cable: 2,
    trolleyX: TROLLEY_PARK,
    armsLift: 0,
    signal: 0,
    pivotX: robot.x + 1,
    pivotY: robot.y + 1,
    angle: -90,
    length: FOLDED,
  }
}

// ---------- E: the finale dance, in time with Finale V3 ----------

/** Finale V3's beats (ms): three "bleep-bloops", then "bee-DOO!" (sounds.ts). */
const DANCE_BEATS = [360, 450, 540] as const
const DANCE_DOO = 820
/** The dance lasts as long as the sound (its last note ends at about 1.14 s). */
const DANCE_MS = 1150
/** The hook dips this far for the bow (the cable's length, from 2 at rest). */
const BOW_CABLE = 8

interface DancePose {
  readonly hop: number
  readonly glow: number
  readonly armsLift: number
  readonly arms: number
  readonly trolleyShift: number
  readonly swing: number
  readonly cable: number
}

const roll = curve([
  [300, 0],
  [400, -6],
  [500, 6],
  [600, -4],
  [700, 0],
])
const pendulum = curve([
  [300, 0],
  [420, 12],
  [540, -10],
  [660, 7],
  [780, -3],
  [840, 0],
])
const bow = curve([
  [0, 2],
  [DANCE_DOO, 2],
  [900, BOW_CABLE],
])
const raise = curve([
  [700, 0],
  [DANCE_DOO, -7],
])

/** Where E's parts are, `t` ms into the dance. */
function dancePose(t: number): DancePose {
  let hop = 0
  let glow = 0
  for (const beat of DANCE_BEATS) {
    if (t >= beat && t <= beat + 80) hop = 4 * Math.sin((Math.PI * (t - beat)) / 80)
    if (t >= beat && t <= beat + 55) glow = 1
  }
  return {
    hop,
    glow,
    armsLift: raise(t),
    arms: t >= 700 ? 1 : 0,
    trolleyShift: roll(t),
    swing: pendulum(t),
    cable: bow(t),
  }
}

interface RobotSceneProps {
  readonly design: Design
  readonly step: MockStep
  readonly motion: boolean
  /** Changes on Replay, to play the step's motion again. */
  readonly replay: number
  /**
   * E's finale: when the dance starts. After the platform lights up (on the step or Replay), or
   * at once when the Finale sound is tapped, so sound and dance start together.
   */
  readonly danceDelayMs?: number
  readonly title: string
}

export function RobotScene({
  design,
  step,
  motion,
  replay,
  title,
  danceDelayMs = 400,
}: RobotSceneProps) {
  const crates = useRef(new Map<string, SVGGElement>())
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
  const rig = useRef<SVGGElement>(null)
  const jets = useRef<SVGGElement>(null)
  // E and F
  const trolley = useRef<SVGGElement>(null)
  const line = useRef<SVGGElement>(null)
  const hook = useRef<SVGGElement>(null)
  const signal = useRef<SVGGElement>(null)
  const waving = useRef<SVGGElement>(null)
  const swing = useRef<SVGGElement>(null)
  const platform = useRef<SVGGElement>(null)
  const shadow = useRef<SVGRectElement>(null)
  const boom = useRef<SVGGElement>(null)
  const boomBar = useRef<SVGGElement>(null)

  const { array, sortedCount } = step
  /** Each crate's key: its value, and which one of that value it is (two 9s: "9" and "9#2"). */
  const crateKeys = useMemo(
    () =>
      array.map((value, k) => {
        const before = array.slice(0, k).filter((other) => other === value).length
        return before === 0 ? String(value) : `${String(value)}#${String(before + 1)}`
      }),
    [array],
  )
  const finale = step.id === 'finale'
  /** E and F: the scout plus a crane. */
  const team = design === 'scout' || design === 'boom'
  /** B, D, E and F stand on the smallest so far and hop. */
  const hops = design === 'hopper' || design === 'mix' || team
  const robotSlot = hops
    ? team && step.carry
      ? asideOf(step.carry.from)
      : (step.smallest ?? COUNT - 1)
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
    /** The crate now at position k (crates are keyed by value, so the same crate moves). */
    const crate = (k: number) => crates.current.get(crateKeys[k] ?? '') ?? null

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
      if (hops) {
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

    if (step.id === 'grab' && step.carry && team) {
      // Sampled from the pose timeline, so the trolley, cable, hook, boom and crate stay together.
      const { from, to } = step.carry
      const pose = teamPose(design, step)
      const samples = 72
      const frames = Array.from({ length: samples + 1 }, (_, k) => ({
        offset: k / samples,
        p: pose(k / samples),
      }))
      const track = (element: Element | null, keyframe: (p: Pose) => Keyframe) => {
        play(
          element,
          frames.map(({ offset, p }) => ({ offset, ...keyframe(p) })),
          TEAM_CARRY_MS,
          { easing: 'linear' },
        )
      }
      track(crate(to), (p) => ({ transform: at(p.carriedX, p.carriedBottom) }))
      track(crate(from), (p) => ({
        transform: at(p.otherX, FLOOR),
        opacity: p.otherOpacity,
      }))
      track(ghost.current, (p) => ({ transform: at(p.otherX, FLOOR), opacity: p.ghostOpacity }))
      track(shadow.current, (p) => ({
        transform: at(p.carriedX, p.carriedBottom),
        opacity: p.shadow,
      }))
      track(robot.current, (p) => ({ transform: at(p.robotX, p.robotY) }))
      track(gate.current, (p) => ({ opacity: p.appear }))
      track(newlySorted.current, (p) => ({ opacity: p.appear }))
      track(line.current, (p) => ({
        transform: `translate(${String(p.cableX - 0.5)}px, ${String(p.cableTop)}px) scale(1, ${String(p.cable)})`,
      }))
      track(hook.current, (p) => ({ transform: at(p.cableX - 2, p.cableTop + p.cable) }))
      if (design === 'scout') {
        track(trolley.current, (p) => ({ transform: at(p.trolleyX, 1) }))
        track(signal.current, (p) => ({ opacity: p.signal }))
        track(waving.current, (p) => ({ transform: at(0, p.armsLift), opacity: p.signal }))
      } else {
        track(boom.current, (p) => ({
          transform: `translate(${String(p.pivotX)}px, ${String(p.pivotY)}px) rotate(${String(p.angle)}deg)`,
        }))
        track(boomBar.current, (p) => ({ transform: `scale(${String(p.length)}, 1)` }))
      }
    } else if (step.id === 'grab' && step.carry) {
      const { from, to } = step.carry
      const carried = crate(to)
      const other = crate(from)
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
      if (design === 'mix') {
        // The robot rises off the crate on its jets, lowers its claw, grips, lifts the crate
        // just clear of the crates it passes (never off the top of the stage), carries it to the
        // front, sets it down, lets go and lands on it.
        const passedTops = array.slice(to + 1, from).map(crateTop)
        const clearBottom = Math.max(Math.min(FLOOR, ...passedTops) - 2, crateH(value) + RIG_ABOVE)
        const lift = FLOOR - clearBottom
        const x0 = crateX(from) + 5
        const x1 = crateX(to) + 5
        const stand = top - 16
        const hover = top - RIG_ABOVE
        play(
          robot.current,
          [
            { transform: at(x0, stand), offset: 0 },
            { transform: at(x0, hover), offset: 0.12 },
            { transform: at(x0, hover), offset: 0.24 },
            { transform: at(x0, hover - lift), offset: 0.42 },
            { transform: at(x1, hover - lift), offset: 0.72 },
            { transform: at(x1, hover), offset: 0.86 },
            { transform: at(x1, hover), offset: 0.9 },
            { transform: at(x1, stand), offset: 0.98 },
            { transform: at(x1, stand) },
          ],
          total,
        )
        const reach = (length: number) => [
          { offset: 0, length: 0.5 },
          { offset: 0.12, length },
          { offset: 0.9, length },
          { offset: 0.98, length: 0.5 },
          { offset: 1, length: 0.5 },
        ]
        play(
          cable.current,
          reach(RIG_CABLE).map(({ offset, length }) => ({
            offset,
            transform: `translate(6.5px, 16px) scale(1, ${String(length)})`,
          })),
          total,
        )
        play(
          claw.current,
          reach(RIG_CABLE).map(({ offset, length }) => ({ offset, transform: at(1, 16 + length) })),
          total,
        )
        play(
          rig.current,
          [
            { opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.05 },
            { opacity: 1, offset: 0.95 },
            { opacity: 0 },
          ],
          total,
        )
        play(
          jets.current,
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: 0.06 },
            { opacity: 1, offset: 0.1 },
            { opacity: 0.5, offset: 0.3 },
            { opacity: 1, offset: 0.5 },
            { opacity: 0.5, offset: 0.7 },
            { opacity: 1, offset: 0.9 },
            { opacity: 0, offset: 0.97 },
            { opacity: 0 },
          ],
          total,
        )
        const closed = [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.2 },
          { opacity: 1, offset: 0.22 },
          { opacity: 1, offset: 0.89 },
          { opacity: 0, offset: 0.9 },
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
            { transform: at(crateX(from), FLOOR), offset: 0.24 },
            { transform: at(crateX(from), FLOOR - lift), offset: 0.42 },
            { transform: at(crateX(to), FLOOR - lift), offset: 0.72 },
            { transform: at(crateX(to), FLOOR), offset: 0.86 },
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

    if (step.id === 'finale' && design === 'scout') {
      // The platform lights up, then the two dance, in time with Finale V3, and end together
      // in a pose they hold: the scout's arms up, the crane's hook dipped in a bow.
      if (danceDelayMs > 0) {
        play(platform.current, [{ opacity: 0 }, { opacity: 1 }], Math.min(350, danceDelayMs))
      }
      const base = hopperAt(robotSlot, array[robotSlot] ?? 0)
      const samples = 69
      const frames = Array.from({ length: samples + 1 }, (_, k) => ({
        offset: k / samples,
        p: dancePose((k / samples) * DANCE_MS),
      }))
      const track = (element: Element | null, keyframe: (p: DancePose) => Keyframe) => {
        play(
          element,
          frames.map(({ offset, p }) => ({ offset, ...keyframe(p) })),
          DANCE_MS,
          { easing: 'linear', delay: danceDelayMs, fill: 'backwards' },
        )
      }
      track(robot.current, (p) => ({ transform: at(base.x, base.y - p.hop) }))
      track(signal.current, (p) => ({ opacity: p.glow }))
      track(waving.current, (p) => ({ transform: at(0, p.armsLift), opacity: p.arms }))
      track(trolley.current, (p) => ({ transform: at(TROLLEY_PARK + p.trolleyShift, 1) }))
      const cableX = (p: DancePose) => TROLLEY_PARK + p.trolleyShift + 5
      track(swing.current, (p) => ({
        transform: `translate(${String(cableX(p))}px, ${String(TROLLEY_BOTTOM)}px) rotate(${String(p.swing)}deg) translate(${String(-cableX(p))}px, ${String(-TROLLEY_BOTTOM)}px)`,
      }))
      track(line.current, (p) => ({
        transform: `translate(${String(cableX(p) - 0.5)}px, ${String(TROLLEY_BOTTOM)}px) scale(1, ${String(p.cable)})`,
      }))
      track(hook.current, (p) => ({ transform: at(cableX(p) - 2, TROLLEY_BOTTOM + p.cable) }))
    } else if (step.id === 'finale') {
      // The crates bob left to right; the robot goes along the line celebrating.
      array.forEach((_, k) => {
        play(
          crate(k),
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
      if (hops) {
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
  }, [array, crateKeys, danceDelayMs, design, hops, motion, replay, robotSlot, step, team])

  const beamTarget = step.checking
  const beamValue = beamTarget === null ? undefined : array[beamTarget]
  // E and F at rest, or where the carry ends.
  const still =
    team && step.id === 'grab' && step.carry
      ? teamPose(design, step)(1)
      : restPose(robotSlot, array[robotSlot] ?? 0)
  const stillRad = (still.angle * Math.PI) / 180
  const stillTip = {
    x: still.pivotX + still.length * Math.cos(stillRad),
    y: still.pivotY + still.length * Math.sin(stillRad),
  }
  const stillCableX = design === 'boom' ? stillTip.x : still.cableX
  const stillCableTop = design === 'boom' ? stillTip.y + 2 : still.cableTop
  const stillCable = design === 'boom' ? 1 : design === 'scout' && finale ? BOW_CABLE : still.cable

  const hopperValue = array[robotSlot] ?? 0
  const hopper = hopperAt(robotSlot, hopperValue)

  const drawOrder = array.map((_, k) => k)
  if (design === 'scout' && step.id === 'grab' && step.carry && !carryPlan(step).clears) {
    // The crate passes in front of the others, so it's drawn last.
    const carriedIndex = step.carry.to
    drawOrder.splice(drawOrder.indexOf(carriedIndex), 1)
    drawOrder.push(carriedIndex)
  }

  /** The beam, from the robot to the value it's checking. */
  const beamLayer = beamTarget !== null && beamValue !== undefined && (
    <g ref={beam} className="robot-beam">
      {design === 'gantry' && (
        <polygon
          points={`${String(trolleyX(beamTarget) + 6)},20 ${String(trolleyX(beamTarget) + 10)},20 ${String(crateX(beamTarget) + CRATE_W + 1)},${String(crateTop(beamValue))} ${String(crateX(beamTarget) - 1)},${String(crateTop(beamValue))}`}
        />
      )}
      {hops && step.smallest !== null && step.smallest !== beamTarget && (
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
      <g ref={platform}>
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
      </g>

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

      {/* The beam: behind the crates, except B's and D's, which pass in front of them. */}
      {!hops && beamLayer}

      {/* The crates, keyed by value so the same crate moves when it's carried. */}
      {drawOrder.map((k) => {
        const value = array[k] ?? 0
        const key = crateKeys[k] ?? String(k)
        return (
          <g
            key={key}
            ref={(element) => {
              if (element) crates.current.set(key, element)
              else crates.current.delete(key)
            }}
            transform={attr(crateX(k), FLOOR)}
          >
            <Crate value={value} />
          </g>
        )
      })}

      {/* E: a small shadow under a crate passing in front of the others (only in motion). */}
      {design === 'scout' && step.carry && (
        <rect
          ref={shadow}
          opacity={0}
          x={3}
          y={1}
          width={CRATE_W - 2}
          height={3}
          fill="var(--robot-outline)"
          fillOpacity={0.35}
        />
      )}

      {/* While carrying: the outline of the crate going the other way (shown only in motion). */}
      {step.carry && (
        <g ref={ghost} opacity={0} transform={attr(crateX(step.carry.from), FLOOR)}>
          <GhostCrate value={array[step.carry.from] ?? 0} />
        </g>
      )}

      {hops && beamLayer}

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
      {team && (
        <>
          {design === 'scout' && (
            <>
              {/* A thin rail along the top edge, with only the trolley on it. */}
              <rect x={-PAD} y={1} width={WIDTH + 2 * PAD} height={2} fill="var(--robot-steel)" />
              <g ref={trolley} transform={attr(still.trolleyX, 1)}>
                <SpritePaths sprite={TROLLEY_SMALL} />
              </g>
            </>
          )}
          {design === 'boom' && (
            <g
              ref={boom}
              transform={`translate(${String(still.pivotX)} ${String(still.pivotY)}) rotate(${String(still.angle)})`}
            >
              <g ref={boomBar} transform={`scale(${String(still.length)} 1)`}>
                <rect x={0} y={-2} width={1} height={4} fill="var(--robot-outline)" />
                <rect x={0} y={-1} width={1} height={2} fill="var(--robot-steel)" />
              </g>
            </g>
          )}
          {/* The cable and hook (the group swings them like a pendulum in E's dance). */}
          <g ref={swing}>
            <g
              ref={line}
              transform={`translate(${String(stillCableX - 0.5)} ${String(stillCableTop)}) scale(1 ${String(stillCable)})`}
            >
              <rect x={0} y={0} width={1} height={1} fill="var(--robot-outline)" />
            </g>
            <g ref={hook} transform={attr(stillCableX - 2, stillCableTop + stillCable)}>
              <SpritePaths sprite={HOOK} />
            </g>
          </g>
          <g ref={robot} transform={attr(still.robotX, still.robotY)}>
            {design === 'scout' && (
              <>
                {/* The antenna's glow, and the arms (they wave, and go up for the finale). */}
                <g ref={signal} opacity={0}>
                  <rect x={3} y={-3} width={8} height={5} fill="var(--robot-eye)" />
                </g>
                <g
                  ref={waving}
                  opacity={finale ? 1 : 0}
                  transform={finale ? attr(0, -7) : undefined}
                >
                  <rect x={-3} y={8} width={3} height={6} fill="var(--robot-outline)" />
                  <rect x={-2} y={9} width={1} height={4} fill="var(--robot-steel)" />
                  <rect x={14} y={8} width={3} height={6} fill="var(--robot-outline)" />
                  <rect x={15} y={9} width={1} height={4} fill="var(--robot-steel)" />
                </g>
              </>
            )}
            <SpritePaths sprite={finale ? HOPPER_HAPPY : HOPPER} />
          </g>
        </>
      )}
      {design === 'mix' && (
        <g ref={robot} transform={attr(hopper.x, hopper.y)}>
          {/* The claw rig and the jets, shown only while carrying. */}
          <g ref={rig} opacity={0}>
            <g ref={cable} transform="translate(6.5 16) scale(1 0.5)">
              <rect x={0} y={0} width={1} height={1} fill="var(--robot-outline)" />
            </g>
            <g ref={claw} transform={attr(1, 16.5)}>
              <g ref={clawOpen}>
                <SpritePaths sprite={CLAW_OPEN} />
              </g>
              <g ref={clawClosed} opacity={0}>
                <SpritePaths sprite={CLAW_CLOSED} />
              </g>
            </g>
            <g ref={jets}>
              <rect x={-3} y={9} width={3} height={6} fill="var(--robot-outline)" />
              <rect x={-2} y={10} width={1} height={4} fill="var(--robot-eye)" />
              <rect x={14} y={9} width={3} height={6} fill="var(--robot-outline)" />
              <rect x={15} y={10} width={1} height={4} fill="var(--robot-eye)" />
            </g>
          </g>
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
