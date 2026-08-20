const axios = require('axios');
const cheerio = require('cheerio');

const { assertPublicUrl, normalizeHttpUrl } = require('./liveJobVerifier');

const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Math.max(4000, Number(process.env.POST_MEDIA_TIMEOUT_MS) || 10000);
const USER_AGENT = 'JumpTake-PostMediaResolver/1.0 (+https://jumptake.com)';

const mediaTypeFromContentType = (contentType = '', value = '') => {
  const normalizedType = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (normalizedType.startsWith('image/')) return 'image';
  if (normalizedType.startsWith('video/')) return 'video';
  if (normalizedType && normalizedType !== 'application/octet-stream') return '';

  const pathname = (() => {
    try {
      return new URL(value).pathname.toLowerCase();
    } catch (error) {
      return '';
    }
  })();
  if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(pathname)) return 'image';
  if (/\.(?:m4v|mov|mp4|ogv|webm)$/.test(pathname)) return 'video';
  return '';
};

const isHtmlContentType = (contentType = '') => {
  const value = String(contentType || '').toLowerCase();
  return !value || value.includes('text/html') || value.includes('application/xhtml+xml');
};

const destroyResponseStream = (response) => {
  if (response?.data && typeof response.data.destroy === 'function') {
    response.data.destroy();
  }
};

const requestPublicResource = async (initialUrl, { responseType = 'stream' } = {}) => {
  let currentUrl = normalizeHttpUrl(initialUrl);
  const visited = new Set();

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    currentUrl = await assertPublicUrl(currentUrl);
    if (visited.has(currentUrl)) throw new Error('Media URL entered a redirect loop');
    visited.add(currentUrl);

    const response = await axios.get(currentUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: responseType === 'text' ? MAX_HTML_BYTES : Infinity,
      maxBodyLength: responseType === 'text' ? MAX_HTML_BYTES : Infinity,
      responseType,
      validateStatus: () => true,
      headers: {
        Accept: responseType === 'text'
          ? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
          : 'image/avif,image/webp,image/png,image/jpeg,video/*;q=0.9,text/html;q=0.5,*/*;q=0.2',
        'Accept-Language': 'en-GB,en;q=0.8',
        'User-Agent': USER_AGENT
      }
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const nextUrl = normalizeHttpUrl(response.headers.location, currentUrl);
      destroyResponseStream(response);
      if (!nextUrl) throw new Error('Media URL returned an invalid redirect');
      currentUrl = nextUrl;
      continue;
    }

    if (response.status < 200 || response.status >= 400) {
      destroyResponseStream(response);
      throw new Error(`Media URL returned HTTP ${response.status}`);
    }

    return { response, url: currentUrl };
  }

  throw new Error('Media URL redirected too many times');
};

const probeDirectMedia = async (value) => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;

  try {
    const { response, url } = await requestPublicResource(normalized);
    const contentType = String(response.headers['content-type'] || '');
    const type = mediaTypeFromContentType(contentType, url);
    const html = isHtmlContentType(contentType);
    destroyResponseStream(response);
    return type ? { mediaUrl: url, mediaType: type } : { mediaUrl: '', mediaType: '', isHtml: html };
  } catch (error) {
    return null;
  }
};

const resolveCandidateUrl = (value, pageUrl) => {
  const raw = String(value || '').trim();
  if (!raw || /^data:|^blob:|^javascript:/i.test(raw)) return '';
  return normalizeHttpUrl(raw, pageUrl);
};

const readJsonLdMedia = (value, type, results) => {
  if (Array.isArray(value)) {
    value.forEach((item) => readJsonLdMedia(item, type, results));
    return;
  }
  if (typeof value === 'string') {
    results.push({ value, type });
    return;
  }
  if (!value || typeof value !== 'object') return;
  const url = value.contentUrl || value.url || value.embedUrl || value.thumbnailUrl;
  if (typeof url === 'string') results.push({ value: url, type });
};

const normalizePublishedAt = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const extractPublishedAt = (html = '') => {
  const $ = cheerio.load(String(html || ''));
  const candidates = [];
  const add = (value) => {
    const publishedAt = normalizePublishedAt(value);
    if (publishedAt && !candidates.includes(publishedAt)) candidates.push(publishedAt);
  };

  [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="publish-date"]',
    'meta[name="publication_date"]',
    'meta[itemprop="datePublished"]'
  ].forEach((selector) => $(selector).each((_, element) => add($(element).attr('content'))));
  $('time[datetime]').each((_, element) => add($(element).attr('datetime')));

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).html() || 'null');
      const visit = (node) => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (!node || typeof node !== 'object') return;
        add(node.datePublished);
        Object.values(node).forEach(visit);
      };
      visit(parsed);
    } catch (error) {
      // A broken JSON-LD block should not hide valid article meta tags.
    }
  });

  return candidates[0] || '';
};

const readLogoValue = (value, add) => {
  if (Array.isArray(value)) {
    value.forEach((item) => readLogoValue(item, add));
    return;
  }
  if (typeof value === 'string') {
    add(value);
    return;
  }
  if (!value || typeof value !== 'object') return;
  add(value.contentUrl || value.url || value.src);
};

const extractCompanyLogoCandidates = (html, pageUrl) => {
  const $ = cheerio.load(String(html || ''));
  const results = [];
  const add = (value) => {
    const url = resolveCandidateUrl(value, pageUrl);
    if (!url || results.some((item) => item.url === url)) return;
    results.push({ url, type: 'image' });
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).html() || 'null');
      const visit = (node) => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (!node || typeof node !== 'object') return;
        if (node.logo) readLogoValue(node.logo, add);
        Object.values(node).forEach(visit);
      };
      visit(parsed);
    } catch (error) {
      // Keep looking through the page when third-party structured data is malformed.
    }
  });

  [
    'meta[property="og:logo"]',
    'meta[itemprop="logo"]'
  ].forEach((selector) => $(selector).each((_, element) => add($(element).attr('content'))));

  [
    'header img',
    'nav img',
    'img[itemprop="logo"]',
    'img[class*="logo" i]',
    'img[id*="logo" i]',
    'img[alt*="logo" i]',
    'a[class*="brand" i] img'
  ].forEach((selector) => $(selector).each((_, element) => {
    const image = $(element);
    const value = image.attr('src') || image.attr('data-src') || image.attr('data-lazy-src');
    const label = `${image.attr('alt') || ''} ${image.attr('class') || ''} ${image.attr('id') || ''}`;
    if (/\b(?:avatar|badge|flag|spinner)\b/i.test(label)) return;
    add(value);
  }));

  [
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel~="icon"]'
  ].forEach((selector) => $(selector).each((_, element) => add($(element).attr('href'))));

  // An official site's social preview is preferable to an empty letter avatar.
  if (!results.length) {
    add($('meta[property="og:image"]').first().attr('content'));
    add($('meta[name="twitter:image"]').first().attr('content'));
  }

  return results.slice(0, 16);
};

const extractMediaCandidates = (html, pageUrl) => {
  const $ = cheerio.load(String(html || ''));
  const results = [];
  const add = (value, type = '') => {
    const url = resolveCandidateUrl(value, pageUrl);
    if (!url || results.some((item) => item.url === url)) return;
    results.push({ url, type });
  };

  [
    ['meta[property="og:video:secure_url"]', 'video'],
    ['meta[property="og:video:url"]', 'video'],
    ['meta[property="og:video"]', 'video'],
    ['meta[name="twitter:player:stream"]', 'video']
  ].forEach(([selector, type]) => $(selector).each((_, element) => add($(element).attr('content'), type)));
  $('video[src], video source[src]').each((_, element) => add($(element).attr('src'), 'video'));

  [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image:src"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]'
  ].forEach((selector) => $(selector).each((_, element) => add(
    $(element).attr('content') || $(element).attr('href'),
    'image'
  )));

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).html() || 'null');
      const visit = (node) => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (!node || typeof node !== 'object') return;
        const values = [];
        readJsonLdMedia(node.video || node.contentUrl, 'video', values);
        readJsonLdMedia(node.image || node.thumbnailUrl, 'image', values);
        values.forEach((item) => add(item.value, item.type));
        Object.entries(node).forEach(([key, child]) => {
          if (!['video', 'contentUrl', 'image', 'thumbnailUrl'].includes(key)) visit(child);
        });
      };
      visit(parsed);
    } catch (error) {
      // Malformed third-party structured data should not discard valid meta tags.
    }
  });

  $('article img, main img').each((_, element) => {
    const image = $(element);
    const value = image.attr('src') || image.attr('data-src') || image.attr('data-lazy-src');
    const label = `${value || ''} ${image.attr('alt') || ''} ${image.attr('class') || ''}`;
    const width = Number(image.attr('width')) || 0;
    const height = Number(image.attr('height')) || 0;
    if (/\b(?:avatar|badge|favicon|icon|logo|pixel|spinner)\b/i.test(label)) return;
    if ((width && width < 240) || (height && height < 160)) return;
    add(value, 'image');
  });

  return results.slice(0, 12);
};

const extractSourceTitle = (html = '') => {
  const $ = cheerio.load(String(html || ''));
  return String(
    $('meta[property="og:title"]').attr('content')
    || $('meta[name="twitter:title"]').attr('content')
    || $('title').first().text()
    || ''
  ).replace(/\s+/g, ' ').trim().slice(0, 300);
};

const fetchMediaPage = async (pageUrl) => {
  const normalized = normalizeHttpUrl(pageUrl);
  if (!normalized) return null;
  try {
    const { response, url } = await requestPublicResource(normalized, { responseType: 'text' });
    const contentType = String(response.headers['content-type'] || '');
    if (!isHtmlContentType(contentType)) return null;
    return {
      sourceUrl: url,
      sourceTitle: extractSourceTitle(response.data),
      publishedAt: extractPublishedAt(response.data),
      mediaCandidates: extractMediaCandidates(response.data, url),
      logoCandidates: extractCompanyLogoCandidates(response.data, url)
    };
  } catch (error) {
    return null;
  }
};

const fetchMediaPageCandidates = async (pageUrl) => (
  (await fetchMediaPage(pageUrl))?.mediaCandidates || []
);

const firstUsableMedia = async (candidates = []) => {
  for (const candidate of candidates.slice(0, 12)) {
    const media = await probeDirectMedia(candidate.url || candidate);
    if (media?.mediaUrl) return media;
  }
  return null;
};

const buildCompanyFaviconCandidates = (websiteUrl = '') => {
  const normalized = normalizeHttpUrl(websiteUrl);
  if (!normalized) return [];
  try {
    const website = new URL(normalized);
    const hostname = website.hostname.replace(/^www\./i, '');
    return [
      { url: new URL('/favicon.ico', website.origin).toString(), type: 'image' },
      {
        url: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(website.origin)}&sz=256`,
        type: 'image'
      },
      {
        url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=256`,
        type: 'image'
      }
    ];
  } catch (error) {
    return [];
  }
};

const resolveCompanyLogo = async ({ websiteUrl = '', logoUrl = '' } = {}) => {
  const websitePage = websiteUrl ? await fetchMediaPage(websiteUrl) : null;
  const officialLogo = await firstUsableMedia(websitePage?.logoCandidates || []);
  if (officialLogo?.mediaType === 'image') {
    return {
      logoUrl: officialLogo.mediaUrl,
      websiteVerified: true,
      resolvedWebsiteUrl: websitePage.sourceUrl
    };
  }

  const suppliedLogo = await probeDirectMedia(logoUrl);
  if (suppliedLogo?.mediaType === 'image') {
    return {
      logoUrl: suppliedLogo.mediaUrl,
      websiteVerified: Boolean(websitePage),
      resolvedWebsiteUrl: websitePage?.sourceUrl || ''
    };
  }

  const verifiedFavicon = await firstUsableMedia(buildCompanyFaviconCandidates(
    websitePage?.sourceUrl || websiteUrl
  ));
  if (verifiedFavicon?.mediaType === 'image') {
    return {
      logoUrl: verifiedFavicon.mediaUrl,
      websiteVerified: Boolean(websitePage),
      resolvedWebsiteUrl: websitePage?.sourceUrl || normalizeHttpUrl(websiteUrl)
    };
  }

  return {
    logoUrl: '',
    websiteVerified: Boolean(websitePage),
    resolvedWebsiteUrl: websitePage?.sourceUrl || ''
  };
};

const resolvePostMedia = async ({ sourceUrl = '', mediaUrl = '' } = {}) => {
  let sourcePage = null;
  if (sourceUrl) {
    sourcePage = await fetchMediaPage(sourceUrl);
    const sourceMedia = await firstUsableMedia(sourcePage?.mediaCandidates || []);
    if (sourceMedia) {
      return {
        ...sourceMedia,
        sourceVerified: true,
        resolvedSourceUrl: sourcePage.sourceUrl,
        sourceTitle: sourcePage.sourceTitle,
        publishedAt: sourcePage.publishedAt
      };
    }
  }

  const sourceMetadata = {
    sourceVerified: Boolean(sourcePage),
    resolvedSourceUrl: sourcePage?.sourceUrl || '',
    sourceTitle: sourcePage?.sourceTitle || '',
    publishedAt: sourcePage?.publishedAt || ''
  };
  if (!mediaUrl) return { mediaUrl: '', mediaType: 'image', ...sourceMetadata };
  const directMedia = await probeDirectMedia(mediaUrl);
  if (directMedia?.mediaUrl) return { ...directMedia, ...sourceMetadata };

  if (directMedia?.isHtml) {
    const pageCandidates = await fetchMediaPageCandidates(mediaUrl);
    const pageMedia = await firstUsableMedia(pageCandidates);
    if (pageMedia) return { ...pageMedia, ...sourceMetadata };
  }

  return { mediaUrl: '', mediaType: 'image', ...sourceMetadata };
};

module.exports = {
  buildCompanyFaviconCandidates,
  extractCompanyLogoCandidates,
  extractMediaCandidates,
  extractPublishedAt,
  extractSourceTitle,
  mediaTypeFromContentType,
  normalizePublishedAt,
  resolveCompanyLogo,
  resolvePostMedia
};
