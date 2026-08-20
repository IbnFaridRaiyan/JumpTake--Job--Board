const KIND_NOUN_PATTERNS = {
  job: '(?:job\\s+posts?|jobs?|roles?|positions?|vacancies?|placements?|internships?)',
  company: '(?:company\\s+(?:users?|profiles?)|companies|business(?:es|\\s+users?|\\s+profiles?)|employer\\s+(?:users?|profiles?))',
  candidate: '(?:candidate\\s+(?:users?|profiles?)|candidates?|job\\s+seekers?|talent\\s+(?:profiles?|members?))',
  'work-news': '(?:work\\s*news(?:\\s+(?:posts?|updates?|drafts?))?|company\\s+(?:news|updates?|posts?)|news\\s+posts?)'
};

const GENERAL_QUANTITY_NOUNS = '(?:job\\s+posts?|jobs?|posts?|drafts?|updates?|roles?|stories?|companies|businesses|employers|candidates?|users?|profiles?|items?|creations?)';

const readPositiveCount = (match, max) => {
  const raw = Number(match?.[1]);
  if (!Number.isFinite(raw) || raw < 1) return 0;
  return Math.min(max, Math.floor(raw));
};

const findKindCount = (text, kind, max) => {
  const nounPattern = KIND_NOUN_PATTERNS[kind];
  if (!nounPattern) return 0;

  const patterns = [
    new RegExp(`\\b(\\d{1,5})\\s+(?:new\\s+|latest\\s+|recent\\s+)?${nounPattern}\\b`, 'i'),
    new RegExp(`\\b${nounPattern}\\b[^\\d]{0,36}\\b(\\d{1,5})\\b`, 'i'),
    new RegExp(`\\b(\\d{1,5})\\b[^\\d]{0,70}\\b${nounPattern}\\b`, 'i')
  ];

  for (const pattern of patterns) {
    const count = readPositiveCount(text.match(pattern), max);
    if (count) return count;
  }
  return 0;
};

const getRequestedDraftCount = (message, {
  enabled = true,
  kind = '',
  max = 1000
} = {}) => {
  if (!enabled) return 0;
  const text = String(message || '');
  const safeMax = Math.max(1, Number(max) || 1000);
  const kindCount = findKindCount(text, kind, safeMax);
  if (kindCount) return kindCount;

  const explicitPatterns = [
    new RegExp(`\\b(\\d{1,5})\\s+(?:new\\s+|latest\\s+|recent\\s+)?${GENERAL_QUANTITY_NOUNS}\\b`, 'i'),
    /\b(?:make|create|creation|generate|generation|prepare|fill|draft|collect|find)\s+(\d{1,5})\b/i,
    new RegExp(`\\b(?:make|create|generate|prepare|draft|collect|find)\\b[^\\d]{0,70}\\b(\\d{1,5})\\b`, 'i')
  ];

  for (const pattern of explicitPatterns) {
    const count = readPositiveCount(text.match(pattern), safeMax);
    if (count) return count;
  }

  return /\b(?:drafts|jobs|posts|updates|roles|profiles|companies|businesses|employers|candidates|users|pictures|photos|images)\b/i.test(text)
    ? Math.min(5, safeMax)
    : 1;
};

module.exports = { getRequestedDraftCount };
