import { describe, it, expect } from 'vitest';
import { isValidEcli, parseEcli } from '../src/ecli-utils.js';

describe('ECLI Utils', () => {
  describe('isValidEcli', () => {
    it('should validate correct ECLI format', () => {
      expect(isValidEcli('ECLI:ES:TS:2020:599')).toBe(true);
      expect(isValidEcli('ECLI:ES:TC:1981:1')).toBe(true);
      expect(isValidEcli('ECLI:ES:AN:2015:123A')).toBe(true);
    });

    it('should reject invalid ECLI format', () => {
      expect(isValidEcli('ECLI:FR:TS:2020:599')).toBe(false);
      expect(isValidEcli('ECLI:ES:TS:20:599')).toBe(false);
      expect(isValidEcli('invalid')).toBe(false);
      expect(isValidEcli('')).toBe(false);
    });
  });

  describe('parseEcli', () => {
    it('should parse ECLI components', () => {
      const parsed = parseEcli('ECLI:ES:TS:2020:599');
      expect(parsed).not.toBeNull();
      expect(parsed?.country).toBe('ES');
      expect(parsed?.court).toBe('TS');
      expect(parsed?.year).toBe('2020');
      expect(parsed?.number).toBe('599');
    });

    it('should return null for invalid ECLI', () => {
      expect(parseEcli('invalid')).toBeNull();
    });
  });
});
