const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const Application = require('../models/Application');
const ApplicationBookmark = require('../models/ApplicationBookmark');
const Assessment = require('../models/Assessment');
const AssessmentAssignment = require('../models/AssessmentAssignment');
const CandidateBookmark = require('../models/CandidateBookmark');
const CandidateConnection = require('../models/CandidateConnection');
const CandidateLike = require('../models/CandidateLike');
const Company = require('../models/Company');
const DraftApplication = require('../models/DraftApplication');
const DeletedItem = require('../models/DeletedItem');
const Employer = require('../models/Employer');
const FeedPost = require('../models/FeedPost');
const Job = require('../models/Job');
const JobBookmark = require('../models/JobBookmark');
const JobInvitation = require('../models/JobInvitation');
const JobSeeker = require('../models/JobSeeker');
const MessageThread = require('../models/MessageThread');
const Notification = require('../models/Notification');
const TalentBookmark = require('../models/TalentBookmark');
const User = require('../models/User');

const router = express.Router();

const COLLECTIONS = {
  users: {
    label: 'Candidate Users',
    model: User,
    searchFields: ['email', 'jumptakeId'],
    summaryFields: ['email', 'jumptakeId', 'jobInterests', 'createdAt']
  },
  jobSeekers: {
    label: 'Candidate Profiles',
    model: JobSeeker,
    searchFields: ['name', 'email', 'resumeText'],
    summaryFields: ['name', 'email', 'skills', 'createdAt']
  },
  employers: {
    label: 'Employer Users',
    model: Employer,
    searchFields: ['username', 'email', 'phone'],
    summaryFields: ['username', 'email', 'phone', 'companyId', 'createdAt']
  },
  companies: {
    label: 'Companies',
    model: Company,
    searchFields: ['name', 'adminCompanyId', 'industry', 'headquarters', 'description', 'website'],
    summaryFields: ['name', 'adminCompanyId', 'industry', 'headquarters', 'website', 'createdAt']
  },
  jobs: {
    label: 'Job Posts',
    model: Job,
    searchFields: ['title', 'description', 'location', 'salary', 'jobType', 'jobNumber', 'adminCompanyId'],
    summaryFields: ['title', 'jobNumber', 'adminCompanyId', 'location', 'jobType', 'salary', 'active', 'company', 'createdAt']
  },
  applications: {
    label: 'Applications',
    model: Application,
    searchFields: ['status', 'message', 'candidateNumber', 'coverLetterText'],
    summaryFields: ['candidateNumber', 'status', 'job', 'user', 'createdAt']
  },
  assessments: {
    label: 'Assessments',
    model: Assessment,
    searchFields: ['title', 'description'],
    summaryFields: ['title', 'company', 'job', 'candidateUser', 'createdAt']
  },
  assessmentAssignments: {
    label: 'Assessment Assignments',
    model: AssessmentAssignment,
    searchFields: ['status', 'videoInterviewStatus', 'hiringStatus'],
    summaryFields: ['status', 'company', 'job', 'candidateUser', 'createdAt']
  },
  draftApplications: {
    label: 'Draft Applications',
    model: DraftApplication,
    searchFields: ['coverLetterText'],
    summaryFields: ['job', 'user', 'updatedAt', 'createdAt']
  },
  jobBookmarks: {
    label: 'Job Bookmarks',
    model: JobBookmark,
    searchFields: [],
    summaryFields: ['job', 'user', 'createdAt']
  },
  candidateBookmarks: {
    label: 'Candidate Bookmarks',
    model: CandidateBookmark,
    searchFields: [],
    summaryFields: ['user', 'candidate', 'createdAt']
  },
  talentBookmarks: {
    label: 'Talent Bookmarks',
    model: TalentBookmark,
    searchFields: [],
    summaryFields: ['company', 'candidate', 'createdAt']
  },
  applicationBookmarks: {
    label: 'Application Bookmarks',
    model: ApplicationBookmark,
    searchFields: [],
    summaryFields: ['company', 'application', 'createdAt']
  },
  candidateConnections: {
    label: 'Candidate Connections',
    model: CandidateConnection,
    searchFields: ['status'],
    summaryFields: ['requester', 'recipient', 'status', 'createdAt']
  },
  candidateLikes: {
    label: 'Candidate Likes',
    model: CandidateLike,
    searchFields: ['actorType', 'actorKey'],
    summaryFields: ['candidate', 'actorType', 'actorKey', 'createdAt']
  },
  jobInvitations: {
    label: 'Job Invitations',
    model: JobInvitation,
    searchFields: ['status'],
    summaryFields: ['company', 'job', 'candidate', 'candidateUser', 'status', 'createdAt']
  },
  messageThreads: {
    label: 'Messages',
    model: MessageThread,
    searchFields: ['conversationType', 'directKey'],
    summaryFields: ['conversationType', 'company', 'candidate', 'candidateUser', 'lastMessageAt']
  },
  notifications: {
    label: 'Notifications',
    model: Notification,
    searchFields: ['recipientType', 'recipientId', 'title', 'message', 'section'],
    summaryFields: ['recipientType', 'recipientId', 'title', 'section', 'read', 'createdAt']
  },
  feedPosts: {
    label: 'All Feed Posts',
    model: FeedPost,
    searchFields: ['type', 'body', 'authorId', 'authorType', 'authorName', 'source', 'sourceTitle'],
    summaryFields: ['type', 'authorName', 'authorType', 'audience', 'reach', 'source', 'createdAt']
  },
  workNewsPosts: {
    label: 'Work News Posts',
    model: FeedPost,
    baseQuery: { type: 'work-news' },
    searchFields: ['body', 'authorId', 'authorName', 'source', 'sourceTitle'],
    summaryFields: ['type', 'authorName', 'authorType', 'audience', 'reach', 'source', 'createdAt']
  },
  talentStoryPosts: {
    label: 'Talent Stories / Talent Pool Posts',
    model: FeedPost,
    baseQuery: { type: 'talent-story' },
    searchFields: ['body', 'authorId', 'authorName'],
    summaryFields: ['type', 'authorName', 'authorType', 'audience', 'reach', 'createdAt']
  }
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordResetToken',
  'passwordResetExpiresAt',
  '__v'
]);

const getCollectionConfig = (name) => {
  const config = COLLECTIONS[name];
  if (!config) {
    const error = new Error('Unknown admin collection');
    error.status = 404;
    throw error;
  }
  return config;
};

const stableCompare = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const requireAdmin = (req, res, next) => {
  const configuredKey = process.env.ADMIN_ACCESS_KEY;

  if (!configuredKey) {
    return res.status(503).json({
      error: 'Admin panel is not configured. Set ADMIN_ACCESS_KEY on the server.'
    });
  }

  const suppliedKey = req.get('x-admin-key') || req.body?.adminKey || '';

  if (!stableCompare(suppliedKey, configuredKey)) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }

  next();
};

const redactValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === 'object') {
    if (value instanceof mongoose.Types.ObjectId) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEYS.has(key) ? '[redacted]' : redactValue(nestedValue)
      ])
    );
  }

  return value;
};

const serializeDocument = (document) => {
  const plain = document?.toObject ? document.toObject() : document;
  return redactValue(plain);
};

const getSearchQuery = (config, search) => {
  const trimmed = String(search || '').trim();

  if (!trimmed || !config.searchFields.length) {
    return {};
  }

  const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: config.searchFields.map((field) => ({ [field]: regex }))
  };
};

const getSort = (model) => {
  if (model.schema.path('createdAt')) {
    return { createdAt: -1 };
  }

  if (model.schema.path('updatedAt')) {
    return { updatedAt: -1 };
  }

  return { _id: -1 };
};

const normalizeAdminCompanyId = (value) => String(value || '').trim();

const createCompanyNameFromAdminId = (adminCompanyId) => {
  const cleaned = normalizeAdminCompanyId(adminCompanyId);
  if (!cleaned) {
    return 'Admin Company';
  }

  return `Admin Company ${cleaned}`;
};

const resolveAdminJobCompany = async (companyValue, fallbackName = '') => {
  const requestedCompanyId = normalizeAdminCompanyId(companyValue);

  if (!requestedCompanyId) {
    const error = new Error('Company ID is required');
    error.status = 400;
    throw error;
  }

  if (mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
    const existingByObjectId = await Company.findById(requestedCompanyId);
    if (existingByObjectId) {
      return {
        company: existingByObjectId,
        adminCompanyId: existingByObjectId.adminCompanyId || requestedCompanyId
      };
    }

    const createdWithObjectId = await Company.create({
      _id: requestedCompanyId,
      name: fallbackName || createCompanyNameFromAdminId(requestedCompanyId),
      adminCompanyId: requestedCompanyId,
      source: 'admin'
    });

    return {
      company: createdWithObjectId,
      adminCompanyId: requestedCompanyId
    };
  }

  const existingByAdminId = await Company.findOne({ adminCompanyId: requestedCompanyId });
  if (existingByAdminId) {
    return {
      company: existingByAdminId,
      adminCompanyId: requestedCompanyId
    };
  }

  const created = await Company.create({
    name: fallbackName || createCompanyNameFromAdminId(requestedCompanyId),
    adminCompanyId: requestedCompanyId,
    source: 'admin'
  });

  return {
    company: created,
    adminCompanyId: requestedCompanyId
  };
};

const getOpenAIApiKey = () => (
  process.env.OPENAI_API_KEY
  || process.env.CHATGPT_API_KEY
  || process.env.OPENAI_SECRET_KEY
  || process.env.OPENAI_KEY
  || ''
).trim();

const getOpenAIModelCandidates = () => {
  const configured = String(process.env.OPENAI_MODEL || '').trim();
  return [...new Set([
    configured,
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5',
    'gpt-4.1-mini',
    'gpt-4o-mini'
  ].filter(Boolean))];
};

const getOpenAISearchModelCandidates = () => {
  const configured = String(process.env.OPENAI_MODEL || '').trim();
  return [...new Set([
    configured,
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5-search-api',
    'gpt-4.1-mini'
  ].filter(Boolean))];
};

const extractOpenAIText = (data) => {
  const outputText = String(data?.output_text || '').trim();
  if (outputText) {
    return outputText;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .flatMap((block) => Array.isArray(block?.content) ? block.content : [])
    .map((part) => {
      if (typeof part?.text === 'string') {
        return part.text;
      }
      if (typeof part?.text?.value === 'string') {
        return part.text.value;
      }
      return '';
    })
    .join('')
    .trim();
};

const askAdminOpenAIWithModel = async ({ apiKey, model, prompt, useWebSearch = false }) => {
  try {
    const payload = {
      model,
      input: prompt,
      max_output_tokens: 5500
    };

    if (useWebSearch) {
      payload.tools = [{ type: 'web_search', external_web_access: true }];
      payload.tool_choice = 'required';
      payload.include = ['web_search_call.action.sources'];
    }

    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      payload,
      {
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = extractOpenAIText(response.data);
    if (text) {
      return text;
    }
  } catch (error) {
    const message = String(error.response?.data?.error?.message || error.message || '');
    const shouldRetryWithLegacySearch = useWebSearch && /web_search|tool|unsupported|invalid/i.test(message);
    if (shouldRetryWithLegacySearch) {
      const legacyPayload = {
        model,
        input: prompt,
        max_output_tokens: 5500,
        tools: [{ type: 'web_search_preview' }],
        tool_choice: 'required',
        include: ['web_search_call.action.sources']
      };

      try {
        const legacyResponse = await axios.post(
          'https://api.openai.com/v1/responses',
          legacyPayload,
          {
            timeout: 25000,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const legacyText = extractOpenAIText(legacyResponse.data);
        if (legacyText) {
          return legacyText;
        }
      } catch (legacyError) {
        const legacyMessage = String(legacyError.response?.data?.error?.message || legacyError.message || '');
        if (!/web_search|tool|unsupported|invalid|responses|model|not found/i.test(legacyMessage)) {
          throw legacyError;
        }
      }
    }

    const shouldRetryWithoutSearch = useWebSearch && /web_search|tool|unsupported|invalid/i.test(message);
    if (shouldRetryWithoutSearch) {
      return askAdminOpenAIChatSearch({ apiKey, prompt });
    }

    const shouldTryChat = /responses|output_text|max_output_tokens|unknown|not found|unsupported|model/i.test(message);
    if (!shouldTryChat) {
      throw error;
    }
  }

  const chatResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      temperature: 0.25,
      max_tokens: 5500,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      timeout: 25000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return String(chatResponse.data?.choices?.[0]?.message?.content || '').trim();
};

const askAdminOpenAIChatSearch = async ({ apiKey, prompt }) => {
  let lastError = null;

  for (const model of ['gpt-5-search-api', 'gpt-4o-search-preview', 'gpt-4o-mini-search-preview']) {
    try {
      const chatResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          max_tokens: 5500,
          web_search_options: {},
          messages: [{ role: 'user', content: prompt }]
        },
        {
          timeout: 25000,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const text = String(chatResponse.data?.choices?.[0]?.message?.content || '').trim();
      if (text) {
        return text;
      }
    } catch (error) {
      lastError = error;
      const message = String(error.response?.data?.error?.message || error.message || '');
      if (!/model|not found|unsupported|deprecated|search|web_search/i.test(message)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return '';
};

const askAdminOpenAI = async (prompt, { useWebSearch = false } = {}) => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return '';
  }

  let lastError = null;
  const modelCandidates = useWebSearch ? getOpenAISearchModelCandidates() : getOpenAIModelCandidates();
  for (const model of modelCandidates) {
    try {
      const text = await askAdminOpenAIWithModel({ apiKey, model, prompt, useWebSearch });
      if (text) {
        return text;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[ADMIN ASSISTANT] OpenAI model ${model} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return '';
};

const parseJsonObjectFromText = (text) => {
  const raw = String(text || '').trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch (nestedError) {
      return null;
    }
  }
};

const looksLikeWebJobRefusal = (text) => (
  /\b(can't|cannot|unable|need|without|no access|not able)\b/i.test(String(text || ''))
  && /\b(web|browse|browsing|internet|source|sources|company details|job feed|live jobs)\b/i.test(String(text || ''))
);

const looksLikeWebWorkNewsRefusal = (text) => (
  /\b(can't|cannot|unable|need|without|no access|not able)\b/i.test(String(text || ''))
  && /\b(web|browse|browsing|internet|source|sources|linkedin|company updates?|live)\b/i.test(String(text || ''))
);

const extractQuotedOrAfter = (message, labels) => {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*(?:is|as|:|=)?\\s*["']?([^"',\\n]+)`, 'i');
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
};

const createFallbackAdminAssistantPlan = (message) => {
  const normalized = String(message || '').trim();
  const lower = normalized.toLowerCase();
  const wantsCompany = /\b(company|business|employer)\b/.test(lower);
  const wantsJob = /\b(job|role|position|vacancy|post)\b/.test(lower);

  const companyName = extractQuotedOrAfter(normalized, ['company name', 'company', 'business name', 'employer']);
  const jobTitle = extractQuotedOrAfter(normalized, ['job title', 'title', 'role', 'position']);
  const location = extractQuotedOrAfter(normalized, ['location', 'in']);
  const salary = extractQuotedOrAfter(normalized, ['salary', 'pay']);
  const companyId = extractQuotedOrAfter(normalized, ['company id', 'company code', 'id']);

  return {
    action: wantsJob ? 'fillJob' : wantsCompany ? 'fillCompany' : 'reply',
    reply: wantsJob
      ? 'I filled what I could in the job form. Add any missing details, then create the job.'
      : wantsCompany
        ? 'I filled what I could in the company form. Add any missing details, then create the company.'
        : 'Tell me the company or job details you want filled.',
    companyForm: wantsCompany ? {
      name: companyName || '',
      adminCompanyId: companyId || '',
      description: companyName ? `${companyName} company profile created from the admin assistant.` : ''
    } : {},
    jobForm: wantsJob ? {
      company: companyId || '',
      title: jobTitle || '',
      location: location || '',
      salary: salary || '',
      jobType: /\b(remote)\b/i.test(normalized) ? 'Remote' : 'Full-time',
      description: normalized
    } : {}
  };
};

const getDeletedItemLabel = (document) => String(
  document?.title
  || document?.name
  || document?.email
  || document?.username
  || document?.authorName
  || document?.sourceTitle
  || document?._id
  || 'Deleted item'
);

const ADMIN_ASSISTANT_MAX_DRAFTS = 100;
const ADMIN_ASSISTANT_DRAFT_BATCH_SIZE = 10;

const getRequestedDraftCount = (message, isDraftRequest) => {
  if (!isDraftRequest) return 0;
  const text = String(message || '');
  const explicit = text.match(/\b(\d{1,3})\s+(?:new\s+|latest\s+|recent\s+)?(?:work\s*news\s+|company\s+|social\s+|feed\s+|job\s+)?(?:post\s+)?drafts?\b/i)
    || text.match(/\b(?:make|create|generate|prepare|fill|draft|collect|find)\s+(\d{1,3})\b/i)
    || text.match(/\b(\d{1,3})\s+(?:jobs?|posts?|updates?|roles?)\b/i);
  if (explicit?.[1]) {
    return Math.min(ADMIN_ASSISTANT_MAX_DRAFTS, Math.max(1, Number(explicit[1])));
  }
  return /\b(?:drafts|jobs|posts|updates|roles)\b/i.test(text) ? 5 : 1;
};

const createDraftBatchPrompt = ({ basePrompt, kind, count, batchNumber, totalBatches }) => `${basePrompt}

Draft batch instruction (mandatory):
- This is batch ${batchNumber} of ${totalBatches}.
- Return exactly ${count} distinct ${kind === 'job' ? 'jobDrafts' : 'workNewsDrafts'} in the JSON array.
- Return an empty ${kind === 'job' ? 'workNewsDrafts' : 'jobDrafts'} array.
- Do not collapse the drafts into jobForm, companyForm, a summary, or a single example.
- Every array item must be a complete, separately editable draft using the schema above.
- Keep descriptions concise enough to return all ${count} items.
- The admin will review, edit, and manually publish them; do not publish anything.`;

const generateAdminDraftBatches = async ({ prompt, kind, requestedCount, useWebSearch, seedDrafts = [] }) => {
  const drafts = Array.isArray(seedDrafts) ? seedDrafts.slice(0, requestedCount) : [];
  const remaining = requestedCount - drafts.length;
  if (remaining <= 0) return drafts;

  const batchSizes = [];
  for (let left = remaining; left > 0; left -= ADMIN_ASSISTANT_DRAFT_BATCH_SIZE) {
    batchSizes.push(Math.min(ADMIN_ASSISTANT_DRAFT_BATCH_SIZE, left));
  }

  const results = await Promise.all(batchSizes.map(async (count, index) => {
    try {
      const batchPrompt = createDraftBatchPrompt({
        basePrompt: prompt,
        kind,
        count,
        batchNumber: index + 1,
        totalBatches: batchSizes.length
      });
      const text = await askAdminOpenAI(batchPrompt, { useWebSearch });
      const parsed = parseJsonObjectFromText(text) || {};
      const rows = kind === 'job' ? parsed.jobDrafts : parsed.workNewsDrafts;
      return Array.isArray(rows) ? rows.slice(0, count) : [];
    } catch (error) {
      console.warn(`[ADMIN ASSISTANT] ${kind} draft batch ${index + 1} failed:`, error.message);
      return [];
    }
  }));

  drafts.push(...results.flat());

  // If a model returned fewer rows than explicitly requested, ask only for the
  // missing rows once more instead of silently showing a partial draft set.
  const stillMissing = requestedCount - drafts.length;
  if (stillMissing > 0) {
    const retryResults = await Promise.all(Array.from(
      { length: Math.ceil(stillMissing / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE) },
      async (_, index) => {
        const count = Math.min(ADMIN_ASSISTANT_DRAFT_BATCH_SIZE, stillMissing - (index * ADMIN_ASSISTANT_DRAFT_BATCH_SIZE));
        const retryPrompt = createDraftBatchPrompt({
          basePrompt: prompt,
          kind,
          count,
          batchNumber: index + 1,
          totalBatches: Math.ceil(stillMissing / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE)
        });
        try {
          const text = await askAdminOpenAI(`${retryPrompt}\nThis is a retry for missing drafts. Return the full exact array now.`, { useWebSearch });
          const parsed = parseJsonObjectFromText(text) || {};
          const rows = kind === 'job' ? parsed.jobDrafts : parsed.workNewsDrafts;
          return Array.isArray(rows) ? rows.slice(0, count) : [];
        } catch (error) {
          console.warn(`[ADMIN ASSISTANT] ${kind} retry batch ${index + 1} failed:`, error.message);
          return [];
        }
      }
    ));
    drafts.push(...retryResults.flat());
  }

  return drafts.slice(0, requestedCount);
};

const createAdminAssistantPrompt = ({ message, companyForm, jobForm }) => `You are JumpTake Admin AI. Convert the admin request into JSON that fills admin panel forms.

Return only valid JSON with this shape:
{
  "reply": "short admin-facing reply",
  "action": "fillCompany" | "fillJob" | "fillBoth" | "draftWorkNews" | "reply",
  "companyForm": {
    "name": "",
    "adminCompanyId": "",
    "industry": "",
    "headquarters": "",
    "website": "",
    "founded": "",
    "description": ""
  },
  "jobForm": {
    "company": "",
    "companyName": "",
    "title": "",
    "location": "",
    "salary": "",
    "applicationLink": "",
    "jobType": "Full-time",
    "skills": "",
    "description": "",
    "requirements": "",
    "responsibilities": ""
  },
  "jobDrafts": [
    {
      "company": "",
      "companyName": "",
      "title": "",
      "location": "",
      "salary": "",
      "applicationLink": "",
      "jobType": "Full-time",
      "skills": "",
      "description": "",
      "requirements": "",
      "responsibilities": "",
      "source": ""
    }
  ],
  "workNewsDrafts": [
    {
      "companyName": "",
      "companyLogoUrl": "",
      "body": "",
      "mediaUrl": "",
      "mediaType": "image",
      "source": "",
      "sourceTitle": ""
    }
  ]
}

Rules:
- Fill only fields that can be inferred from the request.
- If the admin asks to post/create a job, fill jobForm. If they provide a company ID such as ez1231231, put it in jobForm.company.
- If the admin asks for multiple/latest/web jobs, return jobDrafts instead of one jobForm.
- For requests like "post 10 latest jobs from the web", use web search and collect exactly the requested number when possible, otherwise as many reliable current jobs as you can find.
- When web/latest jobs are requested, you have access to web search through the API tool. Do not claim you cannot browse, cannot access live web jobs, or need a browsing-enabled feed.
- Search sources such as Gradcracker, RateMyPlacement, LinkedIn, company career pages, and other reliable job pages. Prefer direct application pages or original job posts.
- For every jobDraft include title, companyName, location, applicationLink/source URL, jobType, description, requirements, responsibilities, skills, and salary if available.
- jobDraft.company should be a stable admin company ID based on the company name, lowercase words joined with hyphens, unless the prompt provides a specific company ID.
- Put the source URL in both applicationLink when it is the apply/job page and source for traceability.
- Do not say the jobs were posted. Tell the admin the drafts are ready and they should review each card and click Post Job.
- Do not fabricate job details. Leave unknown fields blank.
- If the admin asks to post/create Work News, company updates, LinkedIn updates, or feed posts from the live web, return workNewsDrafts instead of jobDrafts.
- For requests like "post on work news make 10 drafts from the live web", use web search and collect exactly the requested number when possible, otherwise as many reliable current company updates as you can find.
- Search LinkedIn public results, company newsrooms, company blogs, official social posts, and reliable business news pages. Prefer original company pages when LinkedIn is unavailable.
- Each workNewsDraft must include companyName, source URL, sourceTitle when available, and a concise JumpTake Work News body. Paraphrase the update; do not copy long text verbatim.
- Actively search for the company's official logo/profile image using the company website, newsroom, public social profile, or reliable brand/profile pages. Put a direct company logo or profile image URL in companyLogoUrl only when a reliable direct image URL is available. Otherwise leave it blank so JumpTake can use its default icon.
- Put a direct image URL from the update in mediaUrl only when a reliable direct image URL is available. mediaType must be image or video. If no media exists or the URL is not direct, leave mediaUrl blank.
- Do not say the Work News posts were posted. Tell the admin the drafts are ready and they should review each card and click Post Work News.
- If they ask to create a company, fill companyForm. If they provide a custom company ID/code, put it in companyForm.adminCompanyId.
- For company creation or company enrichment, extract and fill company name, headquarters/address, website, industry, founded year, and description/company details from the admin text.
- If the admin gives only a company name and fields are missing, use web search results to identify the real company details. Prefer official company websites and reliable business/profile pages. Do not invent details; leave uncertain fields blank.
- Put a physical address or city/country in companyForm.headquarters.
- Put the official public URL in companyForm.website.
- Put a concise factual company overview in companyForm.description.
- jobType must be one of Full-time, Part-time, Contract, Internship, Remote.
- Do not include markdown.

Today is ${new Date().toISOString().slice(0, 10)}. Treat "latest" as current to this date.
Current company form: ${JSON.stringify(companyForm || {})}
Current job form: ${JSON.stringify(jobForm || {})}
Admin request: ${message}`;

const deleteCandidateData = async ({ userId, jobSeekerId }) => {
  const candidateIds = [];

  if (jobSeekerId && mongoose.Types.ObjectId.isValid(jobSeekerId)) {
    candidateIds.push(jobSeekerId);
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const profiles = await JobSeeker.find({ user: userId }).select('_id');
    candidateIds.push(...profiles.map((profile) => profile._id));
  }

  const uniqueCandidateIds = [...new Set(candidateIds.map(String))];

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    await Promise.all([
      Application.deleteMany({ user: userId }),
      DraftApplication.deleteMany({ user: userId }),
      JobBookmark.deleteMany({ user: userId }),
      CandidateBookmark.deleteMany({ user: userId }),
      CandidateConnection.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] }),
      JobInvitation.deleteMany({ candidateUser: userId }),
      Assessment.deleteMany({ candidateUser: userId }),
      AssessmentAssignment.deleteMany({ candidateUser: userId }),
      MessageThread.deleteMany({
        $or: [
          { candidateUser: userId },
          { participantUsers: userId }
        ]
      }),
      Notification.deleteMany({ recipientType: 'candidate', recipientId: String(userId) })
    ]);
  }

  if (uniqueCandidateIds.length) {
    await Promise.all([
      TalentBookmark.deleteMany({ candidate: { $in: uniqueCandidateIds } }),
      CandidateBookmark.deleteMany({ candidate: { $in: uniqueCandidateIds } }),
      CandidateLike.deleteMany({ candidate: { $in: uniqueCandidateIds } }),
      JobInvitation.deleteMany({ candidate: { $in: uniqueCandidateIds } }),
      MessageThread.deleteMany({
        $or: [
          { candidate: { $in: uniqueCandidateIds } },
          { candidateProfiles: { $in: uniqueCandidateIds } }
        ]
      }),
      JobSeeker.deleteMany({ _id: { $in: uniqueCandidateIds } })
    ]);
  }
};

const deleteJobData = async (jobId) => {
  await Promise.all([
    Application.deleteMany({ job: jobId }),
    DraftApplication.deleteMany({ job: jobId }),
    JobBookmark.deleteMany({ job: jobId }),
    JobInvitation.deleteMany({ job: jobId }),
    Assessment.deleteMany({ job: jobId }),
    AssessmentAssignment.deleteMany({ job: jobId })
  ]);
};

const deleteCompanyData = async (companyId) => {
  const jobs = await Job.find({ company: companyId }).select('_id');
  const jobIds = jobs.map((job) => job._id);

  if (jobIds.length) {
    await Promise.all([
      Application.deleteMany({ job: { $in: jobIds } }),
      DraftApplication.deleteMany({ job: { $in: jobIds } }),
      JobBookmark.deleteMany({ job: { $in: jobIds } }),
      JobInvitation.deleteMany({ job: { $in: jobIds } }),
      Assessment.deleteMany({ job: { $in: jobIds } }),
      AssessmentAssignment.deleteMany({ job: { $in: jobIds } }),
      Job.deleteMany({ _id: { $in: jobIds } })
    ]);
  }

  await Promise.all([
    Employer.deleteMany({ companyId }),
    ApplicationBookmark.deleteMany({ company: companyId }),
    TalentBookmark.deleteMany({ company: companyId }),
    MessageThread.deleteMany({ company: companyId }),
    Notification.deleteMany({ recipientType: 'employer', recipientId: String(companyId) }),
    Assessment.deleteMany({ company: companyId }),
    AssessmentAssignment.deleteMany({ company: companyId }),
    JobInvitation.deleteMany({ company: companyId })
  ]);
};

router.use(requireAdmin);

router.get('/session', (req, res) => {
  res.json({ ok: true });
});

router.get('/summary', async (req, res) => {
  try {
    const collections = await Promise.all(
      Object.entries(COLLECTIONS).map(async ([key, config]) => ({
        key,
        label: config.label,
        count: await config.model.countDocuments(config.baseQuery || {})
      }))
    );

    collections.push({
      key: 'deletedItems',
      label: 'Deleted Items',
      count: await DeletedItem.countDocuments()
    });

    res.json({ collections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/collections/:collection', async (req, res) => {
  try {
    if (req.params.collection === 'deletedItems') {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 5000);
      const search = String(req.query.q || '').trim();
      const query = search ? {
        $or: [
          { label: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { collection: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { originalId: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        ]
      } : {};
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        DeletedItem.find(query).sort({ deletedAt: -1 }).skip(skip).limit(limit),
        DeletedItem.countDocuments(query)
      ]);
      return res.json({
        collection: 'deletedItems',
        label: 'Deleted Items',
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        items: items.map(serializeDocument)
      });
    }

    const config = getCollectionConfig(req.params.collection);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 5000);
    const searchQuery = getSearchQuery(config, req.query.q);
    const query = {
      ...(config.baseQuery || {}),
      ...searchQuery
    };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      config.model
        .find(query)
        .sort(getSort(config.model))
        .skip(skip)
        .limit(limit),
      config.model.countDocuments(query)
    ]);

    res.json({
      collection: req.params.collection,
      label: config.label,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      items: items.map(serializeDocument)
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.patch('/collections/:collection/:id', async (req, res) => {
  try {
    const config = getCollectionConfig(req.params.collection);
    const updates = { ...req.body };

    delete updates.adminKey;
    delete updates._id;
    delete updates.__v;
    delete updates.password;
    delete updates.passwordResetToken;
    delete updates.passwordResetExpiresAt;

    const updated = await config.model.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ item: serializeDocument(updated) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete('/collections/:collection/:id', async (req, res) => {
  try {
    const config = getCollectionConfig(req.params.collection);
    const { collection, id } = req.params;

    const existing = await config.model.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await DeletedItem.create({
      itemType: 'record',
      collection,
      originalId: String(existing._id),
      label: getDeletedItemLabel(existing),
      data: existing.toObject({ depopulate: true })
    });

    await config.model.findByIdAndDelete(id);

    res.json({ ok: true, deleted: id, recoverable: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/deleted-items/:id/restore', async (req, res) => {
  try {
    const deletedItem = await DeletedItem.findById(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: 'Deleted item not found' });

    if (deletedItem.itemType === 'comment') {
      const post = await FeedPost.findById(deletedItem.parentId);
      if (!post) return res.status(409).json({ error: 'The original post no longer exists, so this comment cannot be restored.' });
      const comments = Array.isArray(post.comments) ? [...post.comments] : [];
      const alreadyExists = comments.some((comment) => String(comment?.id || comment?._id) === String(deletedItem.originalId));
      if (alreadyExists) return res.status(409).json({ error: 'That comment has already been restored.' });
      const restoreIndex = deletedItem.originalIndex >= 0 ? Math.min(deletedItem.originalIndex, comments.length) : comments.length;
      comments.splice(restoreIndex, 0, deletedItem.data);
      post.comments = comments;
      post.markModified('comments');
      await post.save();
    } else {
      const config = getCollectionConfig(deletedItem.collection);
      const existing = await config.model.findById(deletedItem.originalId);
      if (existing) return res.status(409).json({ error: 'That record already exists and cannot be restored twice.' });
      await config.model.create(deletedItem.data);
    }

    await DeletedItem.findByIdAndDelete(deletedItem._id);
    res.json({ ok: true, restored: deletedItem.originalId });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Could not restore deleted item' });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      companyName,
      location,
      salary,
      applicationLink,
      jobType,
      requirements,
      responsibilities,
      skills
    } = req.body;
    const resolvedCompany = await resolveAdminJobCompany(company, companyName);

    const job = await Job.create({
      title,
      description,
      company: resolvedCompany.company._id,
      adminCompanyId: resolvedCompany.adminCompanyId,
      location,
      salary,
      applicationLink,
      jobType,
      requirements: Array.isArray(requirements) ? requirements : String(requirements || '').split('\n').filter(Boolean),
      responsibilities: Array.isArray(responsibilities) ? responsibilities : String(responsibilities || '').split('\n').filter(Boolean),
      skills: Array.isArray(skills) ? skills : String(skills || '').split(',').map((skill) => skill.trim()).filter(Boolean)
    });

    res.status(201).json({ item: serializeDocument(job) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/companies', async (req, res) => {
  try {
    const {
      name,
      adminCompanyId = '',
      industry = '',
      founded = '',
      headquarters = '',
      description = '',
      website = '',
      logo = ''
    } = req.body;

    if (!String(name || '').trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const company = await Company.create({
      name: String(name).trim(),
      adminCompanyId: normalizeAdminCompanyId(adminCompanyId) || undefined,
      industry: String(industry || '').trim(),
      founded: String(founded || '').trim(),
      headquarters: String(headquarters || '').trim(),
      description: String(description || '').trim(),
      website: String(website || '').trim(),
      logo: typeof logo === 'string' ? logo : '',
      source: 'admin'
    });

    res.status(201).json({ item: serializeDocument(company) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/feed-posts', async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim().slice(0, 5000);
    const authorName = String(req.body?.authorName || req.body?.companyName || 'Admin Company').trim().slice(0, 160);
    const source = String(req.body?.source || '').trim().slice(0, 1000);
    const sourceTitle = String(req.body?.sourceTitle || '').trim().slice(0, 240);
    const mediaUrl = String(req.body?.mediaUrl || '').trim();
    const mediaType = req.body?.mediaType === 'video' ? 'video' : 'image';

    if (!body && !mediaUrl) {
      return res.status(400).json({ error: 'Write something or attach media before posting' });
    }

    const post = await FeedPost.create({
      type: 'work-news',
      body,
      authorId: String(req.body?.authorId || `admin-work-news-${Date.now()}`),
      authorType: 'employer',
      authorName: authorName || 'Admin Company',
      authorAvatar: String(req.body?.authorAvatar || req.body?.companyLogoUrl || ''),
      audience: 'everyone',
      media: mediaUrl ? {
        dataUrl: mediaUrl,
        type: mediaType,
        name: sourceTitle || `${authorName || 'Company'} update media`
      } : null,
      source,
      sourceTitle
    });

    res.status(201).json({ item: serializeDocument(post) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/assistant', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const prompt = createAdminAssistantPrompt({
      message,
      companyForm: req.body?.companyForm || {},
      jobForm: req.body?.jobForm || {}
    });
    const companyForm = req.body?.companyForm || {};
    const lowerMessage = message.toLowerCase();
    const wantsCompanyInfo = /\b(company|business|employer|website|industry|founded|address|headquarters|details|profile)\b/.test(lowerMessage);
    const wantsWebJobs = /\b(latest|recent|web|online|search|find|collect|gradcracker|rate\s*my\s*placement|ratemyplacement|linkedin)\b/.test(lowerMessage)
      && /\b(job|jobs|role|roles|placement|graduate|internship)\b/.test(lowerMessage);
    const wantsJobDrafts = /\b(job|jobs|role|roles|position|positions|vacancy|vacancies|placement|graduate|internship)\b/.test(lowerMessage)
      && /\b(draft|drafts|post|posts|create|make|generate|prepare|fill|collect|find)\b/.test(lowerMessage);
    const wantsGenericPostDrafts = !wantsJobDrafts
      && /\b(post drafts?|social posts?|feed posts?|posts?)\b/.test(lowerMessage)
      && /\b(draft|drafts|create|make|generate|prepare|fill)\b/.test(lowerMessage);
    const wantsWorkNewsDrafts = (wantsGenericPostDrafts || /\b(work\s*news|company updates?|linkedin updates?|feed posts?|company posts?|news posts?)\b/.test(lowerMessage))
      && /\b(draft|drafts|post|posts|create|make|generate|from web|live web|latest|recent|search|find|collect|linkedin|companies?)\b/.test(lowerMessage);
    const requestedJobDraftCount = getRequestedDraftCount(message, wantsJobDrafts || wantsWebJobs);
    const requestedWorkNewsDraftCount = getRequestedDraftCount(message, wantsWorkNewsDrafts);
    const hasMissingCompanyDetails = !companyForm.industry || !companyForm.headquarters || !companyForm.website || !companyForm.founded || !companyForm.description;
    const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false' && (wantsWebJobs || wantsWorkNewsDrafts || (wantsCompanyInfo && hasMissingCompanyDetails));
    const initialDraftKind = requestedJobDraftCount ? 'job' : requestedWorkNewsDraftCount ? 'work-news' : '';
    const initialDraftCount = requestedJobDraftCount || requestedWorkNewsDraftCount;
    const initialPrompt = initialDraftKind
      ? createDraftBatchPrompt({
        basePrompt: prompt,
        kind: initialDraftKind,
        count: Math.min(ADMIN_ASSISTANT_DRAFT_BATCH_SIZE, initialDraftCount),
        batchNumber: 1,
        totalBatches: Math.ceil(initialDraftCount / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE)
      })
      : prompt;
    let aiText = await askAdminOpenAI(initialPrompt, { useWebSearch });
    let parsed = parseJsonObjectFromText(aiText) || createFallbackAdminAssistantPlan(message);
    let jobDrafts = Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts.slice(0, requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];
    let workNewsDrafts = Array.isArray(parsed.workNewsDrafts) ? parsed.workNewsDrafts.slice(0, requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];

    if (requestedJobDraftCount > 1 && !jobDrafts.length && parsed.jobForm && Object.keys(parsed.jobForm).length) {
      jobDrafts = [parsed.jobForm];
    }
    if (requestedWorkNewsDraftCount > 0 && parsed.workNewsDraft && typeof parsed.workNewsDraft === 'object') {
      workNewsDrafts = [...workNewsDrafts, parsed.workNewsDraft];
    }

    if (wantsWebJobs && useWebSearch && !jobDrafts.length && looksLikeWebJobRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      const retryPrompt = `${prompt}

Strict retry:
- The admin requested live web job drafts.
- You must use the web search tool now.
- Return JSON with jobDrafts filled from current search results.
- Do not return a refusal or ask the admin for source/company details.
- If fewer than the requested number are found, return the reliable ones you found.`;
      aiText = await askAdminOpenAI(retryPrompt, { useWebSearch: true });
      parsed = parseJsonObjectFromText(aiText) || parsed;
      jobDrafts = Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts.slice(0, requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];
    }

    if (wantsWorkNewsDrafts && useWebSearch && !workNewsDrafts.length && looksLikeWebWorkNewsRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      const retryPrompt = `${prompt}

Strict retry:
- The admin requested live web Work News drafts.
- You must use the web search tool now.
- Return JSON with workNewsDrafts filled from current company updates, LinkedIn/public social posts, company newsrooms, or official company blogs.
- Do not return a refusal or ask the admin for source/company details.
- If fewer than the requested number are found, return the reliable ones you found.`;
      aiText = await askAdminOpenAI(retryPrompt, { useWebSearch: true });
      parsed = parseJsonObjectFromText(aiText) || parsed;
      workNewsDrafts = Array.isArray(parsed.workNewsDrafts) ? parsed.workNewsDrafts.slice(0, requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];
    }

    if (requestedJobDraftCount > jobDrafts.length) {
      jobDrafts = await generateAdminDraftBatches({
        prompt,
        kind: 'job',
        requestedCount: requestedJobDraftCount,
        useWebSearch,
        seedDrafts: jobDrafts
      });
    }

    if (requestedWorkNewsDraftCount > workNewsDrafts.length) {
      workNewsDrafts = await generateAdminDraftBatches({
        prompt,
        kind: 'work-news',
        requestedCount: requestedWorkNewsDraftCount,
        useWebSearch,
        seedDrafts: workNewsDrafts
      });
    }

    if (wantsWebJobs && !jobDrafts.length && looksLikeWebJobRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable job drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    if (wantsWorkNewsDrafts && !workNewsDrafts.length && looksLikeWebWorkNewsRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable Work News drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    res.json({
      reply: requestedJobDraftCount
        ? `${jobDrafts.length} job draft${jobDrafts.length === 1 ? '' : 's'} ready. Review, edit, and post each one when approved.`
        : requestedWorkNewsDraftCount
          ? `${workNewsDrafts.length} post draft${workNewsDrafts.length === 1 ? '' : 's'} ready. Review, edit, and post each one when approved.`
          : String(parsed.reply || 'I filled what I could. Review the form before creating the record.'),
      action: parsed.action || 'reply',
      companyForm: parsed.companyForm && typeof parsed.companyForm === 'object' ? parsed.companyForm : {},
      jobForm: parsed.jobForm && typeof parsed.jobForm === 'object' ? parsed.jobForm : {},
      jobDrafts,
      workNewsDrafts,
      provider: aiText ? (useWebSearch ? 'openai-web' : 'openai') : 'fallback'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Admin assistant failed' });
  }
});

router.delete('/feed-posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await FeedPost.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Feed post not found' });
    }

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentIndex = comments.findIndex((comment) => String(comment.id || comment._id) === String(commentId));
    const nextComments = comments.filter((comment) => String(comment.id || comment._id) !== String(commentId));

    if (nextComments.length === comments.length) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const deletedComment = comments[commentIndex];
    await DeletedItem.create({
      itemType: 'comment',
      collection: post.type === 'work-news' ? 'workNewsPosts' : 'talentStoryPosts',
      originalId: String(commentId),
      parentId: String(post._id),
      originalIndex: commentIndex,
      label: `Comment by ${String(deletedComment?.authorName || 'JumpTake user')}`,
      data: deletedComment
    });

    post.comments = nextComments;
    post.markModified('comments');
    await post.save();

    res.json({ item: serializeDocument(post) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
