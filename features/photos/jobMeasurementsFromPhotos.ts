import type { JobMeasureOption } from './PhotoAnnotationEditor';

type PhotoCaption = {
  id: string;
  caption?: string | null;
};

const VALUE_UNIT = /([\d.,]+)\s*(mm|cm|m)\b/gi;
const NAMED_LINE = /^(.+?):\s*([\d.,]+)\s*(mm|cm|m)\b/i;

/**
 * Pulls AR / tape-measure rows out of during-photo captions so the Measure
 * sheet can offer "From AR Measure on this job" picks (Figma 04).
 */
export function jobMeasurementsFromPhotos(photos: PhotoCaption[]): JobMeasureOption[] {
  const options: JobMeasureOption[] = [];
  const seen = new Set<string>();

  const push = (name: string, value: string, unit: string, photoId: string) => {
    const label = `${value.replace(',', '.')} ${unit.toLowerCase()}`;
    const key = `${name.toLowerCase()}|${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push({
      id: `${photoId}-${options.length}`,
      name: name.trim() || label,
      label,
    });
  };

  for (const photo of photos) {
    const caption = photo.caption?.trim();
    if (!caption) continue;

    let foundNamed = false;
    for (const line of caption.split('\n')) {
      const named = NAMED_LINE.exec(line.trim());
      if (named) {
        push(named[1]!.trim(), named[2]!, named[3]!, photo.id);
        foundNamed = true;
      }
    }
    if (foundNamed) continue;

    const dash = caption.match(/^(.+?)\s+[—–-]\s*(.+)$/s);
    if (dash) {
      const title = dash[1]!.trim();
      const values = [...dash[2]!.matchAll(VALUE_UNIT)];
      if (values.length === 1) {
        push(title, values[0]![1]!, values[0]![2]!, photo.id);
      } else if (values.length > 1) {
        values.forEach((match, index) => {
          push(`${title} (${index + 1})`, match[1]!, match[2]!, photo.id);
        });
      }
      continue;
    }

    const bare = [...caption.matchAll(VALUE_UNIT)];
    if (bare.length === 1 && caption.length < 40) {
      push('Measurement', bare[0]![1]!, bare[0]![2]!, photo.id);
    }
  }

  return options;
}
