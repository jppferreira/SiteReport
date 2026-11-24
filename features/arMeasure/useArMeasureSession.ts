import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { Anchor, ArViewHandle, ProjectedPoint, Transform } from './arTypes';
import { alignToAxis, lengthMetersBetween, nearestWithin, type Point2 } from './measureMath';
import {
  initialMeasureSession,
  measureSessionReducer,
  orphanedAnchors,
  wouldCloseShape,
  type MeasureSessionAction,
  type MeasureSessionState,
} from './measureSession';

const SNAP_RADIUS_PX = 28;
const AIM_POLL_MS = 140;

export type AimState = {
  /** A surface is under the reticle (raycast hit). */
  hit: boolean;
  target: string | null;
  worldTransform: Transform | null;
  /** Where the next point will go on screen (after snapping). */
  screen: Point2;
  snap: 'point' | 'close' | 'aligned' | null;
  snapAnchorId: string | null;
  /** Live distance from the last placed point to the reticle, metres. */
  liveLengthMeters: number | null;
};

type Options = {
  viewRef: React.RefObject<ArViewHandle | null>;
  active: boolean;
  tracking: 'initializing' | 'limited' | 'normal' | 'unavailable';
  center: Point2;
  projections: Record<string, ProjectedPoint>;
  snapEnabled: boolean;
};

/** AR tape-measure state on top of the pure reducer, plus the live reticle raycast. */
export function useArMeasureSession({ viewRef, active, tracking, center, projections, snapEnabled }: Options) {
  const [state, rawDispatch] = useReducer(measureSessionReducer, initialMeasureSession);
  const stateRef = useRef<MeasureSessionState>(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [aim, setAim] = useState<AimState>({ hit: false, target: null, worldTransform: null, screen: center, snap: null, snapAnchorId: null, liveLengthMeters: null });
  const busyRef = useRef(false);
  const aimingRef = useRef(false);
  // Projections arrive every frame; read them through refs so the poll loop stays put.
  const inputsRef = useRef({ center, projections, snapEnabled });
  useLayoutEffect(() => {
    inputsRef.current = { center, projections, snapEnabled };
  }, [center, projections, snapEnabled]);

  /** Dispatch and remove any native anchors the change left unused. */
  const dispatch = useCallback(
    (action: MeasureSessionAction) => {
      const before = stateRef.current;
      const after = measureSessionReducer(before, action);
      stateRef.current = after;
      rawDispatch(action);
      const view = viewRef.current;
      if (view && action.type !== 'clear') {
        for (const id of orphanedAnchors(before, after)) void view.removeAnchor(id).catch(() => undefined);
      }
    },
    [viewRef]
  );

  /** Where the reticle would place a point, given snapping. */
  const resolveAim = useCallback((): Pick<AimState, 'screen' | 'snap' | 'snapAnchorId'> => {
    const s = stateRef.current;
    const { center, projections, snapEnabled } = inputsRef.current;
    if (!snapEnabled) return { screen: center, snap: null, snapAnchorId: null };
    const candidates = Object.keys(s.points)
      .map((id) => projections[id])
      .filter((p): p is ProjectedPoint => !!p && p.inFront);
    const near = nearestWithin(candidates, center, SNAP_RADIUS_PX);
    if (near) {
      return { screen: { x: near.x, y: near.y }, snap: wouldCloseShape(s, near.id) ? 'close' : 'point', snapAnchorId: near.id };
    }
    const last = s.chain[s.chain.length - 1];
    const lastScreen = last ? projections[last] : undefined;
    if (lastScreen?.inFront) {
      const aligned = alignToAxis(lastScreen, center);
      if (aligned.aligned) return { screen: aligned.point, snap: 'aligned', snapAnchorId: null };
    }
    return { screen: center, snap: null, snapAnchorId: null };
  }, []);

  useEffect(() => {
    if (!active || tracking !== 'normal') return;
    let cancelled = false;
    const tick = async () => {
      const view = viewRef.current;
      if (!view || busyRef.current || aimingRef.current) return;
      aimingRef.current = true;
      const resolved = resolveAim();
      try {
        const result = await view.raycast(resolved.screen.x, resolved.screen.y);
        if (cancelled) return;
        const s = stateRef.current;
        const last = s.chain[s.chain.length - 1];
        const target = resolved.snapAnchorId ? s.points[resolved.snapAnchorId] : result.worldTransform;
        setAim({
          ...resolved,
          hit: !!result.worldTransform || !!resolved.snapAnchorId,
          target: result.target,
          worldTransform: result.worldTransform,
          liveLengthMeters: last && s.points[last] && target ? lengthMetersBetween(s.points[last], target) : null,
        });
      } catch {
        if (!cancelled) setAim((prev) => ({ ...prev, hit: false }));
      } finally {
        aimingRef.current = false;
      }
    };
    const timer = setInterval(() => void tick(), AIM_POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, tracking, resolveAim, viewRef]);

  /** Drop a point at the reticle (or the snapped point). */
  const addPoint = useCallback(async (): Promise<'placed' | 'closed' | 'miss'> => {
    const view = viewRef.current;
    if (!view || busyRef.current) return 'miss';
    busyRef.current = true;
    try {
      const resolved = resolveAim();
      const s = stateRef.current;
      const snapped = resolved.snapAnchorId ? s.points[resolved.snapAnchorId] : undefined;
      if (resolved.snapAnchorId && snapped) {
        const closing = wouldCloseShape(s, resolved.snapAnchorId);
        dispatch({ type: 'place', anchorId: resolved.snapAnchorId, transform: snapped });
        return closing ? 'closed' : 'placed';
      }
      const added = await view.addAnchor(resolved.screen.x, resolved.screen.y);
      if (!added) return 'miss';
      const anchor = (await view.listAnchors()).find((item) => item.id === added.id);
      if (!anchor) return 'miss';
      dispatch({ type: 'place', anchorId: anchor.id, transform: anchor.transform });
      return 'placed';
    } finally {
      busyRef.current = false;
    }
  }, [dispatch, resolveAim, viewRef]);

  /** Tap anywhere on the camera to place there instead of at the reticle. */
  const addPointAt = useCallback(async (x: number, y: number): Promise<'placed' | 'miss'> => {
    const view = viewRef.current;
    if (!view || busyRef.current) return 'miss';
    busyRef.current = true;
    try {
      const added = await view.addAnchor(x, y);
      if (!added) return 'miss';
      const anchor = (await view.listAnchors()).find((item) => item.id === added.id);
      if (!anchor) return 'miss';
      dispatch({ type: 'place', anchorId: anchor.id, transform: anchor.transform });
      return 'placed';
    } finally {
      busyRef.current = false;
    }
  }, [dispatch, viewRef]);

  const syncAnchors = useCallback((anchors: Anchor[]) => {
    const transforms: Record<string, Transform> = {};
    for (const anchor of anchors) transforms[anchor.id] = anchor.transform;
    dispatch({ type: 'syncTransforms', transforms });
  }, [dispatch]);

  const clear = useCallback(async () => {
    dispatch({ type: 'clear' });
    await viewRef.current?.reset().catch(() => undefined);
  }, [dispatch, viewRef]);

  const aiming = active && tracking === 'normal';
  const shownAim = useMemo<AimState>(() => (aiming ? aim : { ...aim, hit: false, liveLengthMeters: null }), [aim, aiming]);

  return { state, aim: shownAim, dispatch, addPoint, addPointAt, syncAnchors, clear };
}
