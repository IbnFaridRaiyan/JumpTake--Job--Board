const crypto = require('crypto');

const TRACKING_QUERY_KEYS = new Set([
  'source', 'ref', 'referrer', 'referer', 'tracking', 'trk', 'gh_src',
  'campaign', 'campaignid', 'adgroup', 'adgroupid', 'gclid', 'fbclid', 'msclkid'
]);

const normalizeIdentityText = (value = '') => String(value || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const normalizeIdentityUrl = (value = '', { stripAllQuery = false } = {}) => {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';

  try {
    const url = new URL(raw);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.hash = '';
    if (stripAllQuery) {
      url.search = '';
    } else {
      [...url.searchParams.keys()].forEach((key) => {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey.startsWith('utm_') || TRACKING_QUERY_KEYS.has(normalizedKey)) {
          url.searchParams.delete(key);
        }
      });
      url.searchParams.sort();
    }
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    return '';
  }
};

const fingerprintValue = (value = '') => {
  const normalized = String(value || '').trim();
  return normalized ? crypto.createHash('sha256').update(normalized).digest('hex') : '';
};

const profileImageIdentity = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return `image:${fingerprintValue(raw)}`;
  const normalizedUrl = normalizeIdentityUrl(raw, { stripAllQuery: true });
  return normalizedUrl ? `image:${normalizedUrl}` : '';
};

const compactKeys = (keys) => [...new Set(keys.filter(Boolean))];

const jobIdentityKeys = (draft = {}) => {
  const source = normalizeIdentityUrl(draft.source || draft.sourceUrl);
  const applicationLink = normalizeIdentityUrl(draft.applicationLink);
  const company = normalizeIdentityText(draft.companyName || draft.company?.name || draft.company);
  const title = normalizeIdentityText(draft.title);
  const location = normalizeIdentityText(draft.location);
  return compactKeys([
    source && `job-url:${source}`,
    applicationLink && `job-url:${applicationLink}`,
    company && title && `job-role:${company}|${title}|${location}`
  ]);
};

const companyIdentityKeys = (draft = {}) => {
  const name = normalizeIdentityText(draft.name || draft.companyName || draft.authorName);
  const website = normalizeIdentityUrl(draft.website);
  const jumptakeId = normalizeIdentityText(draft.jumptakeId || draft.companyJumpTakeId);
  const logo = profileImageIdentity(draft.logo || draft.companyLogoUrl || draft.authorAvatar);
  return compactKeys([
    name && `company-name:${name}`,
    website && `company-site:${website}`,
    jumptakeId && `company-jumptake:${jumptakeId}`,
    logo && `company-${logo}`
  ]);
};

const candidateIdentityKeys = (draft = {}) => {
  const name = normalizeIdentityText(draft.name || draft.authorName);
  const email = normalizeIdentityText(draft.email);
  const jumptakeId = normalizeIdentityText(draft.jumptakeId);
  const profileImage = profileImageIdentity(draft.profileImage || draft.authorAvatar);
  const storyBody = normalizeIdentityText(draft.talentStory?.body || draft.storyBody);
  return compactKeys([
    name && `candidate-name:${name}`,
    email && `candidate-email:${email}`,
    jumptakeId && `candidate-jumptake:${jumptakeId}`,
    profileImage && `candidate-${profileImage}`,
    storyBody && `talent-story-body:${fingerprintValue(storyBody)}`
  ]);
};

const feedPostIdentityKeys = (post = {}) => {
  const type = String(post.type || '').trim().toLowerCase();
  const body = normalizeIdentityText(post.body || post.talentStory?.body || post.storyBody);
  const source = normalizeIdentityUrl(post.source);
  return compactKeys([
    source && `${type || 'feed'}-source:${source}`,
    body && `${type || 'feed'}-body:${fingerprintValue(body)}`
  ]);
};

const addIdentityKeys = (target, values) => {
  const set = target instanceof Set ? target : new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    if (value) set.add(value);
  });
  return set;
};

const filterUniqueDrafts = (rows, existingKeys, identityKeyFactory, limit = Infinity) => {
  const keys = existingKeys instanceof Set ? existingKeys : new Set(existingKeys || []);
  const accepted = [];
  let rejectedCount = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const rowKeys = compactKeys(identityKeyFactory(row));
    if (rowKeys.length && rowKeys.some((key) => keys.has(key))) {
      rejectedCount += 1;
      continue;
    }
    addIdentityKeys(keys, rowKeys);
    accepted.push(row);
    if (accepted.length >= limit) break;
  }

  return { rows: accepted, keys, rejectedCount };
};

module.exports = {
  addIdentityKeys,
  candidateIdentityKeys,
  companyIdentityKeys,
  feedPostIdentityKeys,
  filterUniqueDrafts,
  fingerprintValue,
  jobIdentityKeys,
  normalizeIdentityText,
  normalizeIdentityUrl,
  profileImageIdentity
};
