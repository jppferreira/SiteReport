import { EMPTY_PRICING } from '@/models';

import {
  draftToFieldFill,
  formatTranscriptLocally,
  insertApprovedDescription,
  structuredDraftToReportText,
  tidySpeech,
} from './localReportFormatter';

describe('tidySpeech', () => {
  it('removes filler and capitalises', () => {
    expect(tidySpeech('um changed the tap yeah')).toBe('Changed the tap.');
  });

  it('strips rambling fillers like um, you know, and then', () => {
    const cleaned = tidySpeech(
      'um, I did a carpentry job for a client, it was 250 pounds. Um, then, you know, the labor details could be something else, um, materials used.'
    );
    expect(cleaned.toLowerCase()).not.toMatch(/\bum\b|\byou know\b/);
    expect(cleaned.toLowerCase()).toContain('carpentry job');
    expect(cleaned.toLowerCase()).toContain('250 pounds');
  });
});

describe('formatTranscriptLocally', () => {
  it('keeps a natural work description in Summary', () => {
    const result = formatTranscriptLocally(
      "Changed the tap in the kitchen, fixed the leak underneath, checked it all and everything's working."
    );
    expect(result.source).toBe('local_formatter');
    expect(result.structured.workCompleted.toLowerCase()).toContain('tap');
    expect(result.text).toContain('Summary');
  });

  it('puts materials into the materials box', () => {
    const result = formatTranscriptLocally(
      'Replaced the kitchen tap. Materials used were a new mixer tap and silicone.'
    );
    expect(result.structured.workCompleted.toLowerCase()).toContain('tap');
    expect(result.structured.materials.toLowerCase()).toMatch(/mixer|silicone/);
  });

  it('puts labour time into the labour box', () => {
    const result = formatTranscriptLocally('Fitted the boiler. Labour two days on site for removal and install.');
    expect(result.structured.labour.toLowerCase()).toMatch(/two days|on site/);
  });

  it('keeps private asides out of the summary', () => {
    const result = formatTranscriptLocally(
      'Rewired the socket in the lounge. Private note remind me the customer still owes for parts.'
    );
    expect(result.structured.workCompleted.toLowerCase()).toContain('rewired');
    expect(result.structured.privateNotes.toLowerCase()).toMatch(/owes|remind/);
  });

  it('extracts spoken costs without inventing amounts', () => {
    const result = formatTranscriptLocally(
      'Changed the tap. Materials eighty quid. Labour one hundred and twenty pounds.'
    );
    expect(result.structured.pricingLines.length).toBeGreaterThanOrEqual(2);
    expect(result.structured.pricingLines.some((line) => line.amount === '80')).toBe(true);
    expect(result.structured.pricingLines.some((line) => line.amount === '120')).toBe(true);
  });

  it('does not invent certification language', () => {
    const result = formatTranscriptLocally('Rewired the socket in the lounge.');
    expect(result.text.toLowerCase()).not.toMatch(/certified|part p|safe to use|guarantee/);
    expect(result.structured.workCompleted.toLowerCase()).toContain('rewired');
  });

  it('fills every box from one Whisper-style run-on recording', () => {
    const result = formatTranscriptLocally(
      'um I did a carpentry job for a client fitted some shelves materials used were timber screws and brackets timber was eighty quid brackets forty pounds labour two days on site private note customer still owes for the timber'
    );

    expect(result.structured.workCompleted.toLowerCase()).toMatch(/carpentry|shelves/);
    expect(result.structured.workCompleted.toLowerCase()).not.toMatch(/\bum\b|\bi did\b/);
    expect(result.structured.materials.toLowerCase()).toMatch(/timber/);
    expect(result.structured.materials.toLowerCase()).toMatch(/screw|bracket/);
    expect(result.structured.labour.toLowerCase()).toMatch(/two days|on site/);
    expect(result.structured.privateNotes.toLowerCase()).toMatch(/owes|timber/);
    expect(result.structured.pricingLines.some((line) => line.amount === '80')).toBe(true);
    expect(result.structured.pricingLines.some((line) => line.amount === '40')).toBe(true);
  });

  it('keeps summary intact when materials and multiple prices follow', () => {
    const result = formatTranscriptLocally(
      'Changed the kitchen tap. Materials used: mixer tap and silicone. Mixer tap eighty quid. Silicone ten pounds. Labour two hours on site. Private note remind me they want a follow up next week.'
    );
    expect(result.structured.workCompleted.toLowerCase()).toContain('kitchen tap');
    expect(result.structured.materials.toLowerCase()).toMatch(/mixer/);
    expect(result.structured.materials.toLowerCase()).toMatch(/silicone/);
    expect(result.structured.labour.toLowerCase()).toMatch(/two hours/);
    expect(result.structured.privateNotes.toLowerCase()).toMatch(/follow up/);
    expect(result.structured.pricingLines.map((line) => line.amount).sort()).toEqual(['10', '80']);
  });
});

describe('structuredDraftToReportText', () => {
  it('omits empty optional sections', () => {
    expect(
      structuredDraftToReportText({
        workCompleted: 'Replaced the kitchen tap.',
        materials: '',
        labour: '',
        privateNotes: '',
        pricingLines: [],
      })
    ).toBe('Summary\nReplaced the kitchen tap.');
  });
});

describe('draftToFieldFill', () => {
  it('only updates boxes that have spoken content', () => {
    const fill = draftToFieldFill(
      {
        workCompleted: 'Replaced the kitchen tap.',
        materials: 'Mixer tap\nSilicone',
        labour: '',
        privateNotes: '',
        pricingLines: [],
      },
      {
        workCompleted: 'Old summary',
        materials: 'Old materials',
        recommendations: 'Keep labour',
        notes: 'Keep notes',
        pricing: EMPTY_PRICING,
      }
    );
    expect(fill.workCompleted).toBe('Replaced the kitchen tap.');
    expect(fill.materials).toBe('Mixer tap\nSilicone');
    expect(fill.recommendations).toBeNull();
    expect(fill.notes).toBeNull();
    expect(fill.pricing).toBeNull();
  });
});

describe('insertApprovedDescription', () => {
  it('does not wipe previous text unless replace is chosen', () => {
    expect(insertApprovedDescription('Existing notes.', 'New voice text.', 'append')).toBe(
      'Existing notes.\n\nNew voice text.'
    );
    expect(insertApprovedDescription('Existing notes.', 'New voice text.', 'replace')).toBe('New voice text.');
  });

  it('preserves previous text when approved text is empty', () => {
    expect(insertApprovedDescription('Keep me', '   ', 'replace')).toBe('Keep me');
  });
});
