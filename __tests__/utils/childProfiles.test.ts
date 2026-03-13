import {
  formatChildAgeForReferral,
  getChildAgeFromDateOfBirth,
} from '../../src/utils/childProfiles';

describe('child profile utilities', () => {
  describe('getChildAgeFromDateOfBirth', () => {
    it('returns null for empty input', () => {
      expect(getChildAgeFromDateOfBirth()).toBeNull();
      expect(getChildAgeFromDateOfBirth(null)).toBeNull();
      expect(getChildAgeFromDateOfBirth('')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(getChildAgeFromDateOfBirth('not-a-date')).toBeNull();
      expect(getChildAgeFromDateOfBirth('2026-99-99')).toBeNull();
    });

    it('returns null for future dates', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      expect(getChildAgeFromDateOfBirth(future.toISOString())).toBeNull();
    });

    it('returns a non-negative integer age for valid DOB', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 10);

      const age = getChildAgeFromDateOfBirth(date.toISOString());
      expect(age).not.toBeNull();
      expect(Number.isInteger(age)).toBe(true);
      expect((age as number) >= 9).toBe(true);
      expect((age as number) <= 10).toBe(true);
    });
  });

  describe('formatChildAgeForReferral', () => {
    it('returns null for invalid ages', () => {
      expect(formatChildAgeForReferral(null)).toBeNull();
      expect(formatChildAgeForReferral(-1)).toBeNull();
    });

    it('returns string value for valid age', () => {
      expect(formatChildAgeForReferral(0)).toBe('0');
      expect(formatChildAgeForReferral(12)).toBe('12');
    });
  });
});
