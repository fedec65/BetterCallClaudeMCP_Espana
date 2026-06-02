import { describe, it, expect } from 'vitest';
import { validateCitation, parseCitation, formatCitation, convertToEcli, extractCitations } from '../src/citations.js';

describe('Citation Parser', () => {
  describe('validateCitation', () => {
    it('should validate BOE identifiers', () => {
      expect(validateCitation('BOE-A-2015-10566').valid).toBe(true);
      expect(validateCitation('BOE-A-2015-10566').type).toBe('boe');
    });

    it('should validate ECLI', () => {
      expect(validateCitation('ECLI:ES:TS:2020:599').valid).toBe(true);
      expect(validateCitation('ECLI:ES:TS:2020:599').type).toBe('ecli');
    });

    it('should validate Ley', () => {
      expect(validateCitation('Ley 39/2015').valid).toBe(true);
      expect(validateCitation('Ley 39/2015').type).toBe('ley');
    });

    it('should validate STS', () => {
      expect(validateCitation('STS 123/2020').valid).toBe(true);
      expect(validateCitation('STS 123/2020').type).toBe('sts');
    });

    it('should reject invalid citations', () => {
      expect(validateCitation('not-a-citation').valid).toBe(false);
    });
  });

  describe('parseCitation', () => {
    it('should parse BOE with URL', () => {
      const parsed = parseCitation('BOE-A-2015-10566');
      expect(parsed.type).toBe('boe');
      expect(parsed.isValid).toBe(true);
      expect(parsed.url).toContain('boe.es');
    });

    it('should parse ECLI with components', () => {
      const parsed = parseCitation('ECLI:ES:TS:2020:599');
      expect(parsed.type).toBe('ecli');
      expect(parsed.components.court).toBe('TS');
      expect(parsed.components.year).toBe('2020');
    });

    it('should parse STS', () => {
      const parsed = parseCitation('STS 123/2020');
      expect(parsed.type).toBe('sts');
      expect(parsed.components.number).toBe('123');
      expect(parsed.components.year).toBe('2020');
    });
  });

  describe('formatCitation', () => {
    it('should format in official style', () => {
      expect(formatCitation('Ley 39/2015', 'official')).toBe('Ley 39/2015');
    });

    it('should format in short style', () => {
      expect(formatCitation('Ley Orgánica 39/2015', 'short')).toBe('LO 39/2015');
      expect(formatCitation('Ley 39/2015', 'short')).toBe('Ley 39/2015');
    });
  });

  describe('convertToEcli', () => {
    it('should convert STS to ECLI', () => {
      expect(convertToEcli('STS 123/2020')).toBe('ECLI:ES:TS:2020:123');
    });

    it('should return null for non-convertible', () => {
      expect(convertToEcli('Ley 39/2015')).toBeNull();
    });
  });

  describe('extractCitations', () => {
    it('should extract multiple citations from text', () => {
      const text = 'Según la STS 123/2020 y la Ley 39/2015, el ECLI:ES:TS:2020:123 es relevante.';
      const results = extractCitations(text);
      expect(results.length).toBeGreaterThanOrEqual(2);
      const types = results.map((r) => r.type);
      expect(types).toContain('sts');
      expect(types).toContain('ecli');
    });
  });
});
