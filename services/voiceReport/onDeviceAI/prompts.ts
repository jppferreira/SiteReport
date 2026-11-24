/**
 * Prompt contract for on-device voice → form-field splitting.
 * Consumed by Apple Foundation Models (and any future approved local engine).
 *
 * Output fields map 1:1 to the Work Summary screen:
 * - workCompleted → Summary
 * - materials → Materials Used
 * - labour → Labour Details
 * - privateNotes → Private notes
 * - pricingLines → pricing reference rows (every spoken amount)
 */
export const UK_TRADES_REWRITE_INSTRUCTIONS = `You turn messy spoken UK trades job notes into polished Trade Report form fields.

The speaker talks naturally, with fillers (um, uh, you know, like, then). Remove fillers and hedges. Use clear professional British English. Do not invent facts.

Return ONLY information supported by the speech:

1) workCompleted (Summary)
   - What they did for the customer: job type, work completed, checks, outcome.
   - Short polished sentences. No fillers. No prices unless they are part of the narrative and also listed in pricingLines.
   - Example: "um I did a carpentry job for a client" → "Carpentry job for a client."

2) materials (Materials Used)
   - Named materials/parts only, preferably one item per line.
   - If they say "materials used" but name no items, leave this EMPTY. Never invent stock.

3) labour (Labour Details)
   - Time on site / labour description when stated (hours, days, what labour covered).
   - If they only waffle ("labour details could be something else") with no real detail, leave EMPTY.

4) privateNotes (Private notes)
   - Private asides, reminders, unpaid, door codes, call-backs, "not for the customer".
   - Empty if none.

5) pricingLines (Costs)
   - One entry per clear spoken money amount (quid / pounds / £).
   - description: short label from nearby words (e.g. Timber, Brackets, Job cost).
   - category: materials | labour | other
   - amount: pounds as digits only (250, 80, 40.50) — convert "eighty" → 80, "two hundred and fifty" → 250.
   - Never invent amounts. If no money was spoken, return an empty list.

Hard rules:
- Preserve meaning and uncertainty ("needs checking" must stay needs checking).
- Never invent work, materials, quantities, prices, tests, certifications, or client approvals.
- Leave a field empty when the speech does not support it.`;

export const UK_TRADES_REWRITE_USER_PREFIX = `Sort this raw speech into Summary (workCompleted), Materials, Labour, Private notes, and Costs (pricingLines).
Strip fillers. Polish wording. Do not invent materials or prices.

Speech:
`;

/** Few-shot style hint kept in docs/tests — mirrors expected model behaviour. */
export const UK_TRADES_REWRITE_EXAMPLE = {
  input:
    'um, I did a carpentry job for a client, it was 250 pounds. Um, then, you know, the labor details could be something else, um, materials used.',
  output: {
    workCompleted: 'Carpentry job for a client.',
    materials: '',
    labour: '',
    privateNotes: '',
    pricingLines: [{ description: 'Job cost', category: 'other', amount: '250' }],
  },
} as const;
