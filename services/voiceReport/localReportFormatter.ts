import { blankPricingLine, type ReportPricing } from '@/models';
import { generateId } from '@/utils/id';

import type {
  ProfessionalRewriteResult,
  StructuredReportDraft,
  VoiceFieldFill,
  VoiceFieldSnapshot,
  VoicePricingLineDraft,
} from './types';

/** Spoken fillers and hedges — removed before field sorting. */
const FILLER =
  /\b(?:um+|uh+|erm+|ah+|hmm+|like|you know|basically|literally|actually|sort of|kind of|i mean|right|okay|ok|so yeah|yeah|well|anyway|anyways)\b/gi;

const HEADING = {
  workCompleted: 'Summary',
  materials: 'Materials',
  labour: 'Labour',
  privateNotes: 'Private notes',
  pricing: 'Costs',
} as const;

type Topic = 'summary' | 'materials' | 'labour' | 'privateNotes';

type Segment = { topic: Topic; text: string };

/**
 * Deterministic offline formatting for devices without an approved on-device LLM.
 * Cleans natural / Whisper-style speech, then splits into Work Summary form boxes.
 * Never invents work or prices.
 */
export function formatTranscriptLocally(raw: string): ProfessionalRewriteResult {
  const cleaned = tidySpeech(raw);
  const structured = classifyIntoFormFields(cleaned);
  return {
    source: 'local_formatter',
    structured,
    text: structuredDraftToReportText(structured),
  };
}

export function tidySpeech(raw: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text.replace(FILLER, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/\s*([,;:])\s*/g, '$1 ');
  text = text.replace(/(?:^|[\s])[,;:]+\s*/g, ' ');
  text = text.replace(/\s+([.!?])/g, '$1');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/([.!?])\s*([a-z])/g, (_, punct: string, letter: string) => `${punct} ${letter.toUpperCase()}`);

  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (text && !/[.!?]$/.test(text)) {
    text = `${text}.`;
  }

  return text;
}

export function emptyStructuredDraft(): StructuredReportDraft {
  return {
    workCompleted: '',
    materials: '',
    labour: '',
    privateNotes: '',
    pricingLines: [],
  };
}

/**
 * Root strategy for Whisper run-ons:
 * 1) Pull every spoken amount into pricing lines (with local context).
 * 2) Segment the remaining text by materials / labour / private anchors.
 * 3) Leading text before the first anchor is Summary.
 */
export function classifyIntoFormFields(cleaned: string): StructuredReportDraft {
  const empty = emptyStructuredDraft();
  if (!cleaned) return empty;

  const { pricingLines, remainder } = extractAllPricing(cleaned);
  const segments = segmentByTopic(remainder);

  const summaryParts: string[] = [];
  const materialItems: string[] = [];
  const labourParts: string[] = [];
  const noteParts: string[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    switch (segment.topic) {
      case 'materials': {
        for (const item of parseMaterialsList(text)) materialItems.push(item);
        break;
      }
      case 'labour': {
        const labour = polishLabour(text);
        if (labour) labourParts.push(labour);
        break;
      }
      case 'privateNotes': {
        const note = polishPrivateNote(text);
        if (note) noteParts.push(note);
        break;
      }
      default: {
        const summary = polishSummary(text);
        if (summary) summaryParts.push(summary);
      }
    }
  }

  if (
    summaryParts.length === 0 &&
    materialItems.length === 0 &&
    labourParts.length === 0 &&
    noteParts.length === 0 &&
    pricingLines.length === 0
  ) {
    return { ...empty, workCompleted: polishSummary(cleaned) || cleaned };
  }

  return {
    workCompleted: joinSentences(summaryParts),
    materials: uniqueLines(materialItems).join('\n'),
    labour: joinSentences(labourParts),
    privateNotes: joinSentences(noteParts),
    pricingLines,
  };
}

export function structuredDraftToReportText(draft: StructuredReportDraft): string {
  const sections: string[] = [];
  if (draft.workCompleted.trim()) sections.push(`${HEADING.workCompleted}\n${draft.workCompleted.trim()}`);
  if (draft.materials.trim()) sections.push(`${HEADING.materials}\n${draft.materials.trim()}`);
  if (draft.labour.trim()) sections.push(`${HEADING.labour}\n${draft.labour.trim()}`);
  if (draft.privateNotes.trim()) sections.push(`${HEADING.privateNotes}\n${draft.privateNotes.trim()}`);
  if (draft.pricingLines.length > 0) {
    const lines = draft.pricingLines
      .map((line) => {
        const amount = line.amount.trim() ? `£${line.amount.trim()}` : '';
        return [line.description.trim(), amount].filter(Boolean).join(' — ');
      })
      .filter(Boolean);
    if (lines.length) sections.push(`${HEADING.pricing}\n${lines.join('\n')}`);
  }
  return sections.join('\n\n');
}

export function draftToFieldFill(
  draft: StructuredReportDraft,
  previous: VoiceFieldSnapshot,
  mode: 'replace' | 'append' = 'replace'
): VoiceFieldFill {
  return {
    workCompleted: mergeField(previous.workCompleted, draft.workCompleted, mode),
    materials: mergeField(previous.materials, draft.materials, mode),
    recommendations: mergeField(previous.recommendations, draft.labour, mode),
    notes: mergeField(previous.notes, draft.privateNotes, mode),
    pricing: mergePricing(previous.pricing, draft.pricingLines, mode),
  };
}

export function transcriptToFieldFill(transcript: string, _previous: VoiceFieldSnapshot): VoiceFieldFill {
  const next = polishSummary(tidySpeech(transcript));
  return {
    workCompleted: next ? next : null,
    materials: null,
    recommendations: null,
    notes: null,
    pricing: null,
  };
}

export function insertApprovedDescription(
  previousText: string,
  approvedText: string,
  mode: 'replace' | 'append' = 'replace'
): string {
  const next = approvedText.trim();
  if (!next) return previousText;
  if (mode === 'replace' || !previousText.trim()) return next;
  return `${previousText.trim()}\n\n${next}`;
}

function mergeField(previous: string, incoming: string, mode: 'replace' | 'append'): string | null {
  const next = incoming.trim();
  if (!next) return null;
  if (mode === 'replace' || !previous.trim()) return next;
  return `${previous.trim()}\n\n${next}`;
}

function mergePricing(
  previous: ReportPricing,
  lines: VoicePricingLineDraft[],
  mode: 'replace' | 'append'
): ReportPricing | null {
  if (!lines.length) return null;
  const mapped = lines.map((line) => ({
    ...blankPricingLine(generateId(), line.category),
    description: line.description.trim().slice(0, 160),
    amount: line.amount.trim(),
  }));
  if (mode === 'append' && previous.lines.length > 0) {
    return { enabled: true, lines: [...previous.lines, ...mapped].slice(0, 40) };
  }
  return { enabled: true, lines: mapped.slice(0, 40) };
}

/**
 * Split on materials / labour / private anchors. Do NOT split on bare "and"
 * — that was shredding Whisper run-ons and stuffing work into Materials.
 */
function segmentByTopic(text: string): Segment[] {
  const source = text.trim();
  if (!source) return [];

  const anchor =
    /\b(materials?(?:\s+used)?|labou?r(?:\s+details?)?|private(?:\s+notes?)?)\b/gi;
  const matches = [...source.matchAll(anchor)];
  if (matches.length === 0) {
    return [{ topic: 'summary', text: source }];
  }

  const segments: Segment[] = [];
  const first = matches[0];
  const firstIndex = first?.index ?? 0;
  if (first && firstIndex > 0) {
    segments.push({ topic: 'summary', text: source.slice(0, firstIndex).trim() });
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match) continue;
    const start = match.index ?? 0;
    const next = matches[i + 1];
    const end = next?.index ?? source.length;
    const keyword = (match[1] ?? '').toLowerCase();
    const body = source.slice(start + match[0].length, end).trim();
    const topic: Topic = keyword.startsWith('material')
      ? 'materials'
      : keyword.startsWith('labo')
        ? 'labour'
        : keyword.startsWith('private')
          ? 'privateNotes'
          : 'summary';
    segments.push({ topic, text: body });
  }

  return segments;
}

/**
 * Find every spoken amount in the full transcript and remove those spans so
 * remaining text can be sorted into Summary / Materials / Labour / Notes.
 */
function extractAllPricing(text: string): { pricingLines: VoicePricingLineDraft[]; remainder: string } {
  const pricingLines: VoicePricingLineDraft[] = [];
  const removals: Array<{ start: number; end: number }> = [];

  const patterns: RegExp[] = [
    /£\s*(\d+(?:\.\d{1,2})?)/gi,
    /\b(\d+(?:\.\d{1,2})?)\s*(?:quid|pounds?)\b/gi,
    /\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|and|\s){1,40}?)\s*(?:quid|pounds?)\b/gi,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawAmount = match[1]?.trim() ?? '';
      const amount = /^\d/.test(rawAmount) ? rawAmount : parseNumberWords(rawAmount);
      if (!amount) continue;

      const start = match.index;
      const end = start + match[0].length;
      // Skip overlaps with an already-captured amount.
      if (removals.some((span) => start < span.end && end > span.start)) continue;

      const contextStart = Math.max(0, start - 48);
      const context = text.slice(contextStart, start).trim();
      const category = categorizePriceContext(`${context} ${match[0]}`);
      const description = describePriceContext(context, category);

      pricingLines.push({ description, category, amount });
      removals.push({ start, end });
    }
  }

  removals.sort((a, b) => b.start - a.start);
  let remainder = text;
  for (const span of removals) {
    // Also drop soft lead-ins glued to the amount: "was", "cost", "it was".
    let from = span.start;
    const lead = remainder.slice(Math.max(0, from - 12), from).toLowerCase();
    const leadMatch = lead.match(/((?:(?:it|that)\s+was|cost(?:ing)?|charged?|priced?|at|for|of)\s+)$/i);
    const leadText = leadMatch?.[1];
    if (leadText) from -= leadText.length;
    remainder = `${remainder.slice(0, from)} ${remainder.slice(span.end)}`;
  }

  remainder = remainder.replace(/\s+/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  return { pricingLines: dedupePricing(pricingLines), remainder };
}

function categorizePriceContext(context: string): VoicePricingLineDraft['category'] {
  const lower = context.toLowerCase();
  if (/\blabou?r\b/.test(lower)) return 'labour';
  if (/\bmaterials?\b|\btimber\b|\bcopper\b|\bpipe\b|\btiles?\b|\bsilicone\b|\bcable\b|\bpaint\b|\bbrackets?\b|\bscrews?\b|\bfittings?\b|\bmixer\b/.test(lower)) {
    return 'materials';
  }
  return 'other';
}

function describePriceContext(context: string, category: VoicePricingLineDraft['category']): string {
  let desc = context
    .replace(/^(?:.*?)(?:materials?(?:\s+used)?|labou?r(?:\s+details?)?|private(?:\s+notes?)?)\s*/i, '')
    .replace(/\b(?:was|were|cost(?:ing)?|charged?|priced?|at|for|of|it|that|the|a|an)\b/gi, ' ')
    .replace(/[,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Prefer the last 1–4 content words before the amount.
  const words = desc.split(/\s+/).filter(Boolean);
  if (words.length > 4) desc = words.slice(-4).join(' ');

  if (!desc) {
    return category === 'labour' ? 'Labour' : category === 'materials' ? 'Materials' : 'Job cost';
  }
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

function dedupePricing(lines: VoicePricingLineDraft[]): VoicePricingLineDraft[] {
  const seen = new Set<string>();
  const out: VoicePricingLineDraft[] = [];
  for (const line of lines) {
    const key = `${line.category}|${line.amount}|${line.description.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function parseMaterialsList(section: string): string[] {
  let text = section
    .replace(/^(?:were|was|are|is|:|-)\s*/i, '')
    .replace(/\.$/, '')
    .trim();
  if (!text || /^materials?(?:\s+used)?$/i.test(text)) return [];

  // Cut at labour/private if anchors leaked into the section body.
  text = (text.split(/\b(?:labou?r(?:\s+details?)?|private(?:\s+notes?)?)\b/i)[0] ?? text).trim();
  if (!text) return [];

  const parts = text
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((part) => part.replace(/^(?:were|was|are|is|the|a|an)\s+/i, '').trim())
    .map((part) => part.replace(/\.+$/, ''))
    .filter((part) => part.length > 1 && !/^(?:used|were|was)$/i.test(part));

  return uniqueLines(parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)));
}

function polishSummary(sentence: string): string {
  let text = sentence.trim();
  if (!text) return '';

  text = text.replace(
    /^(?:i|we|they)\s+(?:just\s+)?(?:did|done|have done|had done|completed|finished)\s+(?:a|an|the|some)?\s*/i,
    ''
  );
  text = text.replace(/^(?:this was|it was|that was)\s+(?:a|an|the)?\s*/i, '');
  text = text.replace(/^(?:then|so|and then|and so|anyway|also|plus)\s*[,:]?\s+/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  if (!text || /^(?:then|so|and|okay|ok)\.?$/i.test(text)) return '';

  const withCap = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(withCap) ? withCap : `${withCap}.`;
}

function polishLabour(sentence: string): string {
  let text = sentence.trim();
  if (!text) return '';
  text = text.replace(/^(?:were|was|are|is|:|-)\s*/i, '');
  text = text.replace(/^(?:the\s+)?labou?r(?:\s+details?)?\s*(?:could be|was|were|is|are|:)?\s*/i, '');
  text = text.split(/\b(?:materials?(?:\s+used)?|private(?:\s+notes?)?)\b/i)[0]?.trim() ?? text;
  text = text.replace(/\s+/g, ' ').trim();
  if (!text || /^(?:something else|whatever|etc)\.?$/i.test(text)) return '';
  const withCap = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(withCap) ? withCap : `${withCap}.`;
}

function polishPrivateNote(sentence: string): string {
  let text = sentence.trim();
  text = text.replace(/^(?:were|was|are|is|:|-)\s*/i, '');
  text = text.replace(/^(?:private(?:ly)?(?:\s+note)?|note to self|off the record)\s*[:\-]?\s*/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const withCap = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(withCap) ? withCap : `${withCap}.`;
}

function joinSentences(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line.trim());
  }
  return out;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

function parseNumberWords(raw: string): string | null {
  const tokens = raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token && token !== 'and');
  if (!tokens.length) return null;
  let current = 0;
  for (const token of tokens) {
    const value = NUMBER_WORDS[token];
    if (value == null) return null;
    if (value === 100) current = (current || 1) * 100;
    else current += value;
  }
  return current > 0 ? String(current) : null;
}
