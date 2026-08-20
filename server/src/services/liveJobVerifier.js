const dns = require('dns').promises;
const net = require('net');
const axios = require('axios');
const cheerio = require('cheerio');

const MAX_REDIRECTS = 6;
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Math.max(4000, Number(process.env.JOB_LINK_TIMEOUT_MS) || 12000);
const USER_AGENT = 'JumpTake-LiveJobVerifier/1.0 (+https://jumptake.com)';
const DEFAULT_GREENHOUSE_JOB_BOARDS = [
  { token: 'anthropic', name: 'Anthropic' },
  { token: 'stripe', name: 'Stripe' },
  { token: 'datadog', name: 'Datadog' },
  { token: 'discord', name: 'Discord' },
  { token: 'duolingo', name: 'Duolingo' },
  { token: 'figma', name: 'Figma' },
  { token: 'reddit', name: 'Reddit' },
  { token: 'cloudflare', name: 'Cloudflare' },
  { token: 'mongodb', name: 'MongoDB' },
  { token: 'robinhood', name: 'Robinhood' },
  { token: 'affirm', name: 'Affirm' },
  { token: 'scaleai', name: 'Scale AI' },
  { token: 'synack', name: 'Synack', roleUrlTemplate: 'https://www.synack.com/careers/?gh_jid={id}' }
];

const ROLE_QUERY_KEYS = new Set([
  'gh_jid', 'jobid', 'job_id', 'job', 'jid', 'jk', 'postingid', 'posting_id',
  'requisitionid', 'requisition_id', 'reqid', 'req_id', 'vacancyid', 'vacancy_id',
  'career_job_req_id'
]);
const SEARCH_QUERY_KEYS = new Set([
  'q', 'query', 'keyword', 'keywords', 'search', 'location', 'l', 'radius',
  'page', 'start', 'sort', 'filter', 'category', 'department'
]);
const KNOWN_AGGREGATOR_HOSTS = [
  'indeed.com',
  'linkedin.com',
  'gradcracker.com',
  'ratemyplacement.co.uk',
  'higherin.com'
];

const normalizeHttpUrl = (value = '', baseUrl = '') => {
  try {
    const url = baseUrl ? new URL(String(value || '').trim(), baseUrl) : new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.username = '';
    url.password = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
};

const getComparableHost = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/^www\./, '')
  .replace(/\.$/, '');

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

const getDecodedPath = (url) => {
  try {
    return decodeURIComponent(url.pathname || '/');
  } catch (error) {
    return url.pathname || '/';
  }
};

const hasRoleQueryIdentity = (url) => [...url.searchParams.entries()].some(([key, value]) => {
  if (!ROLE_QUERY_KEYS.has(String(key || '').toLowerCase())) return false;
  const identity = String(value || '').trim();
  return /^[a-z0-9][a-z0-9._-]{4,}$/i.test(identity);
});

const hasSearchQuery = (url) => [...url.searchParams.keys()]
  .some((key) => SEARCH_QUERY_KEYS.has(String(key || '').toLowerCase()));

const hasStrongRoleIdentity = (url, path) => {
  const segments = String(path || '').split('/').filter(Boolean);
  const hasStrongPathSegment = segments.some((segment) => (
    /^[a-f0-9]{8}-[a-f0-9-]{20,}$/i.test(segment)
    || /^\d{5,}(?:-\d+)?$/i.test(segment)
    || /^(?=[a-z0-9_-]{6,}$)(?=.*[a-z])(?=.*\d)[a-z0-9_-]+$/i.test(segment)
  ));
  if (hasStrongPathSegment || hasRoleQueryIdentity(url)) return true;

  return [...url.searchParams.entries()].some(([key, value]) => (
    /^(?:id|jobid|job_id|postingid|posting_id|requisitionid|requisition_id|reqid|req_id|vacancyid|vacancy_id)$/i.test(key)
    && /^[a-z0-9+/_=-]{8,}$/i.test(String(value || '').trim())
  ));
};

const hasRoleDetailPath = (path) => /\/(?:jobs?|job-details?|job-detail|positions?|vacanc(?:y|ies)|openings?|opportunities|roles?|requisitions?|recruitment_post|details)(?:\/|$)/i.test(path);

const hasGenericListingPath = (path) => /\/(?:search|results?|listings?|categories|departments|all-jobs|job-search|search-jobs)(?:\/|$)/i.test(path);

const isRecognizedRoleDetailUrl = (value = '') => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return false;
  const url = new URL(normalized);
  const host = getComparableHost(url.hostname);
  const path = getDecodedPath(url).replace(/\/+$/, '') || '/';

  if (hostMatches(host, 'indeed.com')) {
    return /^\/viewjob$/i.test(path) && /^[a-z0-9]{8,}$/i.test(url.searchParams.get('jk') || '');
  }
  if (hostMatches(host, 'linkedin.com')) {
    return /^\/jobs\/view\/(?:[^/]*-)?\d{6,}$/i.test(path);
  }
  if (hostMatches(host, 'gradcracker.com')) {
    return /^\/hub\/\d+\/[^/]+\/(?:graduate-job|work-placement|internship|placement|degree-apprenticeship|school-leaver-job)\/\d+\/[^/]+$/i.test(path);
  }
  if (hostMatches(host, 'harri.com')) {
    return /^\/[^/]+\/job\/\d{5,}(?:-[^/]+)?$/i.test(path);
  }
  if (hostMatches(host, 'forcesfamiliesjobs.co.uk')) {
    return /^\/jobs\/[^/]+\/\d{5,}(?:-\d+)?$/i.test(path)
      || (/^\/jobs\/apply$/i.test(path) && /^[a-z0-9-]{5,}$/i.test(url.searchParams.get('id') || ''));
  }
  if (hostMatches(host, 'salutemyjob.com')) {
    return /^\/jobs\/[^/]+\/\d{5,}(?:-\d+)?$/i.test(path);
  }
  if (hostMatches(host, 'yorkshire.com')) {
    return /\/jobs\/(?:[^/]+\/)*[^/]*\d{5,}$/i.test(path);
  }
  if (hostMatches(host, 'tal.net')) {
    return /\/opp\/\d{3,}-[^/]+(?:\/[^/]+)?$/i.test(path);
  }
  if (hostMatches(host, 'ratemyplacement.co.uk')) {
    return /^\/jobs\/\d+(?:\/[^/]+){1,3}$/i.test(path);
  }
  if (hostMatches(host, 'higherin.com')) {
    return /^\/jobs\/\d+(?:\/[^/]+){1,3}$/i.test(path);
  }
  if (hostMatches(host, 'amazon.jobs')) {
    return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?jobs\/\d{5,}\/[^/]+$/i.test(path);
  }
  if (hostMatches(host, 'careers.google.com')) {
    return /^\/jobs\/results\/\d{5,}(?:-[^/]+)?$/i.test(path);
  }
  if (host === 'jobs.lever.co') {
    return /^\/[^/]+\/(?:[a-f0-9-]{16,}|[^/]{8,})$/i.test(path);
  }
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(host)) {
    return /^\/[^/]+\/jobs\/\d+$/i.test(path) || hasRoleQueryIdentity(url);
  }
  if (host === 'jobs.smartrecruiters.com') {
    return /^\/[^/]+\/(?:\d+-)?[^/]+$/i.test(path);
  }
  if (host === 'apply.workable.com') {
    return /^\/[^/]+\/j\/[a-z0-9]+\/?$/i.test(`${path}/`);
  }
  if (/(?:^|\.)myworkdayjobs\.com$/i.test(host)) {
    return /\/(?:job|details)\//i.test(path) && hasStrongRoleIdentity(url, path);
  }
  if (/(?:^|\.)myworkdaysite\.com$/i.test(host)) {
    return /\/(?:job|details)\//i.test(path) && hasStrongRoleIdentity(url, path);
  }
  if (hostMatches(host, 'ashbyhq.com')) {
    return /^\/[^/]+\/[a-f0-9-]{16,}(?:\/application)?$/i.test(path);
  }
  if (hostMatches(host, 'teamtailor.com')) {
    return /\/jobs\/\d+-[^/]+$/i.test(path);
  }
  if (hostMatches(host, 'recruitee.com')) {
    return /\/o\/[^/]+$/i.test(path);
  }
  if (hostMatches(host, 'icims.com')) {
    return /\/jobs\/\d+\/(?:[^/]+\/)?job\/?$/i.test(`${path}/`);
  }
  if (/(?:^|\.)successfactors\.(?:com|eu)$/i.test(host)) {
    return /\/job\/[^/]+\/\d+\/?$/i.test(`${path}/`)
      || (/^\/career$/i.test(path) && hasRoleQueryIdentity(url));
  }

  if (/\/recruitment_post$/i.test(path)
    && url.searchParams.has('id')
    && url.searchParams.has('org_id')) return true;

  if (hasRoleQueryIdentity(url)) return true;
  return hasRoleDetailPath(path)
    && hasStrongRoleIdentity(url, path)
    && !hasGenericListingPath(path);
};

const isRoleSpecificApplicationUrl = (value = '') => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return false;
  if (isRecognizedRoleDetailUrl(normalized)) return true;
  const url = new URL(normalized);
  const path = getDecodedPath(url).replace(/\/+$/, '') || '/';
  if (hasRoleQueryIdentity(url)) return true;
  return /\/(?:apply|application|candidate)\//i.test(`${path}/`)
    && (/[a-f0-9-]{12,}/i.test(path) || /\d{4,}/.test(path) || path.split('/').filter(Boolean).length >= 3);
};

const isPrivateIp = (address = '') => {
  const normalized = String(address || '').toLowerCase().split('%')[0];
  const version = net.isIP(normalized);
  if (version === 4) {
    const parts = normalized.split('.').map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || parts[0] === 0
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
      || parts[0] >= 224;
  }
  if (version === 6) {
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe8')
      || normalized.startsWith('fe9')
      || normalized.startsWith('fea')
      || normalized.startsWith('feb')
      || normalized.startsWith('::ffff:127.')
      || normalized.startsWith('::ffff:10.')
      || normalized.startsWith('::ffff:192.168.');
  }
  return true;
};

const assertPublicUrl = async (value) => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) throw new Error('Invalid HTTP URL');
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname === 'metadata.google.internal') {
    throw new Error('Private URLs are not allowed');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Private URLs are not allowed');
    return normalized;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('URL does not resolve to a public address');
  }
  return normalized;
};

const findClientRedirect = (html, currentUrl) => {
  const source = String(html || '');
  if (!source) return '';
  const $ = cheerio.load(source);
  const refresh = $('meta[http-equiv]').toArray().find((element) => (
    String($(element).attr('http-equiv') || '').toLowerCase() === 'refresh'
  ));
  const refreshContent = refresh ? String($(refresh).attr('content') || '') : '';
  const refreshTarget = refreshContent.match(/(?:^|;)\s*url\s*=\s*["']?([^"']+)/i)?.[1];
  if (refreshTarget) return normalizeHttpUrl(refreshTarget.trim(), currentUrl);

  if (source.length > 20000) return '';
  const scriptTarget = source.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i)?.[1]
    || source.match(/(?:window\.)?location\.(?:assign|replace)\(\s*["']([^"']+)["']/i)?.[1];
  return scriptTarget ? normalizeHttpUrl(scriptTarget, currentUrl) : '';
};

const fetchPublicPage = async (initialUrl) => {
  let currentUrl = normalizeHttpUrl(initialUrl);
  const visited = new Set();
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    currentUrl = await assertPublicUrl(currentUrl);
    if (visited.has(currentUrl)) throw new Error('Job URL entered a redirect loop');
    visited.add(currentUrl);
    const response = await axios.get(currentUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: MAX_PAGE_BYTES,
      maxBodyLength: MAX_PAGE_BYTES,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-GB,en;q=0.8',
        'User-Agent': USER_AGENT
      }
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const nextUrl = normalizeHttpUrl(response.headers.location, currentUrl);
      if (!nextUrl) throw new Error('Invalid redirect destination');
      currentUrl = nextUrl;
      continue;
    }

    if (response.status < 200 || response.status >= 400) {
      throw new Error(`Job page returned HTTP ${response.status}`);
    }

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
      throw new Error('Job URL did not return a web page');
    }

    const html = typeof response.data === 'string' ? response.data : String(response.data || '');
    const clientRedirect = findClientRedirect(html, currentUrl);
    if (clientRedirect && clientRedirect !== currentUrl) {
      currentUrl = clientRedirect;
      continue;
    }

    return {
      url: currentUrl,
      html,
      status: response.status
    };
  }
  throw new Error('Job URL redirected too many times');
};

const isLikelyGenericJobLandingUrl = (value = '') => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return true;
  const url = new URL(normalized);
  if (isRecognizedRoleDetailUrl(normalized) || isRoleSpecificApplicationUrl(normalized)) return false;

  const path = getDecodedPath(url);
  const segments = path.replace(/\/+$/, '').toLowerCase().split('/').filter(Boolean);
  const withoutLocale = segments.filter((segment, index) => !(
    index === 0 && /^[a-z]{2}(?:-[a-z]{2})?$/.test(segment)
  ));
  const genericPath = withoutLocale.join('/');
  if (!genericPath) return true;
  if (/^(?:careers?|jobs?|vacancies|opportunities|open-roles?|positions|join-us|work-with-us|job-search|search)(?:\/(?:search|all|openings|jobs|roles|positions|results|listings))?$/.test(genericPath)) return true;
  if (/(?:^|\/)(?:job-search|jobs-search|search-jobs|search|all-jobs|job-listings|open-positions|open-roles|search-results|job-results)$/.test(genericPath)) return true;
  if (hasSearchQuery(url) && /(?:^|\/)(?:careers?|jobs?|vacancies|opportunities|positions|search)(?:\/|$)/.test(genericPath)) return true;

  const host = getComparableHost(url.hostname);
  if (KNOWN_AGGREGATOR_HOSTS.some((domain) => hostMatches(host, domain))) return true;
  if (host === 'jobs.lever.co' && withoutLocale.length < 2) return true;
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(host) && withoutLocale.length < 3) return true;
  if (host === 'jobs.smartrecruiters.com' && withoutLocale.length < 2) return true;
  if (host === 'apply.workable.com' && !withoutLocale.includes('j')) return true;
  return false;
};

const normalizeText = (value = '') => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const plainText = (value = '') => {
  if (!value) return '';
  return normalizeText(cheerio.load(`<main>${String(value)}</main>`)('main').text());
};

const listText = (value, separator = '\n') => (Array.isArray(value)
  ? value.map((item) => normalizeText(item)).filter(Boolean).join(separator)
  : normalizeText(value));

const comparableText = (value = '') => normalizeText(value)
  .toLowerCase()
  .replace(/&amp;/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const meaningfulTokens = (value = '') => comparableText(value)
  .split(' ')
  .filter((token) => token.length >= 3 && !['and', 'the', 'with', 'for', 'from', 'role', 'job'].includes(token));

const textMatches = (pageValue, expectedValue, threshold = 0.66) => {
  const page = comparableText(pageValue);
  const expected = comparableText(expectedValue);
  if (!page || !expected) return false;
  if (page.includes(expected) || expected.includes(page)) return true;
  const tokens = meaningfulTokens(expectedValue);
  if (!tokens.length) return false;
  const matched = tokens.filter((token) => page.includes(token)).length;
  return matched / tokens.length >= threshold;
};

const collectJobPostings = ($) => {
  const postings = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.some((type) => String(type || '').toLowerCase() === 'jobposting')) postings.push(value);
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(visit);
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();
    if (!raw) return;
    try {
      visit(JSON.parse(raw.trim()));
    } catch (error) {
      // Invalid third-party JSON-LD is ignored; the visible page is still checked.
    }
  });
  return postings;
};

const getCompanyName = (posting = {}) => {
  const record = posting || {};
  return normalizeText(
    typeof record.hiringOrganization === 'string'
      ? record.hiringOrganization
      : record.hiringOrganization?.name
  );
};

const getLocation = (posting = {}) => {
  const record = posting || {};
  if (record.jobLocationType === 'TELECOMMUTE') return 'Remote';
  const locations = Array.isArray(record.jobLocation) ? record.jobLocation : [record.jobLocation];
  return normalizeText(locations.map((location) => {
    const address = location?.address || location;
    if (typeof address === 'string') return address;
    return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
      .map((part) => normalizeText(typeof part === 'object' ? part?.name : part))
      .filter(Boolean)
      .join(', ');
  }).filter(Boolean).join(' / '));
};

const mapEmploymentType = (value, fallback = 'Full-time') => {
  const text = (Array.isArray(value) ? value.join(' ') : String(value || '')).toLowerCase();
  if (/intern|placement|graduate programme/.test(text)) return 'Internship';
  if (/part/.test(text)) return 'Part-time';
  if (/contract|temporary|freelance/.test(text)) return 'Contract';
  if (/remote|telecommute/.test(text)) return 'Remote';
  return ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'].includes(fallback) ? fallback : 'Full-time';
};

const inferJobSector = (value = '') => {
  const text = comparableText(value);
  if (/software|developer|engineer|data|machine learning|artificial intelligence|security|cloud|technical|technology|it support|product/.test(text)) return 'Technology';
  if (/health|clinical|medical|nurse|pharma|patient|therapy|care/.test(text)) return 'Health and Medical';
  if (/finance|financial|account|audit|tax|treasury|econom|investment|bank/.test(text)) return 'Finance and Economics';
  if (/sales|account executive|business development|revenue|partnership/.test(text)) return 'Sales and Business';
  if (/marketing|brand|content|communications|growth|social media/.test(text)) return 'Marketing and Communications';
  if (/design|creative|researcher|user experience|ux|ui/.test(text)) return 'Design and Research';
  if (/legal|counsel|compliance|policy|privacy/.test(text)) return 'Legal and Compliance';
  if (/people|human resources|recruit|talent acquisition|workplace/.test(text)) return 'People and Recruitment';
  if (/support|customer success|customer experience|service/.test(text)) return 'Customer Support';
  if (/operations|supply chain|logistics|procurement|warehouse/.test(text)) return 'Operations and Supply Chain';
  return 'General';
};

const parsePublishedDate = (value = '') => {
  const raw = normalizeText(value).replace(/\b(?:at|by|on)\b\s*/i, '');
  if (!raw) return '';
  let match = raw.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  match = raw.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  match = raw.match(/\b(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}\b/i)
    || raw.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d{2}\b/i);
  const parsed = new Date(match?.[0]?.replace(/(\d)(?:st|nd|rd|th)\b/i, '$1') || raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const extractDeadline = (posting, pageText) => {
  const structured = parsePublishedDate(posting?.validThrough || posting?.applicationDeadline || '');
  if (structured) return structured;
  const patterns = [
    /(?:closing date|application deadline|applications close|apply by|closing on)\s*[:\-]?\s*([^\n.|]{4,48})/i,
    /(?:deadline)\s*[:\-]?\s*([^\n.|]{4,48})/i
  ];
  for (const pattern of patterns) {
    const match = String(pageText || '').match(pattern);
    const parsed = parsePublishedDate(match?.[1]);
    if (parsed) return parsed;
  }
  return '';
};

const hasClosedJobLanguage = (text = '') => /\b(?:job|role|position|vacancy|applications?)\s+(?:is\s+)?(?:no longer available|closed|expired|filled)|\bapplications? (?:are )?closed\b|\bposting has expired\b|\bvacancy has closed\b/i.test(text);

const canonicalizeKnownRoleUrl = (value = '') => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return '';
  const url = new URL(normalized);
  const host = getComparableHost(url.hostname);
  if (hostMatches(host, 'indeed.com') && url.searchParams.get('jk')) {
    return `${url.origin}/viewjob?jk=${encodeURIComponent(url.searchParams.get('jk'))}`;
  }
  if (hostMatches(host, 'linkedin.com')) {
    const match = getDecodedPath(url).match(/^\/jobs\/view\/(?:[^/]*-)?(\d{6,})/i);
    if (match) return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  }
  return normalized;
};

const getCanonicalRolePageUrl = ($, fetchedUrl) => {
  const candidates = [
    $('link[rel="canonical"]').first().attr('href'),
    $('meta[property="og:url"]').first().attr('content'),
    fetchedUrl
  ].map((value) => normalizeHttpUrl(value, fetchedUrl)).filter(Boolean);
  const exact = candidates.find((candidate) => isRecognizedRoleDetailUrl(candidate));
  const canonical = canonicalizeKnownRoleUrl(exact || candidates.find((candidate) => !isLikelyGenericJobLandingUrl(candidate)) || fetchedUrl);
  try {
    const requested = new URL(fetchedUrl);
    const resolved = new URL(canonical);
    if (requested.protocol === 'https:'
      && resolved.protocol === 'http:'
      && getComparableHost(requested.hostname) === getComparableHost(resolved.hostname)) {
      resolved.protocol = 'https:';
      return resolved.toString();
    }
  } catch (error) {
    return canonical;
  }
  return canonical;
};

const decodeEmbeddedUrl = (value = '') => {
  const decodedEntities = cheerio.load(`<textarea>${String(value || '')}</textarea>`)('textarea').text();
  return decodedEntities
    .replace(/\\u002f/gi, '/')
    .replace(/\\u003a/gi, ':')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .trim();
};

const findApplyDestination = ($, rolePageUrl, claimedApplyUrl = '', rawHtml = '') => {
  const candidates = [];
  const add = (href, label, origin) => {
    const url = normalizeHttpUrl(decodeEmbeddedUrl(href), rolePageUrl);
    if (!url || isLikelyGenericJobLandingUrl(url)) return;
    const text = comparableText(label);
    let score = origin === 'form' ? 45 : 0;
    if (/\bapply now\b|\bstart application\b|\bsubmit application\b/.test(text)) score += 100;
    else if (/\bapply\b|\bapplication\b/.test(text)) score += 70;
    if (/apply|application|candidate/.test(new URL(url).pathname.toLowerCase())) score += 20;
    if (isRoleSpecificApplicationUrl(url)) score += 35;
    if (normalizeHttpUrl(claimedApplyUrl) === url) score += 15;
    if (score >= 70) candidates.push({ url, score });
  };

  $('a[href]').each((_, element) => {
    const label = [$(element).text(), $(element).attr('aria-label'), $(element).attr('title')].filter(Boolean).join(' ');
    add($(element).attr('href'), label, 'anchor');
  });
  $('form[action]').each((_, element) => {
    const label = [$(element).text(), $(element).attr('aria-label'), $(element).attr('class')].filter(Boolean).join(' ');
    add($(element).attr('action'), label, 'form');
  });
  $('[data-apply-url], [data-application-url], [data-href], [data-url], [data-redirect-url], [formaction]').each((_, element) => {
    const label = [$(element).text(), $(element).attr('aria-label'), $(element).attr('title')].filter(Boolean).join(' ');
    const href = $(element).attr('data-apply-url')
      || $(element).attr('data-application-url')
      || $(element).attr('data-href')
      || $(element).attr('data-url')
      || $(element).attr('data-redirect-url')
      || $(element).attr('formaction');
    add(href, label, 'data');
  });

  const embeddedPatterns = [
    /["'](?:applyUrl|apply_url|applicationUrl|application_url|externalApplyUrl|external_apply_url|companyApplyUrl|jobApplyUrl)["']\s*:\s*["']([^"']+)["']/gi,
    /(?:applyUrl|applicationUrl|externalApplyUrl)\s*=\s*["']([^"']+)["']/gi
  ];
  embeddedPatterns.forEach((pattern) => {
    let match = pattern.exec(String(rawHtml || ''));
    while (match) {
      add(match[1], 'Apply now', 'embedded');
      match = pattern.exec(String(rawHtml || ''));
    }
  });

  if (isRoleSpecificApplicationUrl(claimedApplyUrl)) {
    add(claimedApplyUrl, 'Apply now', 'claimed');
  }

  candidates.sort((left, right) => right.score - left.score);
  if (candidates.length) return candidates[0].url;

  const embeddedApply = $('button, input[type="submit"]').toArray().some((element) => {
    const label = normalizeText($(element).text() || $(element).attr('value') || $(element).attr('aria-label'));
    return /\b(?:apply|submit application|start application)\b/i.test(label);
  });
  return embeddedApply ? rolePageUrl : '';
};

const verifyLiveJobDraft = async (draft = {}) => {
  const requestedRoleUrl = normalizeHttpUrl(draft.source || draft.applicationLink);
  if (!requestedRoleUrl || isLikelyGenericJobLandingUrl(requestedRoleUrl)) {
    throw new Error('The source is a careers/search page, not an exact role page');
  }

  const rolePage = await fetchPublicPage(requestedRoleUrl);
  const roleDocument = cheerio.load(rolePage.html);
  const canonicalRoleUrl = getCanonicalRolePageUrl(roleDocument, rolePage.url);
  if (isLikelyGenericJobLandingUrl(canonicalRoleUrl)) throw new Error('The role URL redirects to a generic job page');
  const $ = cheerio.load(rolePage.html);
  $('script, style, noscript, svg').remove();
  const pageTitle = normalizeText($('meta[property="og:title"]').attr('content') || $('title').first().text());
  const heading = normalizeText($('h1').first().text());
  const pageText = normalizeText($('body').text()).slice(0, 250000);
  if (!pageText || hasClosedJobLanguage(`${pageTitle} ${heading} ${pageText.slice(0, 12000)}`)) {
    throw new Error('The exact role page is closed, removed, or empty');
  }

  const postings = collectJobPostings(roleDocument);
  if (postings.length > 1) {
    throw new Error('The source contains multiple jobs and is a listings/search page');
  }
  const posting = postings.find((item) => {
    const structuredCompany = getCompanyName(item);
    return textMatches(item?.title || item?.name, draft.title, 0.6)
      && (
        textMatches(structuredCompany, draft.companyName, 0.6)
        || textMatches(pageText, draft.companyName, 0.6)
      );
  }) || null;
  const visibleIdentity = `${pageTitle} ${heading} ${pageText.slice(0, 18000)}`;
  if (postings.length && !posting) throw new Error('The structured job data does not match the requested title and company');
  if (!posting && !isRecognizedRoleDetailUrl(canonicalRoleUrl)) {
    throw new Error('The source URL is not an identifiable single-role detail page');
  }
  if (!posting && (!textMatches(visibleIdentity, draft.title, 0.7) || !textMatches(visibleIdentity, draft.companyName, 0.7))) {
    throw new Error('The role page does not match the requested title and company');
  }

  const applicationDeadline = extractDeadline(posting, pageText);
  const today = new Date().toISOString().slice(0, 10);
  if (applicationDeadline && applicationDeadline < today) throw new Error('The published application deadline has passed');

  const applyCandidate = findApplyDestination($, canonicalRoleUrl, draft.applicationLink, rolePage.html);
  if (!applyCandidate) throw new Error('The exact role page has no usable Apply action');
  const applyPage = applyCandidate === rolePage.url || applyCandidate === canonicalRoleUrl
    ? { ...rolePage, url: canonicalRoleUrl }
    : await fetchPublicPage(applyCandidate);
  if (isLikelyGenericJobLandingUrl(applyPage.url)) throw new Error('The Apply action redirects to a generic careers/search page');
  const applyDocument = cheerio.load(applyPage.html);
  const applyPostings = collectJobPostings(applyDocument);
  const applyVisibleText = plainText(applyPage.html);
  if (applyPostings.length > 1) throw new Error('The Apply action redirects to a jobs list instead of this role');
  if (applyPostings.length && !applyPostings.some((item) => {
    const structuredCompany = getCompanyName(item);
    return textMatches(item?.title || item?.name, draft.title, 0.6)
      && (
        textMatches(structuredCompany, draft.companyName, 0.6)
        || textMatches(applyVisibleText, draft.companyName, 0.6)
      );
  })) {
    throw new Error('The Apply action opens a different role');
  }
  const applyText = applyVisibleText.slice(0, 30000);
  if (hasClosedJobLanguage(applyText)) throw new Error('The application destination says the role is closed');
  const applyIdentityMatches = textMatches(applyText, draft.title, 0.65)
    && textMatches(applyText, draft.companyName, 0.6);
  if (applyPage.url !== canonicalRoleUrl
    && !applyIdentityMatches
    && !isRoleSpecificApplicationUrl(applyPage.url)) {
    throw new Error('The Apply action is not tied to this exact role');
  }

  const authoritativeTitle = normalizeText(posting?.title || posting?.name) || normalizeText(draft.title);
  const structuredCompany = getCompanyName(posting);
  const authoritativeCompany = structuredCompany && textMatches(structuredCompany, draft.companyName, 0.6)
    ? structuredCompany
    : (normalizeText(draft.companyName) || structuredCompany);
  const description = plainText(posting?.description || '') || normalizeText(draft.description);
  const requirements = plainText(posting?.qualifications || posting?.experienceRequirements || '');
  const responsibilities = plainText(posting?.responsibilities || '');
  const skills = plainText(posting?.skills || '');

  return {
    ...draft,
    title: authoritativeTitle,
    companyName: authoritativeCompany,
    location: getLocation(posting) || normalizeText(draft.location),
    jobType: mapEmploymentType(posting?.employmentType, draft.jobType),
    description: description.slice(0, 12000),
    requirements: requirements || draft.requirements,
    responsibilities: responsibilities || draft.responsibilities,
    skills: skills ? skills.split(/[,;|]/).map(normalizeText).filter(Boolean).slice(0, 30) : draft.skills,
    source: canonicalRoleUrl,
    applicationLink: canonicalizeKnownRoleUrl(applyPage.url),
    applicationDeadline,
    verificationNote: applicationDeadline
      ? 'The server opened the exact role page and its Apply destination and confirmed its published deadline.'
      : 'The server opened the exact role page and its Apply destination; the active listing does not publish a closing date.'
  };
};

const verifyLiveJobDrafts = async (drafts = [], { concurrency = 4 } = {}) => {
  const rows = Array.isArray(drafts) ? drafts : [];
  const accepted = [];
  const rejected = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), rows.length || 1) }, async () => {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      try {
        accepted.push({ index, draft: await verifyLiveJobDraft(rows[index]) });
      } catch (error) {
        rejected.push({ index, draft: rows[index], reason: error.message || 'Verification failed' });
      }
    }
  });
  await Promise.all(workers);
  accepted.sort((left, right) => left.index - right.index);
  rejected.sort((left, right) => left.index - right.index);
  return { accepted: accepted.map((item) => item.draft), rejected };
};

const fetchJSearchCandidates = async ({ query, location = '', count = 10 } = {}) => {
  const apiKey = String(process.env.RAPIDAPI_KEY || '').trim();
  if (!apiKey) return [];
  const desired = Math.min(100, Math.max(1, Number(count) || 10));
  const searchQuery = normalizeText([query, location].filter(Boolean).join(' in ')).slice(0, 220) || 'jobs in United Kingdom';
  const candidates = [];

  for (let page = 1; candidates.length < desired && page <= Math.ceil(desired / 10); page += 1) {
    const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
      timeout: REQUEST_TIMEOUT_MS,
      params: { query: searchQuery, page: String(page), num_pages: '1' },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    rows.forEach((job) => {
      const applyOptions = [
        ...(Array.isArray(job.apply_options) ? job.apply_options : []),
        ...(Array.isArray(job.job_apply_options) ? job.job_apply_options : [])
      ].sort((left, right) => Number(Boolean(right?.is_direct)) - Number(Boolean(left?.is_direct)));
      const linkCandidates = [
        ...applyOptions.map((option) => option?.apply_link || option?.link),
        job.job_apply_link
      ].map((value) => normalizeHttpUrl(value)).filter(Boolean);
      const source = linkCandidates.find((value) => (
        !isLikelyGenericJobLandingUrl(value)
        && (isRecognizedRoleDetailUrl(value) || isRoleSpecificApplicationUrl(value))
      )) || '';
      if (!source || isLikelyGenericJobLandingUrl(source)) return;
      const expiration = job.job_offer_expiration_datetime_utc
        || (job.job_offer_expiration_timestamp ? new Date(Number(job.job_offer_expiration_timestamp) * 1000).toISOString() : '');
      candidates.push({
        title: normalizeText(job.job_title),
        company: normalizeText(job.employer_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        companyName: normalizeText(job.employer_name),
        location: normalizeText(job.job_location || [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')),
        sector: normalizeText(job.job_occupation || job.job_category || 'General'),
        salary: '',
        applicationLink: source,
        applicationDeadline: parsePublishedDate(expiration),
        source,
        jobType: job.job_is_remote ? 'Remote' : mapEmploymentType(job.job_employment_type),
        description: normalizeText(job.job_description),
        requirements: listText(job.job_highlights?.Qualifications),
        responsibilities: listText(job.job_highlights?.Responsibilities),
        skills: listText(job.job_required_skills, ', ')
      });
    });
    if (!rows.length) break;
  }
  return candidates.slice(0, desired);
};

const getGreenhouseJobBoards = () => {
  const configured = String(process.env.GREENHOUSE_JOB_BOARD_TOKENS || '').trim();
  if (!configured) return DEFAULT_GREENHOUSE_JOB_BOARDS;
  const custom = configured.split(',').map((entry) => {
    const [tokenValue, nameValue] = entry.split('|');
    const token = String(tokenValue || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
    if (!token) return null;
    return {
      token,
      name: normalizeText(nameValue) || token.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    };
  }).filter(Boolean);
  return custom.length ? custom : DEFAULT_GREENHOUSE_JOB_BOARDS;
};

const JOB_SEARCH_STOP_WORDS = new Set([
  'actual', 'active', 'all', 'another', 'apply', 'application', 'create', 'draft', 'drafts',
  'exact', 'find', 'generate', 'job', 'jobs', 'latest', 'link', 'links', 'live', 'make',
  'new', 'post', 'posts', 'real', 'role', 'roles', 'sector', 'sectors', 'the', 'type',
  'types', 'valid', 'with'
]);

const getJobSearchKeywords = (query = '') => comparableText(query)
  .split(' ')
  .filter((token) => token.length >= 3 && !JOB_SEARCH_STOP_WORDS.has(token));

const matchesRequestedLocation = (jobLocation, requestedLocation) => {
  const requested = comparableText(requestedLocation);
  if (!requested || requested === 'all' || requested === 'any' || requested === 'worldwide') return true;
  const actual = comparableText(jobLocation);
  if (/\bremote\b/.test(requested)) return /\bremote\b|worldwide|anywhere/.test(actual);
  const tokens = requested.split(' ').filter((token) => token.length >= 2 && !['and', 'the'].includes(token));
  return tokens.some((token) => actual.includes(token));
};

const mapGreenhouseJob = (job = {}, board = {}) => {
  const title = normalizeText(job.title);
  const companyName = normalizeText(job.company_name || board.name || board.token);
  const location = normalizeText(job.location?.name || 'Location not specified');
  const templatedSource = board.roleUrlTemplate && job.id
    ? String(board.roleUrlTemplate).replace('{id}', encodeURIComponent(String(job.id)))
    : '';
  const source = normalizeHttpUrl(templatedSource || job.absolute_url);
  const sector = inferJobSector([title, ...(Array.isArray(job.departments) ? job.departments.map((item) => item?.name) : [])].join(' '));
  const applicationDeadline = parsePublishedDate(job.application_deadline || '');
  return {
    company: `greenhouse-${board.token}`,
    companyName,
    title,
    location,
    sector,
    salary: '',
    applicationLink: source,
    applicationDeadline,
    source,
    jobType: mapEmploymentType(title),
    skills: '',
    description: `${title} at ${companyName}. This published role will be enriched from its exact source page during verification.`,
    requirements: '',
    responsibilities: '',
    sourceProvider: 'greenhouse',
    sourceUpdatedAt: job.updated_at || ''
  };
};

const fetchGreenhouseCandidates = async ({
  query = '',
  location = '',
  count = 50,
  excludedUrls = [],
  boards = getGreenhouseJobBoards(),
  httpClient = axios
} = {}) => {
  const desired = Math.min(1000, Math.max(1, Number(count) || 50));
  const keywords = getJobSearchKeywords(query);
  const excluded = new Set((Array.isArray(excludedUrls) ? excludedUrls : []).map(normalizeHttpUrl).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  const boardRows = new Array(boards.length).fill(null).map(() => []);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(4, boards.length || 1) }, async () => {
    while (cursor < boards.length) {
      const index = cursor;
      cursor += 1;
      const board = boards[index];
      try {
        const response = await httpClient.get(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs`,
          {
            timeout: REQUEST_TIMEOUT_MS,
            headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
          }
        );
        const rows = Array.isArray(response.data?.jobs) ? response.data.jobs : [];
        boardRows[index] = rows
          .map((job) => mapGreenhouseJob(job, board))
          .filter((job) => {
            if (!job.title || !job.companyName || !job.source || excluded.has(job.source)) return false;
            if (job.applicationDeadline && job.applicationDeadline < today) return false;
            if (isLikelyGenericJobLandingUrl(job.source)) return false;
            if (!matchesRequestedLocation(job.location, location)) return false;
            if (!keywords.length) return true;
            const haystack = comparableText(`${job.title} ${job.sector} ${job.companyName}`);
            return keywords.some((keyword) => haystack.includes(keyword));
          })
          .sort((left, right) => String(right.sourceUpdatedAt).localeCompare(String(left.sourceUpdatedAt)));
      } catch (error) {
        boardRows[index] = [];
      }
    }
  });
  await Promise.all(workers);

  const candidates = [];
  const seen = new Set(excluded);
  let rowIndex = 0;
  while (candidates.length < desired) {
    let added = false;
    boardRows.forEach((rows) => {
      const job = rows[rowIndex];
      if (!job || candidates.length >= desired || seen.has(job.source)) return;
      seen.add(job.source);
      candidates.push(job);
      added = true;
    });
    if (!added) break;
    rowIndex += 1;
  }
  return candidates;
};

module.exports = {
  assertPublicUrl,
  fetchGreenhouseCandidates,
  fetchJSearchCandidates,
  findApplyDestination,
  getCanonicalRolePageUrl,
  isLikelyGenericJobLandingUrl,
  isRecognizedRoleDetailUrl,
  isRoleSpecificApplicationUrl,
  inferJobSector,
  normalizeHttpUrl,
  verifyLiveJobDraft,
  verifyLiveJobDrafts
};
