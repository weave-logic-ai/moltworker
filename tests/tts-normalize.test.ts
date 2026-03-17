import { describe, it, expect } from 'vitest';

// Import the CJS module
const { normalizeForTts, numToWords, numToOrdinal } = require('../skills/mentra-bridge/tts-normalize.cjs');

describe('numToWords', () => {
  it('converts basic numbers', () => {
    expect(numToWords(0)).toBe('zero');
    expect(numToWords(1)).toBe('one');
    expect(numToWords(13)).toBe('thirteen');
    expect(numToWords(42)).toBe('forty-two');
    expect(numToWords(100)).toBe('one hundred');
    expect(numToWords(256)).toBe('two hundred and fifty-six');
    expect(numToWords(1000)).toBe('one thousand');
    expect(numToWords(1234)).toBe('one thousand, two hundred and thirty-four');
  });

  it('converts negative numbers', () => {
    expect(numToWords(-5)).toBe('negative five');
  });
});

describe('numToOrdinal', () => {
  it('converts ordinals', () => {
    expect(numToOrdinal(1)).toBe('first');
    expect(numToOrdinal(2)).toBe('second');
    expect(numToOrdinal(3)).toBe('third');
    expect(numToOrdinal(4)).toBe('fourth');
    expect(numToOrdinal(5)).toBe('fifth');
    expect(numToOrdinal(12)).toBe('twelfth');
    expect(numToOrdinal(21)).toBe('twenty-first');
  });
});

describe('normalizeForTts', () => {
  it('strips markdown code blocks and refers to screen', () => {
    const input = 'Here is some code:\n```javascript\nconst x = 1;\n```\nDone.';
    const result = normalizeForTts(input);
    expect(result).toContain('See your screen for the javascript code');
    expect(result).not.toContain('const x');
  });

  it('strips inline code', () => {
    expect(normalizeForTts('Run `npm install`')).toBe('Run npm install');
  });

  it('strips markdown links keeping text', () => {
    expect(normalizeForTts('Visit [Google](https://google.com)')).toBe('Visit Google');
  });

  it('removes images', () => {
    expect(normalizeForTts('Look: ![alt](url) here')).toContain('Look:');
  });

  it('removes headings markup', () => {
    expect(normalizeForTts('## Hello')).toBe('Hello');
  });

  it('strips bold and italic', () => {
    expect(normalizeForTts('This is **bold** and *italic*')).toBe('This is bold and italic');
  });

  it('converts numbers to words', () => {
    const result = normalizeForTts('I have 42 items');
    expect(result).toContain('forty-two');
  });

  it('converts ordinals', () => {
    const result = normalizeForTts('The 1st place and 3rd attempt');
    expect(result).toContain('first');
    expect(result).toContain('third');
  });

  it('converts currency', () => {
    const result = normalizeForTts('It costs $42.50');
    expect(result).toContain('forty-two dollars');
    expect(result).toContain('fifty cents');
  });

  it('converts percentages', () => {
    const result = normalizeForTts('Memory at 85%');
    expect(result).toContain('eighty-five percent');
  });

  it('removes URLs', () => {
    expect(normalizeForTts('Go to https://example.com now')).toContain('Go to');
  });

  it('removes citations', () => {
    expect(normalizeForTts('According to sources [1] and [2]')).toContain('According to sources');
  });

  it('expands abbreviations', () => {
    const result = normalizeForTts('The API uses JSON');
    expect(result).toContain('A P I');
    expect(result).toContain('jason');
  });

  it('handles empty/null input', () => {
    expect(normalizeForTts('')).toBe('');
    expect(normalizeForTts(null)).toBe('');
  });

  it('collapses whitespace', () => {
    expect(normalizeForTts('hello\n\n\nworld')).toContain('hello');
  });

  it('handles tables by referring to screen', () => {
    const table = '| Name | Value |\n|------|-------|\n| A | 1 |\n| B | 2 |';
    expect(normalizeForTts(table)).toContain('See your screen for the table');
  });
});
