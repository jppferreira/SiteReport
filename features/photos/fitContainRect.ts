/** Pixel rect of a photo fitted with object-fit: contain inside a box. */
export type ContainRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function fitContainRect(
  boxWidth: number,
  boxHeight: number,
  photoWidth: number,
  photoHeight: number
): ContainRect | null {
  if (boxWidth <= 0 || boxHeight <= 0 || photoWidth <= 0 || photoHeight <= 0) return null;
  const scale = Math.min(boxWidth / photoWidth, boxHeight / photoHeight);
  const width = photoWidth * scale;
  const height = photoHeight * scale;
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}
