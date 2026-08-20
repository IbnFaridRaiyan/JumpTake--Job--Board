const test = require('node:test');
const assert = require('node:assert/strict');

const { getRequestedDraftCount } = require('./adminDraftCount');

const count = (message, kind) => getRequestedDraftCount(message, { kind, max: 1000 });

test('preserves explicit large quantities for each draft type', () => {
  assert.equal(count('Create 100 job posts with live Apply links', 'job'), 100);
  assert.equal(count('Create 50 candidate users', 'candidate'), 50);
  assert.equal(count('Find 30 Work News posts', 'work-news'), 30);
  assert.equal(count('Generate 75 company profiles', 'company'), 75);
});

test('reads separate quantities from a combined company and Work News prompt', () => {
  const message = 'Create 50 company users and 30 Work News posts from official sources';
  assert.equal(count(message, 'company'), 50);
  assert.equal(count(message, 'work-news'), 30);
});

test('inherits the shared quantity when a related draft type has no second number', () => {
  const message = 'Create 30 company users and their Work News posts';
  assert.equal(count(message, 'company'), 30);
  assert.equal(count(message, 'work-news'), 30);
});

test('respects disabled requests and the configured maximum', () => {
  assert.equal(getRequestedDraftCount('Create 100 jobs', { enabled: false, kind: 'job' }), 0);
  assert.equal(getRequestedDraftCount('Create 9000 jobs', { kind: 'job', max: 5000 }), 5000);
});
