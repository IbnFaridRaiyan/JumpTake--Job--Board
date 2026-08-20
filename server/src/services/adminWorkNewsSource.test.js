const test = require('node:test');
const assert = require('node:assert/strict');

const { isSpecificWorkNewsSourceUrl } = require('./adminWorkNewsSource');

test('accepts specific company article and release URLs', () => {
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/news/product-launch-2026'), true);
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/newsroom/releases/new-campus'), true);
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/news?id=1842'), true);
});

test('rejects homepages and generic news indexes', () => {
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/'), false);
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/news'), false);
  assert.equal(isSpecificWorkNewsSourceUrl('https://company.example/newsroom/'), false);
  assert.equal(isSpecificWorkNewsSourceUrl('not a URL'), false);
});
