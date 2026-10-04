export type Point = { x: number; y: number };
export type Stroke = Point[];

/** Converts a single stroke's points into a smooth SVG path "d" attribute using quadratic midpoints. */
export function strokeToPathData(stroke: Stroke): string {
  if (stroke.length === 0) return '';
  if (stroke.length === 1) {
    const p = stroke[0]!;
    return `M${p.x},${p.y} L${p.x},${p.y}`;
  }

  let d = `M${stroke[0]!.x},${stroke[0]!.y}`;
  for (let i = 1; i < stroke.length; i += 1) {
    const prev = stroke[i - 1]!;
    const curr = stroke[i]!;
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q${prev.x},${prev.y} ${midX},${midY}`;
  }
  const last = stroke[stroke.length - 1]!;
  d += ` L${last.x},${last.y}`;
  return d;
}

/** Builds a standalone SVG document string representing all captured strokes. */
export function buildSignatureSvg(strokes: Stroke[], width: number, height: number, strokeColor = '#101310'): string {
  const paths = strokes
    .filter((stroke) => stroke.length >= 2)
    .map((stroke) => strokeToPathData(stroke))
    .filter((d) => d.length > 0)
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`
    )
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  ${paths}\n</svg>`;
}

export function isSignatureEmpty(strokes: Stroke[]): boolean {
  return strokes.every((stroke) => stroke.length < 2);
}
