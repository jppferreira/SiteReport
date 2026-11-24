import { lengthMetersBetween, polygonAreaSquareMeters, positionOf, type Transform } from './measureMath';

/** One row in the measurements tray. Lines are metres, areas are m². */
export type Measurement = {
  id: string;
  kind: 'line' | 'area';
  /** User-given name; empty means "Line 2" / "Area 1" from `ordinal`. */
  name: string;
  ordinal: number;
  value: number;
  /** Anchor ids the measurement is drawn between (empty for typed-in rows). */
  pointIds: string[];
  source: 'ar' | 'manual' | 'edited';
};

type HistoryEntry =
  | { type: 'point'; anchorId: string; lineId: string | null; newPoint: boolean }
  | { type: 'close'; lineId: string; areaId: string; chain: string[] }
  | { type: 'finish'; chain: string[] }
  | { type: 'manual'; id: string };

export type MeasureSessionState = {
  points: Record<string, Transform>;
  /** Anchors in the line/shape being drawn right now. */
  chain: string[];
  measurements: Measurement[];
  history: HistoryEntry[];
  nextId: number;
};

export type MeasureSessionAction =
  /** A tap landed on a new native anchor, or snapped onto an existing one. */
  | { type: 'place'; anchorId: string; transform: Transform }
  | { type: 'finish' }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'rename'; id: string; name: string }
  | { type: 'setValue'; id: string; value: number }
  | { type: 'remove'; id: string }
  | { type: 'addManual'; kind: Measurement['kind']; name: string; value: number }
  | { type: 'syncTransforms'; transforms: Record<string, Transform> };

export const initialMeasureSession: MeasureSessionState = {
  points: {},
  chain: [],
  measurements: [],
  history: [],
  nextId: 1,
};

function nextOrdinal(measurements: Measurement[], kind: Measurement['kind']): number {
  return measurements.reduce((max, m) => (m.kind === kind ? Math.max(max, m.ordinal) : max), 0) + 1;
}

function transformOf(state: Pick<MeasureSessionState, 'points'>, id: string): Transform {
  return state.points[id] ?? [];
}

function line(state: MeasureSessionState, a: string, b: string, id: string, ordinal: number): Measurement {
  return {
    id,
    kind: 'line',
    name: '',
    ordinal,
    value: lengthMetersBetween(transformOf(state, a), transformOf(state, b)),
    pointIds: [a, b],
    source: 'ar',
  };
}

/** True when placing on `anchorId` would close the current shape. */
export function wouldCloseShape(state: MeasureSessionState, anchorId: string): boolean {
  return state.chain.length >= 3 && state.chain[0] === anchorId;
}

export function referencedAnchorIds(state: MeasureSessionState): Set<string> {
  const ids = new Set(state.chain);
  for (const m of state.measurements) for (const id of m.pointIds) ids.add(id);
  return ids;
}

/** Native anchors that a state change made unused — remove them from the AR view. */
export function orphanedAnchors(before: MeasureSessionState, after: MeasureSessionState): string[] {
  const still = referencedAnchorIds(after);
  return [...referencedAnchorIds(before)].filter((id) => !still.has(id));
}

export function measureSessionReducer(state: MeasureSessionState, action: MeasureSessionAction): MeasureSessionState {
  switch (action.type) {
    case 'place': {
      const { anchorId } = action;
      const last = state.chain[state.chain.length - 1];
      if (last === anchorId) return state;
      const newPoint = !(anchorId in state.points);
      const points = newPoint ? { ...state.points, [anchorId]: action.transform } : state.points;
      const base = { ...state, points };

      if (wouldCloseShape(base, anchorId)) {
        const lineId = `m${state.nextId}`;
        const areaId = `m${state.nextId + 1}`;
        const closing = line(base, last!, anchorId, lineId, nextOrdinal(state.measurements, 'line'));
        const area: Measurement = {
          id: areaId,
          kind: 'area',
          name: '',
          ordinal: nextOrdinal(state.measurements, 'area'),
          value: polygonAreaSquareMeters(state.chain.map((id) => positionOf(transformOf(base, id)))),
          pointIds: [...state.chain],
          source: 'ar',
        };
        return {
          ...base,
          chain: [],
          measurements: [...state.measurements, closing, area],
          history: [...state.history, { type: 'close', lineId, areaId, chain: state.chain }],
          nextId: state.nextId + 2,
        };
      }

      if (state.chain.includes(anchorId)) return state;
      let measurements = state.measurements;
      let lineId: string | null = null;
      let nextId = state.nextId;
      if (last) {
        lineId = `m${nextId++}`;
        measurements = [...measurements, line(base, last, anchorId, lineId, nextOrdinal(measurements, 'line'))];
      }
      return {
        ...base,
        chain: [...state.chain, anchorId],
        measurements,
        history: [...state.history, { type: 'point', anchorId, lineId, newPoint }],
        nextId,
      };
    }

    case 'finish':
      if (state.chain.length === 0) return state;
      return { ...state, chain: [], history: [...state.history, { type: 'finish', chain: state.chain }] };

    case 'undo': {
      const entry = state.history[state.history.length - 1];
      if (!entry) return state;
      const history = state.history.slice(0, -1);
      switch (entry.type) {
        case 'point': {
          const points = { ...state.points };
          if (entry.newPoint) delete points[entry.anchorId];
          return {
            ...state,
            points,
            history,
            chain: state.chain.slice(0, -1),
            measurements: state.measurements.filter((m) => m.id !== entry.lineId),
          };
        }
        case 'close':
          return {
            ...state,
            history,
            chain: entry.chain,
            measurements: state.measurements.filter((m) => m.id !== entry.lineId && m.id !== entry.areaId),
          };
        case 'finish':
          return { ...state, history, chain: entry.chain };
        case 'manual':
          return { ...state, history, measurements: state.measurements.filter((m) => m.id !== entry.id) };
      }
      return state;
    }

    case 'clear':
      return { ...initialMeasureSession, nextId: state.nextId };

    case 'rename':
      return {
        ...state,
        measurements: state.measurements.map((m) => (m.id === action.id ? { ...m, name: action.name.trim().slice(0, 60) } : m)),
      };

    case 'setValue':
      if (!Number.isFinite(action.value) || action.value <= 0) return state;
      return {
        ...state,
        measurements: state.measurements.map((m) =>
          m.id === action.id ? { ...m, value: action.value, source: m.source === 'manual' ? 'manual' : 'edited' } : m
        ),
      };

    case 'remove':
      // History stays: undoing an entry whose row is gone just skips that row.
      return { ...state, measurements: state.measurements.filter((m) => m.id !== action.id) };

    case 'addManual': {
      if (!Number.isFinite(action.value) || action.value <= 0) return state;
      const id = `m${state.nextId}`;
      return {
        ...state,
        nextId: state.nextId + 1,
        measurements: [
          ...state.measurements,
          { id, kind: action.kind, name: action.name.trim().slice(0, 60), ordinal: nextOrdinal(state.measurements, action.kind), value: action.value, pointIds: [], source: 'manual' },
        ],
        history: [...state.history, { type: 'manual', id }],
      };
    }

    case 'syncTransforms': {
      // ARKit refines anchors as it learns the room; keep untouched lengths in step.
      let changed = false;
      const points = { ...state.points };
      for (const [id, transform] of Object.entries(action.transforms)) {
        if (id in points) {
          points[id] = transform;
          changed = true;
        }
      }
      if (!changed) return state;
      const measurements = state.measurements.map((m) => {
        if (m.source !== 'ar' || m.pointIds.some((id) => !points[id])) return m;
        const next = { points };
        if (m.kind === 'line') return { ...m, value: lengthMetersBetween(transformOf(next, m.pointIds[0] ?? ''), transformOf(next, m.pointIds[1] ?? '')) };
        return { ...m, value: polygonAreaSquareMeters(m.pointIds.map((id) => positionOf(transformOf(next, id)))) };
      });
      return { ...state, points, measurements };
    }
  }
  return state;
}
