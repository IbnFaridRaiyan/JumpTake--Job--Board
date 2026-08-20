const test = require('node:test');
const assert = require('node:assert/strict');

const {
  candidateIdentityKeys,
  companyIdentityKeys,
  feedPostIdentityKeys,
  filterUniqueDrafts,
  jobIdentityKeys,
  normalizeIdentityUrl,
  profileImageIdentity
} = require('./adminDraftDedup');

test('canonical URLs ignore tracking while preserving requisition parameters', () => {
  assert.equal(
    normalizeIdentityUrl('https://WWW.example.com/jobs/view?jk=ABC123&utm_source=indeed#apply'),
    'https://example.com/jobs/view?jk=ABC123'
  );
  assert.equal(
    normalizeIdentityUrl('https://example.com/apply?id=42&org_id=7'),
    'https://example.com/apply?id=42&org_id=7'
  );
});

test('job drafts collide by canonical link or normalized role identity', () => {
  const stored = jobIdentityKeys({
    companyName: 'Acme & Co.',
    title: 'Software Engineer',
    location: 'London, UK',
    sourceUrl: 'https://jobs.example.com/roles/123?utm_source=indeed'
  });
  const byLink = filterUniqueDrafts([
    { companyName: 'Different', title: 'Other', location: 'Remote', source: 'https://jobs.example.com/roles/123' }
  ], new Set(stored), jobIdentityKeys);
  const byRole = filterUniqueDrafts([
    { companyName: 'ACME and CO', title: 'Software Engineer!', location: 'London UK' }
  ], new Set(stored), jobIdentityKeys);
  assert.equal(byLink.rows.length, 0);
  assert.equal(byRole.rows.length, 0);
});

test('candidate and company identities reject exact names and reused pictures', () => {
  const image = 'https://randomuser.me/api/portraits/women/12.jpg?cache=1';
  const candidateKeys = new Set(candidateIdentityKeys({ name: 'Maya Stone', profileImage: image }));
  assert.equal(filterUniqueDrafts([
    { name: 'Different Person', profileImage: 'https://randomuser.me/api/portraits/women/12.jpg?cache=2' }
  ], candidateKeys, candidateIdentityKeys).rows.length, 0);

  const companyKeys = new Set(companyIdentityKeys({ name: 'North Star Labs' }));
  assert.equal(filterUniqueDrafts([
    { name: 'north-star labs' }
  ], companyKeys, companyIdentityKeys).rows.length, 0);
  assert.equal(profileImageIdentity(image).includes('?'), false);
});

test('feed posts reject the same source or body even when the author changes', () => {
  const stored = new Set(feedPostIdentityKeys({
    type: 'work-news',
    authorName: 'Acme',
    body: 'We launched the new service today.',
    source: 'https://acme.example/news/launch?utm_campaign=social'
  }));
  assert.equal(filterUniqueDrafts([
    { type: 'work-news', authorName: 'Other', body: 'Different', source: 'https://acme.example/news/launch' }
  ], new Set(stored), feedPostIdentityKeys).rows.length, 0);
  assert.equal(filterUniqueDrafts([
    { type: 'work-news', authorName: 'Different Company', body: 'We launched the new service today!' }
  ], new Set(stored), feedPostIdentityKeys).rows.length, 0);
});
