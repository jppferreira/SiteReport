import QRCode from 'qrcode';

/** Builds a compact SVG QR from a URL for embedding in PDF HTML. */
export function reviewQrSvg(url: string, size = 70): string {
  try {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const count = modules.size;
    const cell = size / count;
    const rects: string[] = [];
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (!modules.get(row, col)) continue;
        rects.push(
          `<rect x="${(col * cell).toFixed(2)}" y="${(row * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#121412"/>`
        );
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
  } catch {
    return '';
  }
}

/** Data-URI wrapper so the QR can sit in an <img> without escaping issues. */
export function reviewQrDataUri(url: string, size = 70): string {
  const svg = reviewQrSvg(url, size);
  if (!svg) return '';
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}
