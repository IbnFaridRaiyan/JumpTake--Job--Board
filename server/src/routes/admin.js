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
const JobSeeker = require('../models/JobSeeker');
const User = require('../models/User');
const { generateJumpTakeId } = require('../utils/jumptakeId');
const Employer = require('../models/Employer');
const FeedPost = require('../models/FeedPost');
const Job = require('../models/Job');
const JobBookmark = require('../models/JobBookmark');
const JobInvitation = require('../models/JobInvitation');
const MessageThread = require('../models/MessageThread');
const Notification = require('../models/Notification');
const TalentBookmark = require('../models/TalentBookmark');

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

const normalizeOpenAIImageSources = (images = []) => (Array.isArray(images) ? images : [])
  .map((image) => String(image?.dataUrl || image?.imageUrl || image?.url || image || '').trim())
  .filter((source) => /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/i.test(source) || /^https:\/\//i.test(source))
  .slice(0, 20);

const createResponsesInput = (prompt, images = []) => {
  const imageSources = normalizeOpenAIImageSources(images);
  if (!imageSources.length) return prompt;

  return [{
    role: 'user',
    content: [
      { type: 'input_text', text: prompt },
      ...imageSources.map((imageUrl) => ({ type: 'input_image', image_url: imageUrl, detail: 'low' }))
    ]
  }];
};

const createChatInput = (prompt, images = []) => {
  const imageSources = normalizeOpenAIImageSources(images);
  if (!imageSources.length) return prompt;

  return [
    { type: 'text', text: prompt },
    ...imageSources.map((imageUrl) => ({ type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }))
  ];
};

const askAdminOpenAIWithModel = async ({ apiKey, model, prompt, useWebSearch = false, images = [] }) => {
  try {
    const payload = {
      model,
      input: createResponsesInput(prompt, images),
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
        input: createResponsesInput(prompt, images),
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
      messages: [{ role: 'user', content: createChatInput(prompt, images) }]
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

const askAdminOpenAI = async (prompt, { useWebSearch = false, images = [] } = {}) => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return '';
  }

  let lastError = null;
  const modelCandidates = useWebSearch ? getOpenAISearchModelCandidates() : getOpenAIModelCandidates();
  for (const model of modelCandidates) {
    try {
      const text = await askAdminOpenAIWithModel({ apiKey, model, prompt, useWebSearch, images });
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

const ADMIN_ASSISTANT_MAX_DRAFTS = Math.max(
  100,
  Math.min(Number(process.env.ADMIN_ASSISTANT_MAX_DRAFTS) || 1000, 5000)
);
const ADMIN_ASSISTANT_DRAFT_BATCH_SIZE = 10;

const getRequestedDraftCount = (message, isDraftRequest) => {
  if (!isDraftRequest) return 0;
  const text = String(message || '');
  const explicit = text.match(/\b(\d{1,5})\s+(?:new\s+|latest\s+|recent\s+)?(?:work\s*news\s+|company\s+|social\s+|feed\s+|job\s+)?(?:post\s+)?(?:drafts?|creations?|items?|posts?|updates?|stories?|jobs?)\b/i)
    || text.match(/\b(?:make|create|creation|generate|generation|prepare|fill|draft|collect|find)\s+(\d{1,5})\b/i)
    || text.match(/\b(\d{1,5})\s+(?:jobs?|posts?|updates?|roles?|stories?)\b/i);
  if (explicit?.[1]) {
    return Math.min(ADMIN_ASSISTANT_MAX_DRAFTS, Math.max(1, Number(explicit[1])));
  }
  return /\b(?:drafts|jobs|posts|updates|roles|profiles|candidates|users|pictures|photos|images)\b/i.test(text) ? 5 : 1;
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

  // Models occasionally under-fill large JSON arrays. Retry only the missing
  // portion in small batches so an explicit quantity remains authoritative.
  for (let retryRound = 1; retryRound <= 3 && drafts.length < requestedCount; retryRound += 1) {
    const stillMissing = requestedCount - drafts.length;
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
          const text = await askAdminOpenAI(`${retryPrompt}\nThis is retry round ${retryRound} for missing drafts. Return the full exact array now.`, { useWebSearch });
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

const ADMIN_CANDIDATE_DRAFT_BATCH_SIZE = 5;

const normalizeAdminProfileImages = (images = []) => (Array.isArray(images) ? images : [])
  .slice(0, 20)
  .map((image, index) => {
    const dataUrl = String(image?.dataUrl || image?.imageUrl || image?.url || '').trim();
    const isSupportedDataUrl = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/i.test(dataUrl)
      && dataUrl.length <= 3000000;
    const isSupportedRemoteUrl = /^https:\/\//i.test(dataUrl) && dataUrl.length <= 2048;
    if (!isSupportedDataUrl && !isSupportedRemoteUrl) return null;

    return {
      id: String(image?.id || `profile-image-${index + 1}`),
      name: String(image?.name || `Profile picture ${index + 1}`).slice(0, 180),
      dataUrl
    };
  })
  .filter(Boolean);

const createRandomAdminProfileImages = (count) => {
  const used = new Set();
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const presentation = crypto.randomInt(0, 2) === 0 ? 'men' : 'women';
    let portraitIndex = crypto.randomInt(0, 100);
    let key = `${presentation}-${portraitIndex}`;
    for (let attempt = 0; attempt < 100 && used.has(key); attempt += 1) {
      portraitIndex = (portraitIndex + 1) % 100;
      key = `${presentation}-${portraitIndex}`;
    }
    used.add(key);
    return {
      id: `random-profile-image-${index + 1}`,
      name: `Random profile picture ${index + 1}`,
      dataUrl: `https://randomuser.me/api/portraits/${presentation}/${portraitIndex}.jpg`
    };
  });
};

const candidateFieldText = (value, separator = ', ') => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item || typeof item !== 'object') return String(item || '').trim();
      return [item.institution, item.degree, item.field, item.title, item.company, item.description, item.date]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' - ');
    }).filter(Boolean).join(separator);
  }
  return String(value || '').trim();
};

const createActionBasedTalentStory = (draft = {}) => {
  const role = String(draft.jobTitle || 'professional').trim();
  const skills = candidateFieldText(draft.skills).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 2);
  const achievement = candidateFieldText(draft.achievements, ' ').split(/\n|\.(?:\s|$)/).map((item) => item.trim()).find(Boolean);
  const skillText = skills.length ? ` using ${skills.join(' and ')}` : '';
  const resultText = achievement ? ` The result: ${achievement.replace(/[.!?]+$/, '')}.` : ' The result was a clearer, more reliable workflow for the people using it.';
  return `Today I completed a practical ${role} project${skillText}, working through the main problem from diagnosis to delivery.${resultText}`;
};

const ensureActionBasedTalentStory = (draft = {}) => {
  const body = String(draft.talentStory?.body || draft.storyBody || '').trim();
  const hasConcreteAction = /\b(today|this week|recently|completed|built|created|designed|implemented|launched|solved|fixed|improved|delivered|led|reduced|increased|automated|shipped|earned|achieved|finished|tested|resolved)\b/i.test(body);
  const soundsGeneric = /\b(i love|i enjoy|passionate about|the best (?:campaigns|projects|work)|i believe|always excited|committed to helping)\b/i.test(body);
  return body && hasConcreteAction && !soundsGeneric ? body : createActionBasedTalentStory(draft);
};

const normalizeGeneratedCandidateDraft = (draft = {}, profileImage = null) => ({
  ...draft,
  name: String(draft.name || '').trim(),
  email: String(draft.email || '').trim().toLowerCase(),
  jobTitle: String(draft.jobTitle || '').trim(),
  skills: candidateFieldText(draft.skills),
  education: candidateFieldText(draft.education, '\n'),
  studies: candidateFieldText(draft.studies || draft.degrees || draft.fieldOfStudy, '\n'),
  experience: candidateFieldText(draft.experience, '\n'),
  achievements: candidateFieldText(draft.achievements, '\n'),
  about: String(draft.about || '').trim(),
  profileImage: profileImage?.dataUrl || String(draft.profileImage || '').trim(),
  sourceImageId: profileImage?.id || String(draft.sourceImageId || '').trim(),
  talentStory: {
    ...(draft.talentStory && typeof draft.talentStory === 'object' ? draft.talentStory : {}),
    body: ensureActionBasedTalentStory(draft)
  }
});

const createAdminCandidatePrompt = (message, { includePictures = false, profileImages = [] } = {}) => `You are JumpTake Admin AI. Convert the admin request into JSON that drafts candidate user profiles and their talent story posts.

Return only valid JSON with this shape:
{
  "reply": "short admin-facing reply",
  "userDrafts": [
    {
      "name": "Full name",
      "email": "firstname.lastname@example.com",
      "jobTitle": "Current or target job title",
      "skills": "Comma separated skills",
      "education": ["Institution and qualification"],
      "studies": ["Degree, subject, certification, or focused study"],
      "experience": ["Role, project, or practical experience"],
      "achievements": ["A specific completed result or achievement"],
      "about": "2-3 sentence professional about description for the candidate profile",
      "sourceImageId": "profile-image-1",
      "talentStory": {
        "body": "A specific recent action, solved problem, completed project, or achievement written in the candidate's voice"
      }
    }
  ]
}

Rules:
- Fill only fields that can be inferred from the request.
- If the admin requests a number of profiles, return exactly that many distinct userDrafts.
- Use realistic, varied, believable names and roles across different industries.
- Emails must be lowercase with a plausible unique domain and unique per draft.
- skills is a comma-separated list relevant to the role.
- Generate believable education, studies, experience, skills, and achievements that form one coherent career background.
- about is a concise first-person or third-person professional introduction (2-3 sentences), suitable for a profile "About" section.
- talentStory.body must be a short first-person update about something the candidate did: a project completed today or recently, a problem solved, an improvement delivered, a milestone reached, or an achievement earned.
- Include a concrete action, the method or skill used, and the outcome. Never write a generic passion statement such as "I love helping ideas reach the right audience" or "the best campaigns tell a strong story".${includePictures ? `
- ${profileImages.length} profile picture${profileImages.length === 1 ? ' is' : 's are'} attached to this request in this exact order: ${profileImages.map((image) => image.id).join(', ')}.
- Return one userDraft per attached picture and preserve the matching sourceImageId exactly.
- Inspect each picture to choose a realistic name that fits its apparent masculine or feminine presentation. Treat that visual impression as uncertain, do not state or store a gender classification, and use a gender-neutral name when presentation is unclear.
- The server will retain the exact attached picture as profileImage, so do not invent, replace, or describe the image URL.` : ''}
- Do not include markdown.
- Do not say the profiles or posts were created. Tell the admin the drafts are ready and they should review each card and click Create Profile and Post Talent Story.

Today is ${new Date().toISOString().slice(0, 10)}.
Admin request: ${message}`;

const createCandidateBatchPrompt = ({ basePrompt, count, batchNumber, totalBatches }) => `${basePrompt}

Draft batch instruction (mandatory):
- This is batch ${batchNumber} of ${totalBatches}.
- Return exactly ${count} distinct userDrafts in the JSON array.
- Every userDraft must include its talentStory with a body.
- Do not collapse the drafts into a summary or a single example.
- Every array item must be a complete, separately editable draft using the schema above.
- Keep descriptions concise enough to return all ${count} items.
- The admin will review, edit, and manually create the profiles and posts; do not create anything.`;

const generateAdminCandidateDraftBatches = async ({ message, requestedCount, useWebSearch, includePictures = false, profileImages = [], seedDrafts = [] }) => {
  const drafts = Array.isArray(seedDrafts) ? seedDrafts.slice(0, requestedCount) : [];
  const remaining = requestedCount - drafts.length;
  if (remaining <= 0) {
    return drafts;
  }

  const batchSizes = [];
  for (let left = remaining; left > 0; left -= ADMIN_CANDIDATE_DRAFT_BATCH_SIZE) {
    batchSizes.push(Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, left));
  }

  let nextStartIndex = drafts.length;
  const batches = batchSizes.map((count, index) => {
    const startIndex = nextStartIndex;
    nextStartIndex += count;
    return { count, index, startIndex };
  });

  const results = await Promise.all(batches.map(async ({ count, index, startIndex }) => {
    try {
      const batchImages = profileImages.slice(startIndex, startIndex + count);
      const batchPrompt = createCandidateBatchPrompt({
        basePrompt: createAdminCandidatePrompt(message, { includePictures, profileImages: batchImages }),
        count,
        batchNumber: index + 1,
        totalBatches: batchSizes.length
      });
      const text = await askAdminOpenAI(batchPrompt, { useWebSearch, images: batchImages });
      const parsed = parseJsonObjectFromText(text) || {};
      const rows = Array.isArray(parsed.userDrafts) ? parsed.userDrafts : [];
      return rows.slice(0, count).map((draft, rowIndex) => {
        const matchedImage = batchImages.find((image) => image.id === draft?.sourceImageId) || batchImages[rowIndex];
        return normalizeGeneratedCandidateDraft(draft, matchedImage);
      });
    } catch (error) {
      console.warn(`[ADMIN ASSISTANT] candidate draft batch ${index + 1} failed:`, error.message);
      return [];
    }
  }));

  drafts.push(...results.flat());

  for (let retryRound = 1; retryRound <= 3 && drafts.length < requestedCount; retryRound += 1) {
    const stillMissing = requestedCount - drafts.length;
    const retryResults = await Promise.all(Array.from(
      { length: Math.ceil(stillMissing / ADMIN_CANDIDATE_DRAFT_BATCH_SIZE) },
      async (_, index) => {
        const count = Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, stillMissing - (index * ADMIN_CANDIDATE_DRAFT_BATCH_SIZE));
        const startIndex = drafts.length + (index * ADMIN_CANDIDATE_DRAFT_BATCH_SIZE);
        const batchImages = profileImages.slice(startIndex, startIndex + count);
        const retryPrompt = createCandidateBatchPrompt({
          basePrompt: createAdminCandidatePrompt(message, { includePictures, profileImages: batchImages }),
          count,
          batchNumber: index + 1,
          totalBatches: Math.ceil(stillMissing / ADMIN_CANDIDATE_DRAFT_BATCH_SIZE)
        });
        try {
          const text = await askAdminOpenAI(`${retryPrompt}\nThis is retry round ${retryRound} for missing drafts. Return the full exact array now.`, { useWebSearch, images: batchImages });
          const parsed = parseJsonObjectFromText(text) || {};
          const rows = Array.isArray(parsed.userDrafts) ? parsed.userDrafts : [];
          return rows.slice(0, count).map((draft, rowIndex) => {
            const matchedImage = batchImages.find((image) => image.id === draft?.sourceImageId) || batchImages[rowIndex];
            return normalizeGeneratedCandidateDraft(draft, matchedImage);
          });
        } catch (error) {
          console.warn(`[ADMIN ASSISTANT] candidate retry batch ${index + 1} failed:`, error.message);
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

router.post('/collections/:collection/bulk-delete', async (req, res) => {
  try {
    const { collection } = req.params;
    const config = getCollectionConfig(collection);
    const deleteAll = req.body?.deleteAll === true;
    const requestedIds = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.map((id) => String(id || '').trim()).filter(mongoose.isValidObjectId))]
      : [];

    if (!deleteAll && !requestedIds.length) {
      return res.status(400).json({ error: 'Select at least one record to delete' });
    }

    const query = {
      ...(config.baseQuery || {}),
      ...(!deleteAll ? { _id: { $in: requestedIds } } : {})
    };
    const records = await config.model.find(query);
    if (!records.length) {
      return res.json({ ok: true, deletedCount: 0, recoverable: true });
    }

    await DeletedItem.insertMany(records.map((record) => ({
      itemType: 'record',
      collection,
      originalId: String(record._id),
      label: getDeletedItemLabel(record),
      data: record.toObject({ depopulate: true })
    })));
    const result = await config.model.deleteMany({ _id: { $in: records.map((record) => record._id) } });

    res.json({ ok: true, deletedCount: result.deletedCount || records.length, recoverable: true });
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

const normalizeListField = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item && typeof item === 'object') {
        return [candidateFieldText([item], '')];
      }
      return String(item || '').split(/[\n,;]+/);
    }).map((item) => item.trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const createTemporaryPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

const createUniqueCandidateEmail = async (name, requestedEmail = '') => {
  let email = String(requestedEmail || '').trim().toLowerCase();
  if (!email) {
    const base = String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
      || 'candidate';
    email = `${base}${Math.floor(100 + Math.random() * 900)}@jumptake-demo.com`;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const existing = await User.exists({ email });
    if (!existing) {
      return email;
    }
    if (/(\d+)@/.test(email)) {
      email = email.replace(/(\d+)@/, `${Math.floor(100 + Math.random() * 900)}@`);
    } else {
      const [localPart, ...domainParts] = email.split('@');
      email = `${localPart}${Math.floor(100 + Math.random() * 900)}@${domainParts.join('@')}`;
    }
  }

  return email;
};

router.post('/candidates', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Candidate name is required' });
    }

    const email = await createUniqueCandidateEmail(name, req.body?.email);
    const requestedPassword = String(req.body?.password || '').trim();
    const generatedPassword = requestedPassword ? '' : createTemporaryPassword();
    const password = requestedPassword || generatedPassword;

    const about = String(req.body?.about || '').trim().slice(0, 5000);
    const coverImage = String(req.body?.coverImage || '').trim();
    const profileImage = String(req.body?.profileImage || '').trim();
    const skills = normalizeListField(req.body?.skills);
    const jobInterests = normalizeListField(req.body?.jobInterests);
    const education = normalizeListField(req.body?.education);
    const degrees = normalizeListField(req.body?.studies || req.body?.degrees);
    const experience = normalizeListField(req.body?.experience);
    const achievements = normalizeListField(req.body?.achievements);

    const jumptakeId = await generateJumpTakeId(name);
    const user = await User.create({ email, password, jumptakeId, jobInterests });

    const jobSeeker = await JobSeeker.create({
      user: user._id,
      name,
      email,
      coverImage,
      profileImage,
      about,
      resumeText: about,
      skills,
      education,
      degrees,
      experience,
      achievements,
      loginUsername: name.toLowerCase().trim().replace(/\s+/g, '-') || `candidate-${user._id}`
    });

    user.jobSeekerId = jobSeeker._id;
    await user.save();

    res.status(201).json({
      message: 'Candidate user created successfully',
      generatedPassword: generatedPassword || undefined,
      user: {
        id: user._id,
        email: user.email,
        jumptakeId: user.jumptakeId,
        jobSeekerId: user.jobSeekerId
      },
      jobSeeker: {
        id: jobSeeker._id,
        name: jobSeeker.name,
        email: jobSeeker.email,
        coverImage: jobSeeker.coverImage,
        profileImage: jobSeeker.profileImage,
        about: jobSeeker.about,
        education: jobSeeker.education,
        degrees: jobSeeker.degrees,
        experience: jobSeeker.experience,
        skills: jobSeeker.skills,
        achievements: jobSeeker.achievements
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/talent-stories', async (req, res) => {
  try {
    const authorName = String(req.body?.authorName || req.body?.name || '').trim();
    const body = String(req.body?.body || req.body?.about || '').trim();
    const authorAvatar = String(req.body?.authorAvatar || req.body?.profileImage || req.body?.coverImage || req.body?.coverPhoto || '').trim();
    const authorId = String(req.body?.authorId || '').trim();

    if (!authorName && !body && !authorAvatar) {
      return res.status(400).json({ error: 'Candidate name, story text, or cover photo is required' });
    }

    const media = req.body?.media && typeof req.body.media === 'object' && String(req.body.media.dataUrl || '').trim()
      ? {
          dataUrl: String(req.body.media.dataUrl).trim(),
          type: req.body.media.type === 'video' ? 'video' : 'image',
          name: String(req.body.media.name || 'Candidate story attachment').slice(0, 180)
        }
      : null;

    const post = await FeedPost.create({
      type: 'talent-story',
      body: body.slice(0, 5000),
      authorId: authorId || `admin-talent-story-${Date.now()}`,
      authorType: 'candidate',
      authorName: authorName || 'JumpTake User',
      authorAvatar,
      audience: 'everyone',
      media
    });

    res.status(201).json({ item: serializeDocument(post) });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.delete('/deleted-items/:id/permanent', async (req, res) => {
  try {
    const existing = await DeletedItem.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deleted item not found' });
    }

    await DeletedItem.findByIdAndDelete(req.params.id);

    res.json({ ok: true, permanentlyDeleted: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deleted-items/bulk-permanent', async (req, res) => {
  try {
    const deleteAll = req.body?.deleteAll === true;
    const requestedIds = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.map((id) => String(id || '').trim()).filter(mongoose.isValidObjectId))]
      : [];

    if (!deleteAll && !requestedIds.length) {
      return res.status(400).json({ error: 'Select at least one deleted item' });
    }

    const result = await DeletedItem.deleteMany(deleteAll ? {} : { _id: { $in: requestedIds } });
    res.json({ ok: true, permanentlyDeletedCount: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const uploadedProfileImages = normalizeAdminProfileImages(req.body?.profileImages);
    const lowerMessage = message.toLowerCase();
    const wantsCompanyInfo = /\b(company|business|employer|website|industry|founded|address|headquarters|details|profile)\b/.test(lowerMessage);
    const wantsWebJobs = /\b(latest|recent|web|online|search|find|collect|gradcracker|rate\s*my\s*placement|ratemyplacement|linkedin)\b/.test(lowerMessage)
      && /\b(job|jobs|role|roles|placement|graduate|internship)\b/.test(lowerMessage);
    const wantsJobDrafts = /\b(job|jobs|role|roles|position|positions|vacancy|vacancies|placement|graduate|internship)\b/.test(lowerMessage)
      && /\b(draft|drafts|post|posts|create|creates|creation|creations|make|generate|generation|prepare|fill|collect|find)\b/.test(lowerMessage);
    const wantsCandidateDrafts = !wantsJobDrafts
      && (uploadedProfileImages.length > 0 || /\b(candidate|candidates|users?|user profiles?|job seekers?|talent profiles?|talent stories?|people|profiles? of users?|draft profiles?|talent members?)\b/.test(lowerMessage))
      && /\b(draft|drafts|create|creates|creation|creations|make|generate|generation|prepare|collect)\b/.test(lowerMessage)
      && /\b(profile|profiles|user|users|candidate|candidates|talent story|talent stories|story|stories|post|posts)\b/.test(lowerMessage);
    const wantsCandidateProfilePictures = wantsCandidateDrafts
      && (uploadedProfileImages.length > 0 || !/\b(without|no)\s+(?:profile\s+)?(?:pictures?|photos?|images?|headshots?)\b/.test(lowerMessage));
    const wantsGenericPostDrafts = !wantsJobDrafts && !wantsCandidateDrafts
      && /\b(post drafts?|post creations?|social posts?|feed posts?|posts?|stories?)\b/.test(lowerMessage)
      && /\b(draft|drafts|create|creates|creation|creations|make|generate|generation|prepare|fill)\b/.test(lowerMessage);
    const wantsWorkNewsDrafts = (wantsGenericPostDrafts || /\b(work\s*news|company updates?|linkedin updates?|feed posts?|company posts?|news posts?)\b/.test(lowerMessage))
      && /\b(draft|drafts|post|posts|create|make|generate|from web|live web|latest|recent|search|find|collect|linkedin|companies?)\b/.test(lowerMessage);
    const requestedJobDraftCount = getRequestedDraftCount(message, wantsJobDrafts || wantsWebJobs);
    const requestedWorkNewsDraftCount = getRequestedDraftCount(message, wantsWorkNewsDrafts);
    const requestedCandidateDraftCount = wantsCandidateDrafts
      ? Math.max(getRequestedDraftCount(message, true), uploadedProfileImages.length)
      : 0;
    const randomProfileImageCount = wantsCandidateProfilePictures
      ? Math.max(0, requestedCandidateDraftCount - uploadedProfileImages.length)
      : 0;
    const candidateProfileImages = [
      ...uploadedProfileImages,
      ...createRandomAdminProfileImages(randomProfileImageCount)
    ];
    const initialCandidateImages = candidateProfileImages.slice(0, Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, requestedCandidateDraftCount));
    const candidatePrompt = wantsCandidateDrafts
      ? createAdminCandidatePrompt(message, {
        includePictures: wantsCandidateProfilePictures,
        profileImages: initialCandidateImages
      })
      : prompt;
    const hasMissingCompanyDetails = !companyForm.industry || !companyForm.headquarters || !companyForm.website || !companyForm.founded || !companyForm.description;
    const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false'
      && (wantsWebJobs || wantsWorkNewsDrafts || (!wantsCandidateDrafts && wantsCompanyInfo && hasMissingCompanyDetails));
    const initialDraftKind = requestedCandidateDraftCount ? 'candidate' : requestedJobDraftCount ? 'job' : requestedWorkNewsDraftCount ? 'work-news' : '';
    const initialDraftCount = requestedCandidateDraftCount || requestedJobDraftCount || requestedWorkNewsDraftCount;
    const initialPrompt = initialDraftKind === 'candidate'
      ? createCandidateBatchPrompt({
        basePrompt: candidatePrompt,
        count: Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, requestedCandidateDraftCount),
        batchNumber: 1,
        totalBatches: Math.ceil(requestedCandidateDraftCount / ADMIN_CANDIDATE_DRAFT_BATCH_SIZE)
      })
      : initialDraftKind
        ? createDraftBatchPrompt({
          basePrompt: prompt,
          kind: initialDraftKind,
          count: Math.min(ADMIN_ASSISTANT_DRAFT_BATCH_SIZE, initialDraftCount),
          batchNumber: 1,
          totalBatches: Math.ceil(initialDraftCount / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE)
        })
        : prompt;
    let aiText = await askAdminOpenAI(initialPrompt, {
      useWebSearch,
      images: initialDraftKind === 'candidate' ? initialCandidateImages : []
    });
    let parsed = parseJsonObjectFromText(aiText) || createFallbackAdminAssistantPlan(message);
    let jobDrafts = Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts.slice(0, requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];
    let workNewsDrafts = Array.isArray(parsed.workNewsDrafts) ? parsed.workNewsDrafts.slice(0, requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS) : [];
    let userDrafts = Array.isArray(parsed.userDrafts)
      ? parsed.userDrafts
        .slice(0, requestedCandidateDraftCount || ADMIN_CANDIDATE_DRAFT_BATCH_SIZE)
        .map((draft, index) => {
          const matchedImage = initialCandidateImages.find((image) => image.id === draft?.sourceImageId) || initialCandidateImages[index];
          return normalizeGeneratedCandidateDraft(draft, matchedImage);
        })
      : [];

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

    if (requestedCandidateDraftCount > userDrafts.length) {
      userDrafts = await generateAdminCandidateDraftBatches({
        message,
        requestedCount: requestedCandidateDraftCount,
        useWebSearch,
        includePictures: wantsCandidateProfilePictures,
        profileImages: candidateProfileImages,
        seedDrafts: userDrafts
      });
    }

    if (wantsWebJobs && !jobDrafts.length && looksLikeWebJobRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable job drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    if (wantsWorkNewsDrafts && !workNewsDrafts.length && looksLikeWebWorkNewsRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable Work News drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    res.json({
      reply: requestedCandidateDraftCount
        ? `${userDrafts.length} candidate profile draft${userDrafts.length === 1 ? '' : 's'} ready, each with a talent story post. Review, edit, and create each one when approved.`
        : requestedJobDraftCount
          ? `${jobDrafts.length} job draft${jobDrafts.length === 1 ? '' : 's'} ready. Review, edit, and post each one when approved.`
          : requestedWorkNewsDraftCount
            ? `${workNewsDrafts.length} post draft${workNewsDrafts.length === 1 ? '' : 's'} ready. Review, edit, and post each one when approved.`
            : String(parsed.reply || 'I filled what I could. Review the form before creating the record.'),
      action: requestedCandidateDraftCount ? 'draftTalentProfiles' : (parsed.action || 'reply'),
      companyForm: parsed.companyForm && typeof parsed.companyForm === 'object' ? parsed.companyForm : {},
      jobForm: parsed.jobForm && typeof parsed.jobForm === 'object' ? parsed.jobForm : {},
      jobDrafts,
      workNewsDrafts,
      userDrafts,
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
