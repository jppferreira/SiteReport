import { FLOATING_FIELD_HEIGHT, FLOATING_LABEL_BACKGROUND } from './fieldChrome';

describe('floating field chrome', () => {
  it('sizes the single-line control at 56px', () => {
    expect(FLOATING_FIELD_HEIGHT).toBe(56);
  });

  it('does not paint a background behind the label', () => {
    expect(FLOATING_LABEL_BACKGROUND).toBe('transparent');
  });
});
