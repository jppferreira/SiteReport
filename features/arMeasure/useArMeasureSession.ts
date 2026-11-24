import { useCallback, useRef, useState } from 'react';

import type { Anchor, ArViewHandle, Transform } from './arTypes';
import { lengthMetersBetween } from './measureMath';

export type MeasureSegment = {
  id: string;
  startId: string;
  endId: string;
  startTransform: Transform;
  endTransform: Transform;
  lengthMeters: number;
};

type PendingPoint = {
  anchorId: string;
  transform: Transform;
};

export function useArMeasureSession() {
  const [pending, setPending] = useState<PendingPoint | null>(null);
  const [segments, setSegments] = useState<MeasureSegment[]>([]);
  const [anchorsById, setAnchorsById] = useState<Record<string, Anchor>>({});
  const nextId = useRef(1);

  const syncAnchors = useCallback((anchors: Anchor[]) => {
    const map: Record<string, Anchor> = {};
    for (const anchor of anchors) map[anchor.id] = anchor;
    setAnchorsById(map);
  }, []);

  const placeAt = useCallback(
    async (view: ArViewHandle, x: number, y: number): Promise<'placed' | 'miss' | 'complete'> => {
      const added = await view.addAnchor(x, y);
      if (!added) return 'miss';

      const listed = await view.listAnchors();
      syncAnchors(listed);
      const anchor = listed.find((item) => item.id === added.id);
      if (!anchor) return 'miss';

      if (!pending) {
        setPending({ anchorId: anchor.id, transform: anchor.transform });
        return 'placed';
      }

      const lengthMeters = lengthMetersBetween(pending.transform, anchor.transform);
      const segment: MeasureSegment = {
        id: `seg-${nextId.current++}`,
        startId: pending.anchorId,
        endId: anchor.id,
        startTransform: pending.transform,
        endTransform: anchor.transform,
        lengthMeters,
      };
      setSegments((prev) => [...prev, segment]);
      setPending(null);
      return 'complete';
    },
    [pending, syncAnchors]
  );

  const undo = useCallback(
    async (view: ArViewHandle | null) => {
      if (pending) {
        if (view) await view.removeAnchor(pending.anchorId);
        setPending(null);
        if (view) syncAnchors(await view.listAnchors());
        return;
      }
      const last = segments[segments.length - 1];
      if (!last) return;
      setSegments((prev) => prev.slice(0, -1));
      if (view) {
        await view.removeAnchor(last.endId);
        await view.removeAnchor(last.startId);
        syncAnchors(await view.listAnchors());
      }
    },
    [pending, segments, syncAnchors]
  );

  const clear = useCallback(async (view: ArViewHandle | null) => {
    setPending(null);
    setSegments([]);
    setAnchorsById({});
    if (view) await view.reset();
  }, []);

  const totalLengthMeters = segments.reduce((sum, segment) => sum + segment.lengthMeters, 0);

  return {
    pending,
    segments,
    anchorsById,
    totalLengthMeters,
    placeAt,
    undo,
    clear,
    syncAnchors,
  };
}
