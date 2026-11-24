import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';

import {
  AnnotationShape,
  arrowGeometry,
  ellipseGeometry,
  isAnnotationCallout,
  penPathData,
  PhotoAnnotations,
  strokeWidthPx,
} from '@/models';

type PhotoAnnotationShapesProps = {
  annotations: PhotoAnnotations | null | undefined;
  /** In-progress shape preview while the finger is still down. */
  draft?: AnnotationShape | null;
  width: number;
  height: number;
};

function ShapeNode({ shape, width, height }: { shape: AnnotationShape; width: number; height: number }) {
  // Text callouts are View pills overlaid by the editor (Figma-style labels).
  if (shape.kind === 'callout') return null;

  const strokePx = strokeWidthPx(shape, width, height);
  if (shape.kind === 'pen') {
    return (
      <Path
        d={penPathData(shape.points, width, height)}
        stroke={shape.color}
        strokeWidth={strokePx}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (shape.kind === 'arrow') {
    const arrow = arrowGeometry(shape.from, shape.to, width, height, strokePx);
    return (
      <>
        <Path
          d={arrow.shaft}
          stroke={shape.color}
          strokeWidth={strokePx}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {arrow.head ? (
          <Path
            d={arrow.head}
            fill={shape.color}
            stroke={shape.color}
            strokeWidth={strokePx * 0.5}
            strokeLinejoin="round"
          />
        ) : null}
      </>
    );
  }
  const ellipse = ellipseGeometry(shape.from, shape.to, width, height);
  return (
    <Ellipse
      cx={ellipse.cx}
      cy={ellipse.cy}
      rx={ellipse.rx}
      ry={ellipse.ry}
      stroke={shape.color}
      strokeWidth={strokePx}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** SVG markup for committed (and optional draft) draw shapes in photo pixel space. */
export function PhotoAnnotationShapes({ annotations, draft, width, height }: PhotoAnnotationShapesProps) {
  if (width <= 0 || height <= 0) return null;
  const shapes = (annotations?.shapes ?? []).filter((shape) => !isAnnotationCallout(shape));
  const draftDraw = draft && !isAnnotationCallout(draft) ? draft : null;
  if (shapes.length === 0 && !draftDraw) return null;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
      {shapes.map((shape, index) => (
        <ShapeNode key={index} shape={shape} width={width} height={height} />
      ))}
      {draftDraw ? <ShapeNode shape={draftDraw} width={width} height={height} /> : null}
    </Svg>
  );
}
