// hooks/useAlertsHubMock.ts
import { useEffect, useRef, useState } from 'react'

type LatLngAlt = [number, number, number]
type Heading = 'nb' | 'sb' | 'eb' | 'wb'
type MovementType = 'left' | 'right' | 'through' | 'u-turn' | 'pedestrian'
type ObjectType =
  | 'vehicle'
  | 'pedestrian'
  | 'cyclist'
  | 'unclassified'
  | 'animal'
  | 'aircraft'
  | 'railcar'

type ObjectCommon = {
  classification: string
  id: [number, number]
  lwh: [number, number, number]
  type: ObjectType
  position: LatLngAlt
  speed: number // m/s
}

export type WrongWayAlert = {
  detector: number
  id: number
  log: {
    position: LatLngAlt
    speed: number
    state: 'tracking' | 'tracking-lost' | 'course-corrected' | string
    timestamp: number
  }[]
  object: {
    classification: string
    id: [number, number]
    lwh: [number, number, number]
    type: ObjectType
  }
  recording: number
  timestamp: number // created time (ms)
  type: 'object.wrong-way' | string
}

export type IllegalMovementAlert = {
  detector: number
  id: number
  type: 'intersection.illegal-movement' | string
  movement: {
    heading: Heading
    type: 'through' | 'left' | 'right' | 'u-turn' | 'pedestrian'
    zone: number
  }
  object: ObjectCommon
  recording: number
  timestamp: number
}

export type NearMissAlert = {
  detector: number
  id: number
  type: 'intersection.near-miss' | string
  timestamp: number
  recording: number
  intersect: LatLngAlt
  pet: number // ms
  severity: 'unsafe' | 'critical'
  leading: {
    id: [number, number]
    type: ObjectType
    classification: string
    lwh: [number, number, number]
    speed: number
    position: LatLngAlt
  }
  trailing: {
    id: [number, number]
    type: ObjectType
    classification: string
    lwh: [number, number, number]
    speed: number
    position: LatLngAlt
  }
}

export type RedLightAlert = {
  detector: number
  id: number
  type: 'intersection.red-light' | string
  timestamp: number
  recording: number
  object: {
    id: [number, number]
    type: ObjectType
    classification: string
    lwh: [number, number, number]
    speed: number
    position: LatLngAlt
  }
  movement: {
    heading: Heading
    type: MovementType
    certainty: 'realized' | 'unrealized'
    ppt: number // ms
  }
  movements: {
    heading: Heading
    type: MovementType
    timestamp: number
    duration: number
    indication:
      | 'none'
      | 'red'
      | 'yellow'
      | 'green'
      | 'prepare-to-go'
      | 'flashing-green'
      | 'flashing-yellow'
      | 'flashing-red'
      | 'fya'
      | 'fra'
      | 'dont-walk'
      | 'flashing-dont-walk'
      | 'walk'
    state: 'protected' | 'permissive' | 'permissive-after-stop' | 'prohibited'
  }[]
}

export type AlertEvent =
  | WrongWayAlert
  | IllegalMovementAlert
  | NearMissAlert
  | RedLightAlert

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}
function randInt(min: number, max: number) {
  return Math.floor(randBetween(min, max + 1))
}
function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const HEADINGS: readonly Heading[] = ['nb', 'sb', 'eb', 'wb']
const MOVE_TYPES: readonly MovementType[] = [
  'left',
  'right',
  'through',
  'u-turn',
  'pedestrian',
]
const OBJ_TYPES: readonly ObjectType[] = [
  'vehicle',
  'pedestrian',
  'cyclist',
  'unclassified',
]

type ActiveWrongWay = {
  id: number
  detector: number
  createdAtMs: number
  recording: number
  object: WrongWayAlert['object']
  log: WrongWayAlert['log']
  lat: number
  lng: number
  headingRad: number
  turnCountdown: number
  turning: boolean
  turnRateRad: number
  frameIndex: number
  maxFrames: number
}

export function useAlertsHubMock() {
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [state, setState] = useState<
    'Disconnected' | 'Connecting' | 'Connected'
  >('Connecting')

  const startedRef = useRef(false)
  const idCounterRef = useRef(9057)

  // base point (Utah-ish)
  const BASE_LAT = 40.65311
  const BASE_LNG = -111.952445

  // one message per second
  const TICK_MS = 2000

  // cap stored messages so sidebar doesn’t grow forever
  const MAX_MESSAGES = 250

  // wrong-way active incident state
  const activeWrongWayRef = useRef<ActiveWrongWay | null>(null)

  // movement tuning for wrong-way (degrees are in lat/lng space, not meters)
  const STEP = 0.00022
  const JITTER = 0.00001

  const randomNearby = (): LatLngAlt => {
    const lat = BASE_LAT + randBetween(-0.1, 0.1)
    const lng = BASE_LNG + randBetween(-0.1, 0.1)
    return [lat, lng, 0.0]
  }

  const randomLwh = (): [number, number, number] => [
    randBetween(3.2, 5.2),
    randBetween(1.6, 2.2),
    randBetween(1.3, 2.2),
  ]

  const makeObjectCommon = (ts: number, pos: LatLngAlt): ObjectCommon => {
    const objType = pick(OBJ_TYPES)
    const classification =
      objType === 'vehicle'
        ? pick(['car', 'truck', 'van'])
        : objType === 'pedestrian'
          ? 'pedestrian'
          : objType === 'cyclist'
            ? 'bicycle'
            : 'unknown'

    return {
      classification,
      id: [randInt(1, 9999), ts],
      lwh: randomLwh(),
      type: objType,
      position: pos,
      speed: randBetween(1.0, 18.0),
    }
  }

  const maybeRecording = (chance: number, id: number) =>
    Math.random() < chance ? 10_000 + (id % 10_000) : 0

  const emit = (evt: AlertEvent) => {
    setEvents((prev) => {
      const next = [...prev, evt]
      return next.length > MAX_MESSAGES
        ? next.slice(next.length - MAX_MESSAGES)
        : next
    })
  }

  const chooseTurnBehavior = (a: ActiveWrongWay) => {
    a.turnCountdown = randInt(6, 16)
    a.turning = Math.random() < 0.4
    if (a.turning) {
      const dir = Math.random() < 0.5 ? -1 : 1
      a.turnRateRad = dir * randBetween(0.03, 0.09)
    } else {
      a.turnRateRad = randBetween(-0.01, 0.01)
    }
  }

  const ensureWrongWayActive = () => {
    if (activeWrongWayRef.current) return

    const id = ++idCounterRef.current
    const createdAtMs = Date.now()
    const detector = randInt(1, 4)

    const [lat, lng] = randomNearby()
    const object: WrongWayAlert['object'] = {
      classification: 'car',
      id: [randInt(1, 9999), createdAtMs],
      lwh: randomLwh(),
      type: 'vehicle',
    }

    const firstLog: WrongWayAlert['log'] = [
      {
        position: [lat, lng, 0.0],
        speed: randBetween(14, 22),
        state: 'tracking',
        timestamp: createdAtMs,
      },
    ]

    const active: ActiveWrongWay = {
      id,
      detector,
      createdAtMs,
      recording: 0,
      object,
      log: firstLog,
      lat,
      lng,
      // start “north-ish”
      headingRad: randBetween(Math.PI * 0.35, Math.PI * 0.65),
      turnCountdown: randInt(6, 16),
      turning: false,
      turnRateRad: 0,
      frameIndex: 0,
      maxFrames: randInt(20, 60),
    }

    chooseTurnBehavior(active)
    activeWrongWayRef.current = active
  }

  const stepWrongWayAndEmit = () => {
    ensureWrongWayActive()
    const active = activeWrongWayRef.current
    if (!active) return

    const now = Date.now()

    active.turnCountdown -= 1
    if (active.turnCountdown <= 0) chooseTurnBehavior(active)

    active.headingRad += active.turnRateRad + randBetween(-0.006, 0.006)

    const dLat = Math.cos(active.headingRad) * STEP
    const dLng = Math.sin(active.headingRad) * STEP

    active.lat += dLat + randBetween(-JITTER, JITTER)
    active.lng += dLng + randBetween(-JITTER, JITTER)

    active.frameIndex += 1
    const isLast = active.frameIndex >= active.maxFrames

    if (
      active.recording === 0 &&
      active.frameIndex > 8 &&
      Math.random() < 0.08
    ) {
      active.recording = 10_000 + (active.id % 10_000)
    }

    const stateVal: WrongWayAlert['log'][number]['state'] = isLast
      ? 'tracking-lost'
      : 'tracking'

    active.log = [
      ...active.log,
      {
        position: [active.lat, active.lng, 0.0],
        speed: randBetween(14, 22),
        state: stateVal,
        timestamp: now,
      },
    ]

    emit({
      detector: active.detector,
      id: active.id,
      log: active.log,
      object: active.object,
      recording: active.recording,
      timestamp: active.createdAtMs, // created time stays constant
      type: 'object.wrong-way',
    })

    if (isLast) {
      activeWrongWayRef.current = null
    }
  }

  const emitIllegalMovement = () => {
    const now = Date.now()
    const id = ++idCounterRef.current
    const detector = randInt(1, 4)
    const pos = randomNearby()
    emit({
      detector,
      id,
      type: 'intersection.illegal-movement',
      movement: {
        heading: pick(HEADINGS),
        type: pick([
          'through',
          'left',
          'right',
          'u-turn',
          'pedestrian',
        ] as const),
        zone: randInt(1, 40),
      },
      object: makeObjectCommon(now, pos),
      recording: maybeRecording(0.12, id),
      timestamp: now,
    })
  }

  const emitNearMiss = () => {
    const now = Date.now()
    const id = ++idCounterRef.current
    const detector = randInt(1, 4)

    const intersect = randomNearby()
    const leadPos: LatLngAlt = [
      intersect[0] + randBetween(-0.00035, 0.00035),
      intersect[1] + randBetween(-0.00035, 0.00035),
      0.0,
    ]
    const trailPos: LatLngAlt = [
      intersect[0] + randBetween(-0.00035, 0.00035),
      intersect[1] + randBetween(-0.00035, 0.00035),
      0.0,
    ]

    const leadingObj = makeObjectCommon(now, leadPos)
    const trailingObj = makeObjectCommon(now + 1, trailPos)

    emit({
      detector,
      id,
      type: 'intersection.near-miss',
      timestamp: now,
      recording: maybeRecording(0.2, id),
      intersect,
      pet: randInt(200, 2200),
      severity: Math.random() < 0.35 ? 'critical' : 'unsafe',
      leading: {
        id: leadingObj.id,
        type: leadingObj.type,
        classification: leadingObj.classification,
        lwh: leadingObj.lwh,
        speed: leadingObj.speed,
        position: leadingObj.position,
      },
      trailing: {
        id: trailingObj.id,
        type: trailingObj.type,
        classification: trailingObj.classification,
        lwh: trailingObj.lwh,
        speed: trailingObj.speed,
        position: trailingObj.position,
      },
    })
  }

  const emitRedLight = () => {
    const now = Date.now()
    const id = ++idCounterRef.current
    const detector = randInt(1, 4)
    const pos = randomNearby()

    const objType = pick(OBJ_TYPES)
    const classification =
      objType === 'vehicle'
        ? pick(['car', 'truck', 'van'])
        : objType === 'pedestrian'
          ? 'pedestrian'
          : objType === 'cyclist'
            ? 'bicycle'
            : 'unknown'

    const movementHeading = pick(HEADINGS)
    const movementType = pick(MOVE_TYPES)

    const snapTs = now
    const movements = HEADINGS.flatMap((h) =>
      MOVE_TYPES.map((t) => {
        const indication = pick([
          'red',
          'yellow',
          'green',
          'flashing-yellow',
          'flashing-red',
          'dont-walk',
          'walk',
          'none',
        ] as const)

        const stateVal =
          indication === 'red' || indication === 'none'
            ? 'prohibited'
            : indication === 'yellow'
              ? pick(['protected', 'permissive'] as const)
              : pick([
                  'protected',
                  'permissive',
                  'permissive-after-stop',
                ] as const)

        return {
          heading: h,
          type: t,
          timestamp: snapTs,
          duration: randInt(0, 25_000),
          indication,
          state: stateVal,
        }
      })
    )

    emit({
      detector,
      id,
      type: 'intersection.red-light',
      timestamp: now,
      recording: maybeRecording(0.25, id),
      object: {
        id: [randInt(1, 9999), now],
        type: objType,
        classification,
        lwh: randomLwh(),
        speed: randBetween(2.0, 18.0),
        position: pos,
      },
      movement: {
        heading: movementHeading,
        type: movementType,
        certainty: Math.random() < 0.75 ? 'realized' : 'unrealized',
        ppt: randInt(50, 2500),
      },
      movements,
    })
  }

  const emitOneTick = () => {
    const r = Math.random()
    // red light: 40%, near miss: 30%, illegal: 28%, wrong way: 2%
    if (r < 0.4) emitRedLight()
    else if (r < 0.7) emitNearMiss()
    else if (r < 0.98) emitIllegalMovement()
    else stepWrongWayAndEmit()
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    setState('Connected')

    const intervalId = setInterval(() => {
      emitOneTick()
    }, TICK_MS)

    return () => clearInterval(intervalId)
  }, [])

  return {
    state,
    events, // ✅ mixed event stream (1 per second)
  }
}
