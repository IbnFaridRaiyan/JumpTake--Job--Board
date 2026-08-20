const test = require('node:test');
const assert = require('node:assert/strict');

const { detectAdminAssistantIntent } = require('./adminAssistantIntent');

test('detects combined company profile and sourced Work News requests', () => {
  const intent = detectAdminAssistantIntent(
    'Create me 30 company users and their Work News posts from their actual website source actual real world news.'
  );

  assert.equal(intent.wantsCompanyProfileDrafts, true);
  assert.equal(intent.wantsWorkNewsDrafts, true);
  assert.equal(intent.wantsLiveCompanyProfiles, true);
  assert.equal(intent.wantsLiveWorkNews, true);
  assert.equal(intent.wantsCandidateDrafts, false);
  assert.equal(intent.wantsJobDrafts, false);
});

test('does not confuse company users with candidate users', () => {
  const companyIntent = detectAdminAssistantIntent('Create 20 company users');
  assert.equal(companyIntent.wantsCompanyProfileDrafts, true);
  assert.equal(companyIntent.wantsCandidateDrafts, false);

  const candidateIntent = detectAdminAssistantIntent('Create 20 candidate users with talent story posts');
  assert.equal(candidateIntent.wantsCandidateDrafts, true);
  assert.equal(candidateIntent.wantsCompanyProfileDrafts, false);
  assert.equal(candidateIntent.wantsWorkNewsDrafts, false);
});

test('detects standalone sourced Work News draft requests', () => {
  const intent = detectAdminAssistantIntent('Find 15 latest Work News posts from official company websites');
  assert.equal(intent.wantsWorkNewsDrafts, true);
  assert.equal(intent.wantsLiveWorkNews, true);
  assert.equal(intent.wantsCandidateDrafts, false);
});
