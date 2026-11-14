/**
 * Tidies YouTube titles written in capitals with "||" separators, e.g.
 *
 *   "HEAVENS OR GALAXIES? PART 2 || INTERPRETATION OF BIBLICAL PROPHECY || 11TH NOV 2026 || BTG MINISTRY"
 *   -> title "Heavens or Galaxies? Part 2", subtitle "Interpretation of Biblical Prophecy"
 *
 * The date and the ministry name are dropped because the app already shows the
 * date and who is speaking. Titles that are already in normal case are kept as written.
 */

const MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i;
const NUMERIC_DATE = /^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/;
const MINISTRY = /^(btg(\s+ministry)?|building the temple of god(\s+ministry)?)$/i;
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'vs', 'via', 'with']);
const KEEP_UPPER = new Set(['BTG', 'TV', 'USA', 'UK', 'DRC', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'KJV', 'NT', 'OT', 'Q&A']);

function isDate(segment: string) {
  return NUMERIC_DATE.test(segment) || (MONTH.test(segment) && /\d/.test(segment));
}

/** True when most letters are capitals (or the case is jumbled, like "lAWS"). */
function shouty(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.6;
}

function titleCase(text: string) {
  const words = text.toLowerCase().split(/(\s+)/);
  let index = 0;
  const count = words.filter((w) => w.trim()).length;
  return words
    .map((w) => {
      if (!w.trim()) return w;
      const i = index++;
      const bare = w.replace(/[^A-Za-z&]/g, '').toUpperCase();
      if (KEEP_UPPER.has(bare)) return w.toUpperCase();
      if (i > 0 && i < count - 1 && SMALL_WORDS.has(w.replace(/[^a-z]/g, ''))) return w;
      // Capitalise the first letter, and after a hyphen or opening bracket.
      return w.replace(/(^|[-(“"'‘])([a-z])/g, (_m, p: string, ch: string) => p + ch.toUpperCase());
    })
    .join('')
    // "Galaxies? part 2" -> "Galaxies? Part 2"
    .replace(/([?!:]\s+)([a-z])/g, (_m, p: string, ch: string) => p + ch.toUpperCase());
}

function clean(segment: string) {
  const s = segment.replace(/\s+/g, ' ').trim();
  return shouty(s) ? titleCase(s) : s;
}

export function tidyTitle(raw: string): { title: string; subtitle: string | null } {
  const original = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!original) return { title: 'Untitled', subtitle: null };
  const parts = original
    .split(/\s*\|{1,2}\s*/)
    .map((p) => p.trim())
    .filter((p) => p && !MINISTRY.test(p) && !isDate(p));
  if (!parts.length) return { title: clean(original.replace(/\|/g, ' ')), subtitle: null };
  const [first, ...rest] = parts.map(clean);
  return { title: first, subtitle: rest.length ? rest.join(' · ') : null };
}
