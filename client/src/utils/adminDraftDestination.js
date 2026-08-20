const hasRows = (value) => Array.isArray(value) && value.length > 0;

const getAdminDraftDestination = (response = {}) => {
  if (hasRows(response.workNewsDrafts)) return 'workNewsPosts';
  if (hasRows(response.userDrafts)) return 'talentStoryPosts';
  if (hasRows(response.jobDrafts)) return 'jobs';
  if (hasRows(response.companyDrafts)) return 'companies';
  return '';
};

export default getAdminDraftDestination;
