const CREATE_ACTION_PATTERN = /\b(draft|drafts|post|posts|create|creates|creation|creations|make|generate|generation|prepare|fill|collect|find)\b/;
const JOB_SUBJECT_PATTERN = /\b(job|jobs|role|roles|position|positions|vacancy|vacancies|placement|graduate|internship)\b/;
const COMPANY_PROFILE_PATTERN = /\b(companies|company\s+profiles?|company\s+users?|employer\s+profiles?|employer\s+users?|business\s+profiles?|business\s+users?)\b/;
const EXPLICIT_CANDIDATE_PATTERN = /\b(candidate|candidates|candidate\s+users?|candidate\s+profiles?|job\s+seekers?|talent\s+profiles?|talent\s+members?|profiles?\s+of\s+users?)\b/;
const GENERIC_CANDIDATE_PATTERN = /\b(users?|user\s+profiles?|people|draft\s+profiles?)\b/;
const CANDIDATE_ARTIFACT_PATTERN = /\b(profile|profiles|user|users|candidate|candidates|talent\s+story|talent\s+stories|story|stories|post|posts)\b/;
const GENERIC_POST_PATTERN = /\b(post\s+drafts?|post\s+creations?|social\s+posts?|feed\s+posts?|posts?|stories?)\b/;
const WORK_NEWS_PATTERN = /\b(work\s*news|company\s+updates?|linkedin\s+updates?|feed\s+posts?|company\s+posts?|news\s+posts?)\b/;
const LIVE_SOURCE_PATTERN = /\b(live|latest|recent|current|web|online|search|find|collect|linkedin|newsroom|official\s+(?:site|website)|company\s+(?:site|website)|website|source|actual|real(?:-?world)?)\b/;

const detectAdminAssistantIntent = (message, { hasProfileImages = false } = {}) => {
  const lowerMessage = String(message || '').trim().toLowerCase();
  const hasCreateAction = CREATE_ACTION_PATTERN.test(lowerMessage);
  const hasCompanyProfileSubject = COMPANY_PROFILE_PATTERN.test(lowerMessage);
  const hasExplicitCandidateSubject = EXPLICIT_CANDIDATE_PATTERN.test(lowerMessage);
  const hasGenericCandidateSubject = GENERIC_CANDIDATE_PATTERN.test(lowerMessage);
  const hasWorkNewsSubject = WORK_NEWS_PATTERN.test(lowerMessage);

  const wantsCompanyInfo = /\b(company|business|employer|website|industry|founded|address|headquarters|details|profile)\b/.test(lowerMessage);
  const wantsJobDrafts = JOB_SUBJECT_PATTERN.test(lowerMessage) && hasCreateAction;
  const wantsWebJobs = wantsJobDrafts || (
    /\b(latest|recent|live|active|current|web|online|search|find|collect|career\s*page|source\s*link|indeed|jsearch|rapidapi|job\s*sites?|job\s*boards?|gradcracker|rate\s*my\s*placement|ratemyplacement|linkedin)\b/.test(lowerMessage)
    && JOB_SUBJECT_PATTERN.test(lowerMessage)
  );
  const wantsCompanyProfileDrafts = !wantsJobDrafts
    && hasCompanyProfileSubject
    && hasCreateAction;
  const wantsCandidateDrafts = !wantsJobDrafts
    && (hasProfileImages || hasExplicitCandidateSubject || (!hasCompanyProfileSubject && hasGenericCandidateSubject))
    && hasCreateAction
    && CANDIDATE_ARTIFACT_PATTERN.test(lowerMessage);
  const wantsGenericPostDrafts = !wantsJobDrafts
    && !wantsCandidateDrafts
    && GENERIC_POST_PATTERN.test(lowerMessage)
    && hasCreateAction;
  const wantsWorkNewsDrafts = !wantsJobDrafts
    && (wantsGenericPostDrafts || hasWorkNewsSubject)
    && (hasCreateAction || /\b(from\s+web|live\s+web|latest|recent|search|find|collect|linkedin|companies?)\b/.test(lowerMessage));
  const wantsLiveWorkNews = wantsWorkNewsDrafts && LIVE_SOURCE_PATTERN.test(lowerMessage);
  const wantsLiveCompanyProfiles = wantsCompanyProfileDrafts && LIVE_SOURCE_PATTERN.test(lowerMessage);

  return {
    wantsCandidateDrafts,
    wantsCompanyInfo,
    wantsCompanyProfileDrafts,
    wantsJobDrafts,
    wantsLiveCompanyProfiles,
    wantsLiveWorkNews,
    wantsWebJobs,
    wantsWorkNewsDrafts
  };
};

module.exports = { detectAdminAssistantIntent };
