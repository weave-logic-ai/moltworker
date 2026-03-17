/**
 * TTS text normalization — lightweight, fast preprocessing before ElevenLabs.
 *
 * Converts AI output text into speakable form:
 * - Strips markdown (links, images, code blocks, formatting)
 * - Converts numbers to words (42 → "forty-two", 1st → "first")
 * - Verbalizes list bullets
 * - Cleans up spacing, removes URLs, citations
 * - Handles currency ($42.50 → "forty-two dollars and fifty cents")
 */

// ---------------------------------------------------------------------------
// Number-to-words (lightweight, no dependencies)
// ---------------------------------------------------------------------------

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

function numToWords(n) {
  if (n === 0) return 'zero';
  if (n < 0) return 'negative ' + numToWords(-n);
  if (!Number.isFinite(n) || n > 999999999999999) return String(n);

  let words = [];
  let scaleIdx = 0;
  let num = Math.floor(n);

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      let part = '';
      const h = Math.floor(chunk / 100);
      const t = chunk % 100;
      if (h > 0) part += ONES[h] + ' hundred';
      if (t > 0) {
        if (h > 0) part += ' and ';
        if (t < 20) part += ONES[t];
        else part += TENS[Math.floor(t / 10)] + (t % 10 ? '-' + ONES[t % 10] : '');
      }
      if (SCALES[scaleIdx]) part += ' ' + SCALES[scaleIdx];
      words.unshift(part);
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }
  return words.join(', ');
}

const ORDINAL_SUFFIX = { 1: 'first', 2: 'second', 3: 'third', 5: 'fifth', 8: 'eighth', 9: 'ninth', 12: 'twelfth' };

function numToOrdinal(n) {
  if (n <= 0) return numToWords(n);
  if (n <= 19 && ORDINAL_SUFFIX[n]) return ORDINAL_SUFFIX[n];
  if (n <= 19) return ONES[n] + 'th';
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return TENS[t].replace(/y$/, 'ie') + 'th';
    return TENS[t] + '-' + numToOrdinal(o);
  }
  // For larger ordinals, just append "th" to cardinal
  const w = numToWords(n);
  if (w.endsWith('y')) return w.replace(/y$/, 'ieth');
  if (w.endsWith('e')) return w + 'th';
  return w + 'th';
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

function currencyToWords(match, sign, dollars, cents) {
  let result = '';
  const d = parseInt(dollars, 10);
  if (d > 0) result += numToWords(d) + (d === 1 ? ' dollar' : ' dollars');
  if (cents) {
    const c = parseInt(cents, 10);
    if (c > 0) {
      if (result) result += ' and ';
      result += numToWords(c) + (c === 1 ? ' cent' : ' cents');
    }
  }
  return result || 'zero dollars';
}

// ---------------------------------------------------------------------------
// Main normalizer
// ---------------------------------------------------------------------------

function normalizeForTts(text) {
  if (!text || typeof text !== 'string') return '';

  let t = text;

  // Markdown: code blocks → refer to display
  t = t.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang) => {
    return lang ? `See your screen for the ${lang} code.` : 'See your screen for the code snippet.';
  });
  t = t.replace(/```[\s\S]*?```/g, 'See your screen for the code.');

  // Inline code → just the text
  t = t.replace(/`([^`]+)`/g, '$1');

  // Markdown: images → remove
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // Markdown: links → keep text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Markdown: headings → just the text
  t = t.replace(/^#{1,6}\s+/gm, '');

  // Markdown: bold/italic
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');

  // Markdown: strikethrough
  t = t.replace(/~~([^~]+)~~/g, '$1');

  // List bullets → pause
  t = t.replace(/^\s*[-*•]\s+/gm, '. ');
  t = t.replace(/^\s*\d+\.\s+/gm, '. ');

  // Tables → refer to display
  t = t.replace(/\|[^\n]+\|(\n\|[-:| ]+\|)?(\n\|[^\n]+\|)+/g, 'See your screen for the table.');

  // Blockquotes
  t = t.replace(/^>\s+/gm, '');

  // Long lists (4+ items) → summarize
  const listMatch = t.match(/((?:^\.\s+[^\n]+\n?){4,})/m);
  if (listMatch) {
    const items = listMatch[0].split('\n').filter(l => l.trim().startsWith('.')).length;
    t = t.replace(listMatch[0], `There are ${numToWords(items)} items. See your screen for the full list. `);
  }

  // Horizontal rules
  t = t.replace(/^[-*_]{3,}\s*$/gm, '');

  // URLs → remove or say "link"
  t = t.replace(/https?:\/\/\S+/g, '');

  // Citations [1], [2] etc
  t = t.replace(/\[(\d+)\]/g, '');

  // Currency: $42.50 → "forty-two dollars and fifty cents"
  t = t.replace(/(\$)(\d+)(?:\.(\d{2}))?/g, currencyToWords);

  // Ordinals: 1st, 2nd, 3rd, 4th
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, n) => numToOrdinal(parseInt(n, 10)));

  // Percentages: 85% → "eighty-five percent"
  t = t.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => {
    const num = parseFloat(n);
    return (Number.isInteger(num) ? numToWords(num) : n) + ' percent';
  });

  // Standalone numbers (not in middle of words): 42 → "forty-two"
  // Only convert numbers up to 9999 to keep it natural
  t = t.replace(/\b(\d{1,4})\b/g, (match) => {
    const n = parseInt(match, 10);
    return n <= 9999 ? numToWords(n) : match;
  });

  // Common abbreviations
  t = t.replace(/\bAPI\b/g, 'A P I');
  t = t.replace(/\bURL\b/g, 'U R L');
  t = t.replace(/\bUI\b/g, 'U I');
  t = t.replace(/\bAI\b/g, 'A I');
  t = t.replace(/\bCPU\b/g, 'C P U');
  t = t.replace(/\bGPU\b/g, 'G P U');
  t = t.replace(/\bRAM\b/g, 'ram');
  t = t.replace(/\bSSH\b/g, 'S S H');
  t = t.replace(/\bDNS\b/g, 'D N S');
  t = t.replace(/\bHTTP\b/g, 'H T T P');
  t = t.replace(/\bJSON\b/g, 'jason');
  t = t.replace(/\be\.g\./gi, 'for example');
  t = t.replace(/\bi\.e\./gi, 'that is');
  t = t.replace(/\betc\./gi, 'etcetera');
  t = t.replace(/\bvs\./gi, 'versus');

  // Clean up whitespace
  t = t.replace(/\n+/g, '. ');
  t = t.replace(/\.\s*\./g, '.');
  t = t.replace(/\s+/g, ' ');
  t = t.trim();

  // Remove leading/trailing periods
  t = t.replace(/^\.\s*/, '').replace(/\.\s*$/, '.');

  return t;
}

module.exports = { normalizeForTts, numToWords, numToOrdinal };
