const GENERIC_NEWS_PATHS = new Set([
  'blog',
  'company-news',
  'insights',
  'media',
  'news',
  'newsroom',
  'press',
  'press-releases',
  'resources',
  'stories',
  'updates'
]);

const isSpecificWorkNewsSourceUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const hasArticleIdentity = [...url.searchParams.keys()].some((key) => (
      /^(?:article|id|news|post|release|story)(?:_|-)?(?:id)?$/i.test(key)
    ));
    if (hasArticleIdentity) return true;

    const segments = url.pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment).trim().toLowerCase())
      .filter(Boolean);
    if (!segments.length) return false;
    if (segments.length === 1 && GENERIC_NEWS_PATHS.has(segments[0])) return false;

    return segments.length >= 2 || segments[0].length >= 18;
  } catch (error) {
    return false;
  }
};

module.exports = { isSpecificWorkNewsSourceUrl };
