// types.ts
// AID (Automatic Incident Detection) incident payloads for app/aid/incident/*

// ---------- shared primitives ----------

/** WGS-84 decimal degrees + altitude (meters). Docs/examples use [lat,lon,alt] and [lat,lng,alt]. */
export type LatLngAlt = [lat: number, lng: number, alt: number]

/** The docs call this a UUID as an array of numbers; examples show 2 numbers, but keep it flexible. */
export type AidObjectId = number[]

export type AidObjectType =
  | 'vehicle'
  | 'pedestrian'
  | 'cyclist'
  | 'unclassified'
  | 'animal'
  | 'aircraft'
  | 'railcar'

export type AidHeading = 'nb' | 'sb' | 'eb' | 'wb'

export type AidMovementType =
  | 'left'
  | 'right'
  | 'through'
  | 'u-turn'
  | 'pedestrian'

export type AidMovementCertainty = 'realized' | 'unrealized'

export type AidMovementState =
  | 'protected'
  | 'permissive'
  | 'permissive-after-stop'
  | 'prohibited'

export type AidIndication =
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

// ---------- common object shapes ----------

export interface AidObjectBase {
  /** Detection system classification (forwarded as-is). */
  classification: string
  /** Object ID/UUID (array of numbers in docs). */
  id: AidObjectId
  /** [length,width,height] in meters. */
  lwh: [length: number, width: number, height: number]
  /** Coarse object type. */
  type: AidObjectType
}

/** Some incidents include instantaneous object telemetry (position/speed) at event time. */
export interface AidObjectWithTelemetry extends AidObjectBase {
  position: LatLngAlt
  speed: number // meters/second
}

// ---------- base incident ----------

export interface AidIncidentBase<TType extends string> {
  detector: number
  id: number
  type: TType
  /** Unix epoch ms */
  timestamp: number
  /**
   * Recording ID if available; can be 0 until the recording is ready.
   * (Some incidents may update later with a recording id.)
   */
  recording: number
}

// ---------- object incidents ----------

export type AidObjectLogState = 'active' | 'clear'

export interface AidObjectLogEntry {
  position: LatLngAlt
  speed: number // meters/second
  state: AidObjectLogState
  /** Unix epoch ms */
  timestamp: number
}

/** Loitering log entries may include dwell time (ms). */
export interface AidLoiteringLogEntry extends AidObjectLogEntry {
  dwell: number // ms
}

export type AidObjectZoneIncidentType =
  | 'object.low-speed'
  | 'object.high-speed'
  | 'object.in-zone'
  | 'object.in-stopped'
  | 'object.oversized'
  | 'object.loitering'

export interface AidObjectZoneIncident
  extends AidIncidentBase<AidObjectZoneIncidentType> {
  zone: number
  object: AidObjectBase
  log: Array<AidObjectLogEntry | AidLoiteringLogEntry>
}

export interface AidObjectLaneChangeIncident
  extends AidIncidentBase<'object.lane-change'> {
  from: number
  to: number
  object: AidObjectWithTelemetry
}

// Wrong-way is documented with its own states
export type AidWrongWayState = 'tracking' | 'tracking-lost' | 'course-corrected'

export interface AidWrongWayLogEntry {
  position: LatLngAlt
  speed: number // meters/second
  state: AidWrongWayState
  /** Unix epoch ms */
  timestamp: number
}

export interface AidObjectWrongWayIncident
  extends AidIncidentBase<'object.wrong-way'> {
  object: AidObjectBase
  log: AidWrongWayLogEntry[]
}

// ---------- intersection incidents ----------

export interface AidResolvedMovement {
  heading: AidHeading
  type: AidMovementType
  certainty?: AidMovementCertainty
  /**
   * Post-prohibited time (ms): how long the resolved movement has been prohibited.
   * Present in some intersection events.
   */
  ppt?: number
  /** Some events include a zone reference. */
  zone?: number
}

export interface AidMovementSnapshot {
  heading: AidHeading
  type: AidMovementType
  /** Unix epoch ms */
  timestamp: number
  /** elapsed time in this state at snapshot time (ms) */
  duration: number
  indication: AidIndication
  state: AidMovementState
}

export interface AidIntersectionIllegalMovementIncident
  extends AidIncidentBase<'intersection.illegal-movement'> {
  movement: Required<Pick<AidResolvedMovement, 'heading' | 'type' | 'zone'>>
  object: AidObjectWithTelemetry
}

export interface AidIntersectionBelatedWalkerIncident
  extends AidIncidentBase<'intersection.belated-walker'> {
  scenario: string
  movement: {
    heading: AidHeading
    time: {
      walk: number
      provided: number
      deficit: number
      ppt: number
    }
    ingress: {
      timestamp: number
      state: AidMovementState
      indication: AidIndication
    }
    egress: {
      timestamp: number
    }
  }
  object: AidObjectWithTelemetry
}

export interface AidIntersectionJaywalkingIncident
  extends AidIncidentBase<'intersection.jaywalking'> {
  movement: {
    heading: AidHeading
    ppt: number
  }
  movements: AidMovementSnapshot[]
  object: AidObjectWithTelemetry
}

export type AidNearMissSeverity = 'unsafe' | 'critical'

export interface AidIntersectionNearMissIncident
  extends AidIncidentBase<'intersection.near-miss'> {
  severity: AidNearMissSeverity
  /** post-encroachment time (ms) */
  pet: number
  /** intersect point */
  intersect: LatLngAlt
  leading: AidObjectWithTelemetry
  trailing: AidObjectWithTelemetry
}

export interface AidIntersectionImpededDepartureIncident
  extends AidIncidentBase<'intersection.impeded-departure'> {
  movement: {
    heading: AidHeading
    type: AidMovementType
    certainty: AidMovementCertainty
  }
  movements: AidMovementSnapshot[]
  object: AidObjectWithTelemetry
}

/**
 * Congestion is listed, but the page segment we can see does not include its payload schema/example.
 * Keep it permissive until you confirm the fields from a sample message.
 */
export interface AidCongestionIncident extends AidIncidentBase<'congestion'> {
  [k: string]: unknown
}

// ---------- type unions ----------

export type AidIncidentType =
  | 'congestion'
  | AidObjectZoneIncidentType
  | 'object.lane-change'
  | 'object.wrong-way'
  | 'intersection.belated-walker'
  | 'intersection.illegal-movement'
  | 'intersection.jaywalking'
  | 'intersection.near-miss'
  | 'intersection.impeded-departure'

export type AidIncident =
  | AidCongestionIncident
  | AidObjectZoneIncident
  | AidObjectLaneChangeIncident
  | AidObjectWrongWayIncident
  | AidIntersectionBelatedWalkerIncident
  | AidIntersectionIllegalMovementIncident
  | AidIntersectionJaywalkingIncident
  | AidIntersectionNearMissIncident
  | AidIntersectionImpededDepartureIncident
