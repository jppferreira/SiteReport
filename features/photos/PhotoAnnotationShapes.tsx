import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

import {
  annotationLabelColor,
  AnnotationShape,
  arrowGeometry,
  dimensionGeometry,
  ellipseGeometry,
  HIGHLIGHT_FILL_OPACITY,
  penPathData,
  PhotoAnnotations,
  rectGeometry,
  shapeHasOutline,
  strokeWidthPx,
} from '@/models';

type PhotoAnnotationShapesProps = {
  annotations: PhotoAnnotations | null | undefined;
  /** In-progress shape preview while the finger is still down. */
  draft?: AnnotationShape | null;
  width: number;
  height: number;
};

function outlineWidth(strokePx: number): number {
  return strokePx + Math.max(strokePx * 0.9, 2.5);
}

function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(text.length, 2) * fontSize * 0.52;
}

function LabelPillSvg({
  text,
  color,
  cx,
  cy,
  fontSize,
  outline,
}: {
  text: string;
  color: AnnotationShape['color'];
  cx: number;
  cy: number;
  fontSize: number;
  outline: boolean;
}) {
  const labelColor = annotationLabelColor(color);
  const padX = fontSize * 0.85;
  const padY = fontSize * 0.55;
  const textWidth = estimateTextWidth(text, fontSize);
  const pillW = padX * 2 + textWidth;
  const pillH = fontSize + padY * 2;
  const x = cx - pillW / 2;
  const y = cy - pillH / 2;
  return (
    <>
      <Rect
        x={x}
        y={y}
        width={pillW}
        height={pillH}
        rx={pillH / 2}
        fill={color}
        stroke={outline ? '#FFFFFF' : undefined}
        strokeWidth={outline ? 2 : 0}
      />
      <SvgText
        x={cx}
        y={cy}
        fill={labelColor}
        fontSize={fontSize}
        fontWeight="600"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {text}
      </SvgText>
    </>
  );
}

function ShapeNode({ shape, width, height }: { shape: AnnotationShape; width: number; height: number }) {
  const outline = shapeHasOutline(shape);
  const fontSize = Math.max(Math.min(width, height) * 0.026, 12);

  if (shape.kind === 'callout') {
    // Interactive pills are overlaid by the editor; SVG draws leader + anchor for PDF parity preview.
    const note = shape.note.trim();
    if (!shape.anchor && !note) return null;
    const cx = shape.at.x * width;
    const cy = shape.at.y * height;
    return (
      <>
        {shape.anchor ? (
          <>
            {outline ? (
              <Path
                d={`M ${cx} ${cy} L ${shape.anchor.x * width} ${shape.anchor.y * height}`}
                stroke="#FFFFFF"
                strokeWidth={Math.max(fontSize * 0.22, 3)}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}
            <Path
              d={`M ${cx} ${cy} L ${shape.anchor.x * width} ${shape.anchor.y * height}`}
              stroke={shape.color}
              strokeWidth={Math.max(fontSize * 0.12, 1.5)}
              fill="none"
              strokeLinecap="round"
            />
            {outline ? (
              <Circle
                cx={shape.anchor.x * width}
                cy={shape.anchor.y * height}
                r={Math.max(fontSize * 0.28, 3) + 1.5}
                fill="#FFFFFF"
              />
            ) : null}
            <Circle
              cx={shape.anchor.x * width}
              cy={shape.anchor.y * height}
              r={Math.max(fontSize * 0.28, 3)}
              fill={shape.color}
            />
          </>
        ) : null}
        {note ? (
          <LabelPillSvg text={note} color={shape.color} cx={cx} cy={cy} fontSize={fontSize} outline={outline} />
        ) : null}
      </>
    );
  }

  if (shape.kind === 'dimension') {
    const strokePx = strokeWidthPx(shape, width, height);
    const dim = dimensionGeometry(shape.from, shape.to, width, height, strokePx);
    const label = shape.label.trim() || '—';
    return (
      <>
        {outline ? (
          <>
            <Path d={dim.line} stroke="#FFFFFF" strokeWidth={outlineWidth(strokePx)} fill="none" strokeLinecap="round" />
            <Path d={dim.capA} stroke="#FFFFFF" strokeWidth={outlineWidth(strokePx)} fill="none" strokeLinecap="round" />
            <Path d={dim.capB} stroke="#FFFFFF" strokeWidth={outlineWidth(strokePx)} fill="none" strokeLinecap="round" />
          </>
        ) : null}
        <Path d={dim.line} stroke={shape.color} strokeWidth={strokePx} fill="none" strokeLinecap="round" />
        <Path d={dim.capA} stroke={shape.color} strokeWidth={strokePx} fill="none" strokeLinecap="round" />
        <Path d={dim.capB} stroke={shape.color} strokeWidth={strokePx} fill="none" strokeLinecap="round" />
        <LabelPillSvg
          text={label}
          color={shape.color}
          cx={dim.midX}
          cy={dim.midY}
          fontSize={Math.max(fontSize * 0.95, 11)}
          outline={outline}
        />
      </>
    );
  }

  const strokePx = strokeWidthPx(shape, width, height);

  if (shape.kind === 'pen') {
    const d = penPathData(shape.points, width, height);
    return (
      <>
        {outline ? (
          <Path
            d={d}
            stroke="#FFFFFF"
            strokeWidth={outlineWidth(strokePx)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        <Path
          d={d}
          stroke={shape.color}
          strokeWidth={strokePx}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (shape.kind === 'arrow') {
    const arrow = arrowGeometry(shape.from, shape.to, width, height, strokePx);
    return (
      <>
        {outline ? (
          <>
            <Path
              d={arrow.shaft}
              stroke="#FFFFFF"
              strokeWidth={outlineWidth(strokePx)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {arrow.head ? (
              <Path
                d={arrow.head}
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeWidth={outlineWidth(strokePx)}
                strokeLinejoin="round"
              />
            ) : null}
          </>
        ) : null}
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

  if (shape.kind === 'circle') {
    const ellipse = ellipseGeometry(shape.from, shape.to, width, height);
    return (
      <>
        {outline ? (
          <Ellipse
            cx={ellipse.cx}
            cy={ellipse.cy}
            rx={ellipse.rx}
            ry={ellipse.ry}
            stroke="#FFFFFF"
            strokeWidth={outlineWidth(strokePx)}
            fill="none"
          />
        ) : null}
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          stroke={shape.color}
          strokeWidth={strokePx}
          fill="none"
        />
      </>
    );
  }

  if (shape.kind === 'rect') {
    const box = rectGeometry(shape.from, shape.to, width, height);
    return (
      <>
        {outline ? (
          <Rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            stroke="#FFFFFF"
            strokeWidth={outlineWidth(strokePx)}
            fill="none"
          />
        ) : null}
        <Rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          stroke={shape.color}
          strokeWidth={strokePx}
          fill="none"
        />
      </>
    );
  }

  if (shape.kind === 'highlight') {
    const box = rectGeometry(shape.from, shape.to, width, height);
    const rx = Math.min(box.width, box.height) * 0.12;
    return (
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={rx}
        fill={shape.color}
        fillOpacity={HIGHLIGHT_FILL_OPACITY}
        stroke={outline ? '#FFFFFF' : undefined}
        strokeWidth={outline ? Math.max(strokePx * 0.6, 1.5) : 0}
      />
    );
  }

  return null;
}

/** SVG markup for committed (and optional draft) draw shapes in photo pixel space. */
export function PhotoAnnotationShapes({ annotations, draft, width, height }: PhotoAnnotationShapesProps) {
  if (width <= 0 || height <= 0) return null;
  const shapes = [...(annotations?.shapes ?? [])];
  if (draft) shapes.push(draft);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      {shapes.map((shape, index) => (
        <ShapeNode key={`${shape.kind}-${index}`} shape={shape} width={width} height={height} />
      ))}
    </Svg>
  );
}
