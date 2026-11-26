import { atMorningLocal } from './documentReminders';

describe('atMorningLocal', () => {
  it('schedules invoice chase at due + N days at 09:00 local', () => {
    const when = atMorningLocal('2026-11-20', 3);
    expect(when.getFullYear()).toBe(2026);
    expect(when.getMonth()).toBe(10);
    expect(when.getDate()).toBe(23);
    expect(when.getHours()).toBe(9);
    expect(when.getMinutes()).toBe(0);
  });

  it('schedules quote expiry reminder two days before validUntil', () => {
    const when = atMorningLocal('2026-12-10', -2);
    expect(when.getFullYear()).toBe(2026);
    expect(when.getMonth()).toBe(11);
    expect(when.getDate()).toBe(8);
    expect(when.getHours()).toBe(9);
  });
});
