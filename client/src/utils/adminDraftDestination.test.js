import getAdminDraftDestination from './adminDraftDestination';

describe('getAdminDraftDestination', () => {
  it('opens Work News for a combined company and Work News response', () => {
    expect(getAdminDraftDestination({
      companyDrafts: [{ name: 'Example Company' }],
      workNewsDrafts: [{ companyName: 'Example Company' }]
    })).toBe('workNewsPosts');
  });

  it('routes the remaining draft types to their editing sections', () => {
    expect(getAdminDraftDestination({ userDrafts: [{}] })).toBe('talentStoryPosts');
    expect(getAdminDraftDestination({ jobDrafts: [{}] })).toBe('jobs');
    expect(getAdminDraftDestination({ companyDrafts: [{}] })).toBe('companies');
    expect(getAdminDraftDestination({})).toBe('');
  });
});
