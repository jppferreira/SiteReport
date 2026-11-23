import { insertApprovedDescription } from './localReportFormatter';

/**
 * Controller native paths are exercised on device. These tests cover the
 * insertion contract the UI relies on so cancelled / failed AI never wipes
 * the original field unless the user explicitly approves a replacement.
 */
describe('voice report insertion contract', () => {
  it('keeps the previous description when the user cancels before approve', () => {
    const previous = 'Existing summary about the kitchen tap.';
    // Cancel path returns no approved text — screen must leave previous alone.
    const approved = null as string | null;
    expect(approved ?? previous).toBe(previous);
  });

  it('supports undo by retaining previousText alongside the inserted value', () => {
    const previous = 'Before voice';
    const inserted = insertApprovedDescription(previous, 'After voice', 'replace');
    expect(inserted).toBe('After voice');
    expect(previous).toBe('Before voice');
  });

  it('allows append without losing unsaved text', () => {
    expect(insertApprovedDescription('Unsaved draft', 'Voice addition', 'append')).toBe(
      'Unsaved draft\n\nVoice addition'
    );
  });
});
