import { formatTakenAt } from '@/services/photoTakenAt';

/** Formats the date/time line on the evidence stamp overlay and PDF caption. */
export function formatStampDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatTakenAt(iso);
  const day = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
  return `${day} · ${time}`;
}

export function formatStampCaptionParts(input: {
  caption: string | null | undefined;
  takenAt: string | null | undefined;
  address: string | null | undefined;
  stampDateTime: boolean;
  stampAddress: boolean;
  stampShowOnPdf: boolean;
}): string {
  const caption = input.caption?.trim() ?? '';
  if (!input.stampShowOnPdf) {
    return caption;
  }
  const parts: string[] = [];
  if (input.stampDateTime) {
    const stamp = formatStampDateTime(input.takenAt);
    if (stamp) parts.push(stamp);
  }
  if (input.stampAddress) {
    const address = input.address?.trim();
    if (address) parts.push(address);
  }
  if (caption && parts.length > 0) return `${caption} — ${parts.join(' · ')}`;
  return caption || parts.join(' · ');
}
