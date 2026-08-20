const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCompanyFaviconCandidates,
  extractCompanyLogoCandidates,
  extractMediaCandidates,
  extractPublishedAt,
  extractSourceTitle,
  mediaTypeFromContentType
} = require('./webMediaResolver');

test('extracts source-owned video and image preview candidates in priority order', () => {
  const candidates = extractMediaCandidates(`
    <html>
      <head>
        <meta property="og:video" content="/media/launch-preview.mp4">
        <meta property="og:image" content="https://cdn.example.com/launch-cover.jpg">
      </head>
      <body><article><img src="/media/launch-detail.webp" width="1200" height="800" alt="Launch detail"></article></body>
    </html>
  `, 'https://news.example.com/releases/new-product');

  assert.deepEqual(candidates.slice(0, 3), [
    { url: 'https://news.example.com/media/launch-preview.mp4', type: 'video' },
    { url: 'https://cdn.example.com/launch-cover.jpg', type: 'image' },
    { url: 'https://news.example.com/media/launch-detail.webp', type: 'image' }
  ]);
});

test('ignores icons and resolves JSON-LD article imagery', () => {
  const candidates = extractMediaCandidates(`
    <main>
      <img src="/icon.png" width="48" height="48" alt="Company icon">
      <script type="application/ld+json">{"@type":"NewsArticle","image":{"url":"/photos/result.png"}}</script>
    </main>
  `, 'https://company.example.com/news/result');

  assert.deepEqual(candidates, [
    { url: 'https://company.example.com/photos/result.png', type: 'image' }
  ]);
});

test('classifies verified media content types and conservative URL fallbacks', () => {
  assert.equal(mediaTypeFromContentType('image/webp; charset=binary', 'https://cdn.example.com/file'), 'image');
  assert.equal(mediaTypeFromContentType('video/mp4', 'https://cdn.example.com/file'), 'video');
  assert.equal(mediaTypeFromContentType('application/octet-stream', 'https://cdn.example.com/demo.webm'), 'video');
  assert.equal(mediaTypeFromContentType('text/html', 'https://example.com/photo.jpg'), '');
});

test('reads a concise title from a verified source page', () => {
  assert.equal(
    extractSourceTitle('<head><meta property="og:title" content="  A concrete company launch  "><title>Fallback</title></head>'),
    'A concrete company launch'
  );
});

test('extracts official company logos before generic social preview images', () => {
  const candidates = extractCompanyLogoCandidates(`
    <head>
      <meta property="og:image" content="/photos/office.jpg">
      <link rel="icon" href="/favicon.png">
      <script type="application/ld+json">
        {"@type":"Organization","name":"Example","logo":{"url":"/brand/company-mark.svg"}}
      </script>
    </head>
    <body><header><img class="site-logo" src="/brand/header-logo.webp" alt="Example logo"></header></body>
  `, 'https://example.com/about');

  assert.deepEqual(candidates.slice(0, 3), [
    { url: 'https://example.com/brand/company-mark.svg', type: 'image' },
    { url: 'https://example.com/brand/header-logo.webp', type: 'image' },
    { url: 'https://example.com/favicon.png', type: 'image' }
  ]);
});

test('reads an article publication date from metadata and JSON-LD', () => {
  assert.equal(
    extractPublishedAt('<meta property="article:published_time" content="2026-08-18T09:30:00+01:00">'),
    '2026-08-18T08:30:00.000Z'
  );
  assert.equal(
    extractPublishedAt('<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-08-17"}</script>'),
    '2026-08-17T12:00:00.000Z'
  );
});

test('builds official-domain favicon fallbacks for company profiles', () => {
  assert.deepEqual(buildCompanyFaviconCandidates('https://www.example.com/about').slice(0, 2), [
    { url: 'https://www.example.com/favicon.ico', type: 'image' },
    {
      url: 'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fwww.example.com&sz=256',
      type: 'image'
    }
  ]);
  assert.deepEqual(buildCompanyFaviconCandidates('not a URL'), []);
});
