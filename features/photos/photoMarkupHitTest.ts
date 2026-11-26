import {
  AnnotationPoint,
  AnnotationShape,
  clampPoint,
  ellipseGeometry,
  rectGeometry,
} from '@/models';

export type MarkupHandleId = 'from' | 'to' | 'at' | 'anchor' | 'nw' | 'ne' | 'sw' | 'se';

export type MarkupHandle = {
  id: MarkupHandleId;
  point: AnnotationPoint;
};

export type ShapeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Fat enough for a thumb on thin strokes (normalized photo space). */
const LINE_HIT = 0.065;
const ENDPOINT_HIT = 0.075;
const CALLOUT_PIN_HIT = 0.1;
const HANDLE_HIT = 0.06;
/** Minimum selection grab box so skinny arrows/dimensions stay draggable. */
const MIN_MOVE_SPAN = 0.08;

/** Place the label pill away from the pin so it does not cover the spot (Figma 03). */
export function autoPlaceLabel(anchor: AnnotationPoint): AnnotationPoint {
  const left = anchor.x > 0.45;
  const above = anchor.y > 0.35;
  return clampPoint({
    x: left ? Math.max(0.08, anchor.x - 0.22) : Math.min(0.92, anchor.x + 0.08),
    y: above ? Math.max(0.08, anchor.y - 0.14) : Math.min(0.92, anchor.y + 0.1),
  });
}

function nearSegment(
  point: AnnotationPoint,
  from: AnnotationPoint,
  to: AnnotationPoint,
  threshold: number
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) {
    return Math.hypot(point.x - from.x, point.y - from.y) <= threshold;
  }
  let t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = from.x + t * dx;
  const py = from.y + t * dy;
  return Math.hypot(point.x - px, point.y - py) <= threshold;
}

function nearPoint(a: AnnotationPoint, b: AnnotationPoint, threshold: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= threshold;
}

function strokeThreshold(width: number | undefined, base: number): number {
  // Wider strokes get a proportionally fatter hit strip; never thinner than base.
  return Math.max(base, (width ?? 0.01) * 4);
}

function hitsShape(shape: AnnotationShape, point: AnnotationPoint): boolean {
  if (shape.kind === 'callout') {
    if (nearPoint(point, shape.at, CALLOUT_PIN_HIT)) return true;
    if (shape.anchor && nearPoint(point, shape.anchor, ENDPOINT_HIT)) return true;
    // Leader line between pin and label.
    if (shape.anchor && nearSegment(point, shape.anchor, shape.at, LINE_HIT)) return true;
    return false;
  }
  if (shape.kind === 'pen') {
    const threshold = strokeThreshold(shape.width, LINE_HIT);
    for (let p = 1; p < shape.points.length; p += 1) {
      if (nearSegment(point, shape.points[p - 1]!, shape.points[p]!, threshold)) return true;
    }
    if (shape.points[0] && nearPoint(point, shape.points[0], threshold)) return true;
    return false;
  }
  if (shape.kind === 'arrow' || shape.kind === 'dimension') {
    const threshold = strokeThreshold(shape.width, LINE_HIT);
    if (nearPoint(point, shape.from, ENDPOINT_HIT) || nearPoint(point, shape.to, ENDPOINT_HIT)) {
      return true;
    }
    return nearSegment(point, shape.from, shape.to, threshold);
  }
  if (shape.kind === 'circle') {
    const ellipse = ellipseGeometry(shape.from, shape.to, 1, 1);
    const nx = (point.x - ellipse.cx) / Math.max(ellipse.rx, 0.001);
    const ny = (point.y - ellipse.cy) / Math.max(ellipse.ry, 0.001);
    const d = Math.hypot(nx, ny);
    return Math.abs(d - 1) <= 0.28 || d < 1;
  }
  if (shape.kind === 'rect' || shape.kind === 'highlight') {
    const box = rectGeometry(shape.from, shape.to, 1, 1);
    const pad = 0.03;
    return (
      point.x >= box.x - pad &&
      point.x <= box.x + box.width + pad &&
      point.y >= box.y - pad &&
      point.y <= box.y + box.height + pad
    );
  }
  return false;
}

/** Top-most shape under a normalized photo point, or null. */
export function hitTestShape(shapes: AnnotationShape[], point: AnnotationPoint): number | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    if (hitsShape(shapes[i]!, point)) return i;
  }
  return null;
}

/**
 * Grab area for moving an already-selected mark — includes a padded AABB so
 * thin arrows / dimensions stay easy to drag after selection.
 */
export function hitTestMoveTarget(shape: AnnotationShape, point: AnnotationPoint): boolean {
  if (hitsShape(shape, point)) return true;
  const bounds = expandBoundsForMove(boundsForShape(shape));
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

export function expandBoundsForMove(bounds: ShapeBounds, minSpan = MIN_MOVE_SPAN): ShapeBounds {
  let { minX, minY, maxX, maxY } = bounds;
  if (maxX - minX < minSpan) {
    const mid = (minX + maxX) / 2;
    minX = mid - minSpan / 2;
    maxX = mid + minSpan / 2;
  }
  if (maxY - minY < minSpan) {
    const mid = (minY + maxY) / 2;
    minY = mid - minSpan / 2;
    maxY = mid + minSpan / 2;
  }
  const pad = 0.02;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/** Green drag handles for the selected mark (Figma 02 / 04 / 05 / 08). */
export function handlesForShape(shape: AnnotationShape): MarkupHandle[] {
  if (shape.kind === 'arrow' || shape.kind === 'dimension') {
    return [
      { id: 'from', point: shape.from },
      { id: 'to', point: shape.to },
    ];
  }
  if (shape.kind === 'callout') {
    const handles: MarkupHandle[] = [{ id: 'at', point: shape.at }];
    if (shape.anchor) handles.push({ id: 'anchor', point: shape.anchor });
    return handles;
  }
  if (shape.kind === 'circle' || shape.kind === 'rect' || shape.kind === 'highlight') {
    const box = rectGeometry(shape.from, shape.to, 1, 1);
    return [
      { id: 'nw', point: { x: box.x, y: box.y } },
      { id: 'ne', point: { x: box.x + box.width, y: box.y } },
      { id: 'sw', point: { x: box.x, y: box.y + box.height } },
      { id: 'se', point: { x: box.x + box.width, y: box.y + box.height } },
    ];
  }
  // Pen: no resize handles — drag the stroke to move.
  return [];
}

export function hitTestHandle(
  shape: AnnotationShape,
  point: AnnotationPoint,
  threshold = HANDLE_HIT
): MarkupHandleId | null {
  for (const handle of handlesForShape(shape)) {
    if (Math.hypot(point.x - handle.point.x, point.y - handle.point.y) <= threshold) {
      return handle.id;
    }
  }
  return null;
}

export function boundsForShape(shape: AnnotationShape): ShapeBounds {
  const points: AnnotationPoint[] = [];
  if (shape.kind === 'pen') {
    points.push(...shape.points);
  } else if (shape.kind === 'callout') {
    points.push(shape.at);
    if (shape.anchor) points.push(shape.anchor);
  } else if ('from' in shape && 'to' in shape) {
    if (shape.kind === 'circle' || shape.kind === 'rect' || shape.kind === 'highlight') {
      const box = rectGeometry(shape.from, shape.to, 1, 1);
      return {
        minX: box.x,
        minY: box.y,
        maxX: box.x + box.width,
        maxY: box.y + box.height,
      };
    }
    points.push(shape.from, shape.to);
  }
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = points[0]!.x;
  let maxY = points[0]!.y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

function shiftPoint(point: AnnotationPoint, dx: number, dy: number): AnnotationPoint {
  return clampPoint({ x: point.x + dx, y: point.y + dy });
}

/** Translate an entire mark by a normalized delta. */
export function moveShape(shape: AnnotationShape, dx: number, dy: number): AnnotationShape {
  if (shape.kind === 'pen') {
    return {
      ...shape,
      points: shape.points.map((point) => shiftPoint(point, dx, dy)),
    };
  }
  if (shape.kind === 'callout') {
    return {
      ...shape,
      at: shiftPoint(shape.at, dx, dy),
      anchor: shape.anchor ? shiftPoint(shape.anchor, dx, dy) : undefined,
    };
  }
  if ('from' in shape && 'to' in shape) {
    return {
      ...shape,
      from: shiftPoint(shape.from, dx, dy),
      to: shiftPoint(shape.to, dx, dy),
    };
  }
  return shape;
}

/** Drag a handle to reshape the selected mark. */
export function resizeShape(
  shape: AnnotationShape,
  handleId: MarkupHandleId,
  point: AnnotationPoint
): AnnotationShape {
  const next = clampPoint(point);
  if (shape.kind === 'arrow' || shape.kind === 'dimension') {
    if (handleId === 'from') return { ...shape, from: next };
    if (handleId === 'to') return { ...shape, to: next };
    return shape;
  }
  if (shape.kind === 'callout') {
    if (handleId === 'at') return { ...shape, at: next };
    if (handleId === 'anchor') return { ...shape, anchor: next };
    return shape;
  }
  if (shape.kind === 'circle' || shape.kind === 'rect' || shape.kind === 'highlight') {
    const box = rectGeometry(shape.from, shape.to, 1, 1);
    let left = box.x;
    let top = box.y;
    let right = box.x + box.width;
    let bottom = box.y + box.height;
    if (handleId === 'nw') {
      left = next.x;
      top = next.y;
    } else if (handleId === 'ne') {
      right = next.x;
      top = next.y;
    } else if (handleId === 'sw') {
      left = next.x;
      bottom = next.y;
    } else if (handleId === 'se') {
      right = next.x;
      bottom = next.y;
    } else {
      return shape;
    }
    return {
      ...shape,
      from: clampPoint({ x: left, y: top }),
      to: clampPoint({ x: right, y: bottom }),
    };
  }
  return shape;
}
