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
const { generateJumpTakeId, generateCompanyJumpTakeId, ensureCompanyJumpTakeId } = require('../utils/jumptakeId');
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
    searchFields: ['name', 'jumptakeId', 'adminCompanyId', 'industry', 'headquarters', 'description', 'website'],
    summaryFields: ['name', 'jumptakeId', 'adminCompanyId', 'industry', 'headquarters', 'website', 'createdAt']
  },
  jobs: {
    label: 'Job Posts',
    model: Job,
    searchFields: ['title', 'description', 'location', 'sector', 'salary', 'jobType', 'jobNumber', 'adminCompanyId'],
    summaryFields: ['title', 'jobNumber', 'adminCompanyId', 'location', 'sector', 'jobType', 'salary', 'active', 'company', 'applicationLink', 'applicationDeadline', 'sourceStatus', 'sourceVerifiedAt', 'createdAt']
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
    summaryFields: ['type', 'authorName', 'authorType', 'body', 'audience', 'reach', 'source', 'sourceTitle', 'comments.id', 'comments._id', 'comments.authorName', 'comments.text', 'createdAt']
  },
  workNewsPosts: {
    label: 'Work News Posts',
    model: FeedPost,
    baseQuery: { type: 'work-news' },
    searchFields: ['body', 'authorId', 'authorName', 'source', 'sourceTitle'],
    summaryFields: ['type', 'authorName', 'authorType', 'body', 'audience', 'reach', 'source', 'sourceTitle', 'comments.id', 'comments._id', 'comments.authorName', 'comments.text', 'createdAt']
  },
  talentStoryPosts: {
    label: 'Talent Stories / Talent Pool Posts',
    model: FeedPost,
    baseQuery: { type: 'talent-story' },
    searchFields: ['body', 'authorId', 'authorName'],
    summaryFields: ['type', 'authorName', 'authorType', 'body', 'audience', 'reach', 'comments.id', 'comments._id', 'comments.authorName', 'comments.text', 'createdAt']
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
      await ensureCompanyJumpTakeId(existingByObjectId);
      return {
        company: existingByObjectId,
        adminCompanyId: existingByObjectId.adminCompanyId || requestedCompanyId
      };
    }

    const createdWithObjectId = await Company.create({
      _id: requestedCompanyId,
      name: fallbackName || createCompanyNameFromAdminId(requestedCompanyId),
      adminCompanyId: requestedCompanyId,
      jumptakeId: await generateCompanyJumpTakeId(fallbackName || createCompanyNameFromAdminId(requestedCompanyId)),
      source: 'admin'
    });

    return {
      company: createdWithObjectId,
      adminCompanyId: requestedCompanyId
    };
  }

  const existingByAdminId = await Company.findOne({ adminCompanyId: requestedCompanyId });
  if (existingByAdminId) {
    await ensureCompanyJumpTakeId(existingByAdminId);
    return {
      company: existingByAdminId,
      adminCompanyId: requestedCompanyId
    };
  }

  const created = await Company.create({
    name: fallbackName || createCompanyNameFromAdminId(requestedCompanyId),
    adminCompanyId: requestedCompanyId,
    jumptakeId: await generateCompanyJumpTakeId(fallbackName || createCompanyNameFromAdminId(requestedCompanyId)),
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
  const quantityNouns = '(?:job\\s+posts?|jobs?|posts?|drafts?|updates?|roles?|stories?|companies|businesses|employers|candidates?|users?|profiles?|items?|creations?)';
  const explicitPatterns = [
    /\b(\d{1,5})\s+(?:new\s+|latest\s+|recent\s+)?(?:work\s*news\s+|company\s+|social\s+|feed\s+|job\s+|candidate\s+|user\s+|profile\s+|talent\s+)?(?:post\s+)?(?:drafts?|creations?|items?|posts?|updates?|stories?|jobs?|companies|businesses|employers|candidates?|users?|profiles?)\b/i,
    /\b(?:make|create|creation|generate|generation|prepare|fill|draft|collect|find)\s+(\d{1,5})\b/i,
    /\b(\d{1,5})\s+(?:jobs?|posts?|updates?|roles?|stories?|companies|businesses|employers|candidates?|users?|profiles?)\b/i,
    new RegExp(`\\b(?:make|create|generate|prepare|draft|collect|find)\\b[^\\d]{0,70}\\b(\\d{1,5})\\b`, 'i'),
    new RegExp(`\\b${quantityNouns}\\b[^\\d]{0,48}\\b(\\d{1,5})\\b`, 'i'),
    new RegExp(`\\b(\\d{1,5})\\b[^\\d]{0,48}\\b${quantityNouns}\\b`, 'i')
  ];
  const explicit = explicitPatterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (explicit?.[1]) {
    return Math.min(ADMIN_ASSISTANT_MAX_DRAFTS, Math.max(1, Number(explicit[1])));
  }
  return /\b(?:drafts|jobs|posts|updates|roles|profiles|companies|businesses|employers|candidates|users|pictures|photos|images)\b/i.test(text) ? 5 : 1;
};

const hasVagueWorkNewsLead = (draft = {}) => {
  const body = String(draft?.body || '').trim();
  return !body
    || /\b(?:published|shared|posted|released|issued)\s+(?:a|an|its|their)?\s*(?:company\s+)?(?:update|post|article|report|announcement)\s+(?:about|on|covering)\b/i.test(body)
    || /\b(?:announced|highlighted)\s+(?:an?|its|their)?\s*(?:update|news|work)\s+(?:about|on|across)\b/i.test(body)
    || /\bongoing work across\b|\bannual reporting materials\b/i.test(body);
};

const normalizeWorkNewsDraftRows = (rows, count, { requireSource = true } = {}) => (Array.isArray(rows) ? rows : [])
  .map((draft) => ({
    ...draft,
    companyId: String(draft?.companyId || '').trim(),
    companyJumpTakeId: String(draft?.companyJumpTakeId || draft?.jumptakeId || '').trim().replace(/^@/, '').toLowerCase(),
    companyName: String(draft?.companyName || '').trim(),
    body: String(draft?.body || '').trim(),
    source: String(draft?.source || '').trim(),
    sourceTitle: String(draft?.sourceTitle || '').trim()
  }))
  .filter((draft) => !hasVagueWorkNewsLead(draft) && (!requireSource || /^https?:\/\//i.test(draft.source)))
  .slice(0, count);

const normalizeCompanyDraftJumpTakeId = (value = '', name = 'company') => {
  const requested = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requested) && requested.length >= 3) return requested;

  const prefix = String(name || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'company';
  return `${prefix}-${crypto.randomInt(1000, 10000)}`;
};

const normalizeCompanyDraftRows = (rows, count) => {
  const used = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((draft, index) => {
      const name = String(draft?.name || '').trim();
      if (!name) return null;
      let jumptakeId = normalizeCompanyDraftJumpTakeId(draft?.jumptakeId, name);
      while (used.has(jumptakeId)) {
        jumptakeId = normalizeCompanyDraftJumpTakeId('', name);
      }
      used.add(jumptakeId);
      return {
        name,
        jumptakeId,
        adminCompanyId: String(draft?.adminCompanyId || `company-${jumptakeId}`).trim(),
        industry: String(draft?.industry || '').trim(),
        headquarters: String(draft?.headquarters || '').trim(),
        website: String(draft?.website || '').trim(),
        founded: String(draft?.founded || '').trim(),
        description: String(draft?.description || '').trim(),
        logo: String(draft?.logo || '').trim(),
        id: String(draft?.id || `company-draft-${Date.now()}-${index}`)
      };
    })
    .filter(Boolean)
    .slice(0, count);
};

const FALLBACK_COMPANY_PREFIXES = [
  'Northstar', 'BrightPath', 'Evergreen', 'Atlas', 'BluePeak',
  'NovaBridge', 'Clearwater', 'Cedar', 'Horizon', 'Keystone'
];
const FALLBACK_COMPANY_SUFFIXES = [
  'Systems', 'Health', 'Finance', 'Learning', 'Retail',
  'Logistics', 'Energy', 'Media', 'Works', 'Analytics'
];
const FALLBACK_COMPANY_INDUSTRIES = [
  'Technology', 'Healthcare', 'Financial Services', 'Education', 'Retail',
  'Logistics', 'Clean Energy', 'Media', 'Professional Services', 'Data Analytics'
];
const FALLBACK_COMPANY_LOCATIONS = [
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Leeds, UK', 'Bristol, UK',
  'Edinburgh, UK', 'Glasgow, UK', 'Cardiff, UK', 'Belfast, UK', 'Cambridge, UK'
];

const createFallbackCompanyDraft = (index) => {
  const prefix = FALLBACK_COMPANY_PREFIXES[index % FALLBACK_COMPANY_PREFIXES.length];
  const suffixIndex = Math.floor(index / FALLBACK_COMPANY_PREFIXES.length) % FALLBACK_COMPANY_SUFFIXES.length;
  const suffix = FALLBACK_COMPANY_SUFFIXES[suffixIndex];
  const cycle = Math.floor(index / (FALLBACK_COMPANY_PREFIXES.length * FALLBACK_COMPANY_SUFFIXES.length));
  const name = `${prefix} ${suffix}${cycle ? ` ${cycle + 1}` : ''}`;
  const industry = FALLBACK_COMPANY_INDUSTRIES[suffixIndex];

  return {
    name,
    jumptakeId: normalizeCompanyDraftJumpTakeId('', name),
    adminCompanyId: `company-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
    industry,
    headquarters: FALLBACK_COMPANY_LOCATIONS[index % FALLBACK_COMPANY_LOCATIONS.length],
    website: '',
    founded: String(2005 + (index % 20)),
    description: `${name} develops practical ${industry.toLowerCase()} services for growing organisations, with a focus on measurable delivery, dependable support, and long-term customer outcomes.`,
    logo: ''
  };
};

const attachWorkNewsDraftCompanies = async (drafts) => {
  if (!Array.isArray(drafts) || !drafts.length) return [];
  const companies = await Company.find({}).sort({ createdAt: -1 }).limit(500);
  await Promise.all(companies.map(async (company) => {
    try {
      await ensureCompanyJumpTakeId(company);
    } catch (error) {
      console.warn(`[ADMIN ASSISTANT] Could not assign company JumpTake ID for ${company._id}:`, error.message);
    }
  }));

  const byId = new Map(companies.map((company) => [String(company._id), company]));
  const byJumpTakeId = new Map(companies.map((company) => [String(company.jumptakeId || '').toLowerCase(), company]));
  const byName = new Map(companies.map((company) => [String(company.name || '').trim().toLowerCase(), company]));

  return drafts.map((draft) => {
    const company = byId.get(String(draft.companyId || ''))
      || byJumpTakeId.get(String(draft.companyJumpTakeId || '').replace(/^@/, '').toLowerCase())
      || byName.get(String(draft.companyName || '').trim().toLowerCase());
    if (!company) return draft;
    return {
      ...draft,
      companyId: String(company._id),
      companyJumpTakeId: company.jumptakeId || '',
      companyName: company.name || draft.companyName,
      companyLogoUrl: company.logo || draft.companyLogoUrl || ''
    };
  });
};

const LIVE_JOB_VERIFICATION_BATCH_SIZE = 8;
const LIVE_JOB_VERIFICATION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const normalizeHttpUrl = (value = '') => {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
};

const ROLE_SPECIFIC_QUERY_KEYS = new Set([
  'gh_jid', 'jobid', 'job_id', 'job', 'jid', 'jk', 'postingid',
  'posting_id', 'requisitionid', 'requisition_id', 'reqid', 'req_id', 'vacancyid'
]);

const isLikelyGenericJobLandingUrl = (value = '') => {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return true;

  const url = new URL(normalized);
  const hasRoleSpecificQuery = [...url.searchParams.keys()]
    .some((key) => ROLE_SPECIFIC_QUERY_KEYS.has(String(key).toLowerCase()));
  if (hasRoleSpecificQuery) return false;

  let decodedPath = url.pathname || '/';
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch (error) {
    // Keep the encoded path; malformed escapes should not crash a draft batch.
  }
  const path = decodedPath.replace(/\/+$/, '').toLowerCase();
  const segments = path.split('/').filter(Boolean);
  const withoutLocale = segments.filter((segment, index) => !(
    index === 0 && /^[a-z]{2}(?:-[a-z]{2})?$/.test(segment)
  ));
  const genericPath = withoutLocale.join('/');

  if (!genericPath) return true;
  if (/^(?:careers?|jobs?|vacancies|opportunities|open-roles?|positions|join-us|work-with-us|job-search|search)(?:\/(?:search|all|openings|jobs|roles|positions))?$/.test(genericPath)) {
    return true;
  }
  if (/(?:^|\/)(?:job-search|jobs-search|search-jobs|search|all-jobs|job-listings|open-positions|open-roles)$/.test(genericPath)) {
    return true;
  }

  const host = url.hostname.toLowerCase();
  if (host === 'jobs.lever.co' && withoutLocale.length < 2) return true;
  if (host === 'boards.greenhouse.io' && withoutLocale.length < 3) return true;
  if (host === 'jobs.smartrecruiters.com' && withoutLocale.length < 2) return true;
  if (host === 'apply.workable.com' && !withoutLocale.includes('j')) return true;

  return false;
};

const normalizeApplicationDeadline = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const directIsoDate = raw.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  const parsed = new Date(directIsoDate ? `${directIsoDate}T12:00:00.000Z` : raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);
const isCurrentApplicationDeadline = (value) => !value || value >= getTodayIsoDate();

const getLiveJobVerificationSecret = () => String(
  process.env.JWT_SECRET || process.env.ADMIN_ACCESS_KEY || ''
).trim();

const createLiveJobVerificationToken = ({ url, sourceUrl, applicationDeadline, verifiedAt }) => {
  const secret = getLiveJobVerificationSecret();
  if (!secret) return '';
  return crypto
    .createHmac('sha256', secret)
    .update(`${normalizeHttpUrl(url)}\n${normalizeHttpUrl(sourceUrl || url)}\n${normalizeApplicationDeadline(applicationDeadline)}\n${verifiedAt}`)
    .digest('hex');
};

const hasValidLiveJobVerification = ({ url, sourceUrl, applicationDeadline, verifiedAt, token }) => {
  const verifiedTime = new Date(verifiedAt).getTime();
  if (!Number.isFinite(verifiedTime) || Date.now() - verifiedTime > LIVE_JOB_VERIFICATION_MAX_AGE_MS || verifiedTime > Date.now() + 60000) {
    return false;
  }

  const expected = createLiveJobVerificationToken({ url, sourceUrl, applicationDeadline, verifiedAt });
  const supplied = String(token || '').trim();
  if (!expected || expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
};

const normalizeLiveJobDraftRows = (rows, count) => {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((draft, index) => {
      const requestedApplicationLink = normalizeHttpUrl(draft?.applicationLink || draft?.source);
      const requestedSource = normalizeHttpUrl(draft?.source || requestedApplicationLink);
      const source = isLikelyGenericJobLandingUrl(requestedSource) ? requestedApplicationLink : requestedSource;
      const applicationLink = isLikelyGenericJobLandingUrl(requestedApplicationLink) ? source : requestedApplicationLink;
      const companyName = String(draft?.companyName || '').trim();
      const title = String(draft?.title || '').trim();
      const dedupeKey = `${applicationLink.toLowerCase()}|${companyName.toLowerCase()}|${title.toLowerCase()}`;
      if (!applicationLink
        || !source
        || isLikelyGenericJobLandingUrl(applicationLink)
        || isLikelyGenericJobLandingUrl(source)
        || !companyName
        || !title
        || seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      return {
        ...draft,
        verificationId: `job-${index + 1}`,
        company: String(draft?.company || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim(),
        companyName,
        title,
        applicationLink,
        source,
        applicationDeadline: normalizeApplicationDeadline(draft?.applicationDeadline)
      };
    })
    .filter(Boolean)
    .slice(0, count);
};

const createLiveJobVerificationPrompt = (drafts) => `You are JumpTake's live-job verifier. Independently verify every candidate job below using web search, its claimed role page, and its claimed application URL.

Today is ${getTodayIsoDate()}.

Return only valid JSON in this exact shape:
{
  "verifiedJobs": [
    {
      "verificationId": "job-1",
      "pageExists": true,
      "titleAndCompanyMatch": true,
      "acceptingApplications": true,
      "exactRolePage": true,
      "applyActionAvailable": true,
      "applyUrlBelongsToRole": true,
      "rolePageUrl": "https://exact-role-detail-page",
      "applyUrl": "https://exact-application-or-apply-button-destination",
      "deadlineStatus": "future" | "today" | "not-published" | "past" | "unknown",
      "applicationDeadline": "YYYY-MM-DD or empty",
      "reason": "short factual reason"
    }
  ]
}

Mandatory verification rules:
- Open and inspect each claimedRolePage and applicationLink. Do not rely only on a search-result snippet.
- Follow redirects and inspect the final page. pageExists is false for 404/410 pages, removed or deleted listings, "job not found", "no longer available", generic careers home pages, job search/list pages, and redirects that do not show the exact role.
- titleAndCompanyMatch is true only when the page is for the supplied title and company.
- exactRolePage is true only when rolePageUrl is the canonical detail page for this one supplied role. A company careers home page, department page, all-jobs page, search page, or filtered results page is never an exact role page.
- Inspect the exact role page's Apply, Apply now, Submit application, or equivalent action. Return its final navigable destination in applyUrl after following redirects. Do not return a general careers or all-jobs URL.
- applyActionAvailable and applyUrlBelongsToRole are true only when that Apply action is currently enabled and its destination is specifically tied to the supplied title and company.
- applyUrl may equal rolePageUrl only if the application form is embedded on that exact role page or the Apply action has no separate navigable URL.
- acceptingApplications is true only when the page currently presents the role as open and accepting applications. Closed, filled, archived, expired, or unverifiable roles are false.
- Read the closing/deadline date from the source. Convert a published date to YYYY-MM-DD. Never infer or invent one.
- Use deadlineStatus not-published when the source has no closing date; that candidate will be excluded because JumpTake requires a published, ongoing deadline for AI-imported jobs.
- Any deadline before today is past and acceptingApplications must be false.
- A passing job must have deadlineStatus future or today and a real published applicationDeadline. Never infer or invent a deadline to make a role pass.
- When access or status is ambiguous, use unknown and acceptingApplications false.
- Return one result for every supplied verificationId. Never introduce a different job to make a candidate pass.

Candidate jobs:
${JSON.stringify(drafts.map((draft) => ({
  verificationId: draft.verificationId,
  title: draft.title,
  companyName: draft.companyName,
  claimedRolePage: draft.source,
  applicationLink: draft.applicationLink,
  claimedDeadline: draft.applicationDeadline
})))}`;

const verifyAdminLiveJobDrafts = async (rows, count) => {
  const drafts = normalizeLiveJobDraftRows(rows, count);
  if (!drafts.length || !getOpenAIApiKey() || !getLiveJobVerificationSecret()) return [];

  const batches = [];
  for (let index = 0; index < drafts.length; index += LIVE_JOB_VERIFICATION_BATCH_SIZE) {
    batches.push(drafts.slice(index, index + LIVE_JOB_VERIFICATION_BATCH_SIZE));
  }

  const verifiedBatches = await Promise.all(batches.map(async (batch, batchIndex) => {
    try {
      const responseText = await askAdminOpenAI(createLiveJobVerificationPrompt(batch), { useWebSearch: true });
      const parsed = parseJsonObjectFromText(responseText) || {};
      const verificationRows = Array.isArray(parsed.verifiedJobs) ? parsed.verifiedJobs : [];
      const verificationById = new Map(verificationRows.map((row) => [String(row?.verificationId || ''), row]));

      return batch.map((draft) => {
        const verification = verificationById.get(draft.verificationId);
        if (!verification
          || verification.pageExists !== true
          || verification.titleAndCompanyMatch !== true
          || verification.acceptingApplications !== true
          || verification.exactRolePage !== true
          || verification.applyActionAvailable !== true
          || verification.applyUrlBelongsToRole !== true
          || !['future', 'today'].includes(verification.deadlineStatus)) {
          return null;
        }

        const rolePageUrl = normalizeHttpUrl(verification.rolePageUrl);
        const applyUrl = normalizeHttpUrl(verification.applyUrl);
        if (!rolePageUrl
          || !applyUrl
          || isLikelyGenericJobLandingUrl(rolePageUrl)
          || isLikelyGenericJobLandingUrl(applyUrl)) {
          return null;
        }

        const applicationDeadline = normalizeApplicationDeadline(verification.applicationDeadline);
        if (!applicationDeadline) return null;
        if (!isCurrentApplicationDeadline(applicationDeadline)) return null;

        const liveVerifiedAt = new Date().toISOString();
        return {
          ...draft,
          source: rolePageUrl,
          applicationLink: applyUrl,
          applicationDeadline,
          liveVerifiedAt,
          liveVerificationSourceUrl: rolePageUrl,
          liveVerificationUrl: applyUrl,
          liveVerificationNote: String(verification.reason || 'Exact role page and application link are active.').trim(),
          liveVerificationToken: createLiveJobVerificationToken({
            url: applyUrl,
            sourceUrl: rolePageUrl,
            applicationDeadline,
            verifiedAt: liveVerifiedAt
          })
        };
      }).filter(Boolean);
    } catch (error) {
      console.warn(`[ADMIN ASSISTANT] Live job verification batch ${batchIndex + 1} failed:`, error.message);
      return [];
    }
  }));

  return verifiedBatches.flat().slice(0, count);
};

const getAdminDraftArrayName = (kind) => (
  kind === 'job' ? 'jobDrafts' : kind === 'company' ? 'companyDrafts' : 'workNewsDrafts'
);

const createDraftBatchPrompt = ({ basePrompt, kind, count, batchNumber, totalBatches }) => `${basePrompt}

Draft batch instruction (mandatory):
- This is batch ${batchNumber} of ${totalBatches}.
- Return exactly ${count} distinct ${getAdminDraftArrayName(kind)} in the JSON array.
- Return every other draft array empty.
- Do not collapse the drafts into jobForm, companyForm, a summary, or a single example.
- Every array item must be a complete, separately editable draft using the schema above.
- Keep descriptions concise enough to return all ${count} items.
- For jobs, honor the requested location and sector/occupation preferences. Include a specific sector in every job draft and keep sector separate from employment type. Open the exact role page and its Apply button; source must be that one role's canonical detail page and applicationLink must be the final role-specific Apply destination, never a careers home, search, department, or all-jobs page.
- For Work News, describe the concrete event, product, result, programme, milestone, or change reported by the source itself. Never write meta-copy such as "published an update about", "shared a post about", or "ongoing work across".
- For companies, include a distinct lowercase jumptakeId, profile details, industry, headquarters, website when known, founded year, and a substantive description.
- The admin will review, edit, and manually publish them; do not publish anything.`;

const generateAdminDraftBatches = async ({ prompt, kind, requestedCount, useWebSearch, seedDrafts = [], workNewsRequireSource = true }) => {
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
      const rows = parsed[getAdminDraftArrayName(kind)];
      return kind === 'work-news'
        ? normalizeWorkNewsDraftRows(rows, count, { requireSource: workNewsRequireSource })
        : kind === 'company'
          ? normalizeCompanyDraftRows(rows, count)
          : (Array.isArray(rows) ? rows.slice(0, count) : []);
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
          const rows = parsed[getAdminDraftArrayName(kind)];
          return kind === 'work-news'
            ? normalizeWorkNewsDraftRows(rows, count, { requireSource: workNewsRequireSource })
            : kind === 'company'
              ? normalizeCompanyDraftRows(rows, count)
              : (Array.isArray(rows) ? rows.slice(0, count) : []);
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

const createCandidateDraftJumpTakeId = (draft = {}) => {
  const requested = String(draft.jumptakeId || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  if (requested.length >= 3) return requested;

  const firstName = String(draft.name || 'candidate').trim().split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'candidate';
  const seed = `${draft.name || ''}|${draft.email || ''}|${draft.jobTitle || ''}`;
  const suffix = 1000 + (crypto.createHash('sha256').update(seed).digest().readUInt32BE(0) % 9000);
  return `${firstName}-${suffix}`;
};

const normalizeGeneratedCandidateDraft = (draft = {}, profileImage = null) => ({
  ...draft,
  name: String(draft.name || '').trim(),
  email: String(draft.email || '').trim().toLowerCase(),
  jumptakeId: createCandidateDraftJumpTakeId(draft),
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
    body: ensureActionBasedTalentStory(draft),
    mediaUrl: String(draft.talentStory?.mediaUrl || draft.talentStory?.media?.dataUrl || '').trim(),
    mediaType: draft.talentStory?.mediaType === 'video' || draft.talentStory?.media?.type === 'video' ? 'video' : 'image'
  }
});

const ensureUniqueCandidateDraftJumpTakeIds = (drafts = []) => {
  const used = new Set();
  return drafts.map((draft, index) => {
    let jumptakeId = createCandidateDraftJumpTakeId(draft);
    if (used.has(jumptakeId)) {
      const base = jumptakeId.replace(/-\d{4,}$/, '').slice(0, 36) || 'candidate';
      let suffix = 1000 + ((index * 7919) % 9000);
      while (used.has(`${base}-${suffix}`)) suffix = 1000 + ((suffix + 137) % 9000);
      jumptakeId = `${base}-${suffix}`;
    }
    used.add(jumptakeId);
    return { ...draft, jumptakeId };
  });
};

const FALLBACK_CANDIDATE_PROFILES = [
  { masculine: 'Daniel Carter', feminine: 'Amelia Carter', role: 'Software Engineer', skills: 'JavaScript, React, Node.js, API design', study: 'BSc Computer Science', project: 'rebuilt a slow reporting workflow and reduced its processing time by 38%' },
  { masculine: 'Marcus Bennett', feminine: 'Sophie Bennett', role: 'Product Designer', skills: 'Figma, user research, prototyping, accessibility', study: 'BA Product Design', project: 'tested a new onboarding flow and removed the three steps causing the most user drop-off' },
  { masculine: 'Ethan Brooks', feminine: 'Maya Brooks', role: 'Data Analyst', skills: 'SQL, Python, Tableau, data modelling', study: 'BSc Data Analytics', project: 'built a quality dashboard that exposed duplicate records before the weekly reporting cycle' },
  { masculine: 'Noah Williams', feminine: 'Olivia Williams', role: 'Marketing Executive', skills: 'content strategy, analytics, SEO, campaign planning', study: 'BA Marketing', project: 'launched a segmented campaign that increased qualified responses without increasing spend' },
  { masculine: 'Lucas Patel', feminine: 'Priya Patel', role: 'Project Coordinator', skills: 'project planning, stakeholder communication, risk tracking, Jira', study: 'BSc Business Management', project: 'replanned a delayed delivery and brought the final milestone back on schedule' },
  { masculine: 'Adam Clarke', feminine: 'Grace Clarke', role: 'Quality Assurance Analyst', skills: 'manual testing, Jira, regression testing, web systems', study: 'BSc Information Systems', project: 'isolated a release-blocking checkout defect and documented a repeatable regression test for it' }
];

const FALLBACK_MASCULINE_NAMES = [
  'Daniel Carter', 'Marcus Bennett', 'Ethan Brooks', 'Noah Williams', 'Lucas Patel',
  'Adam Clarke', 'Samuel Reed', 'Isaac Morgan', 'Leo Thompson', 'Owen Hughes',
  'Nathan Scott', 'Jacob Foster', 'Ryan Edwards', 'Aiden Murphy', 'Thomas Bell',
  'Callum Price', 'Benjamin Shah', 'Matthew Evans', 'Harrison Young', 'Joshua Ward'
];

const FALLBACK_FEMININE_NAMES = [
  'Amelia Carter', 'Sophie Bennett', 'Maya Brooks', 'Olivia Williams', 'Priya Patel',
  'Grace Clarke', 'Emily Reed', 'Zara Morgan', 'Chloe Thompson', 'Isla Hughes',
  'Hannah Scott', 'Jessica Foster', 'Layla Edwards', 'Freya Murphy', 'Lucy Bell',
  'Niamh Price', 'Aisha Shah', 'Charlotte Evans', 'Ruby Young', 'Ella Ward'
];

const createFallbackCandidateDraft = (index, profileImage = null) => {
  const template = FALLBACK_CANDIDATE_PROFILES[index % FALLBACK_CANDIDATE_PROFILES.length];
  const imageUrl = String(profileImage?.dataUrl || '');
  const apparentPresentation = /\/portraits\/women\//i.test(imageUrl)
    ? 'feminine'
    : (/\/portraits\/men\//i.test(imageUrl) ? 'masculine' : (index % 2 ? 'feminine' : 'masculine'));
  const names = apparentPresentation === 'feminine' ? FALLBACK_FEMININE_NAMES : FALLBACK_MASCULINE_NAMES;
  const baseName = names[index % names.length] || template[apparentPresentation];
  const cycle = Math.floor(index / names.length);
  const name = cycle ? `${baseName.split(' ')[0]} ${String.fromCharCode(65 + (cycle % 26))}. ${baseName.split(' ').slice(1).join(' ')}` : baseName;
  const emailName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

  return normalizeGeneratedCandidateDraft({
    name,
    email: `${emailName}.${index + 1}@jumptake-demo.com`,
    jumptakeId: `${name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}-${String(1000 + ((index * 7919) % 9000))}`,
    jobTitle: template.role,
    skills: template.skills,
    education: [`Northbridge University - ${template.study}`],
    studies: [template.study, `Applied ${template.role} practice`],
    experience: [`Delivered practical ${template.role.toLowerCase()} work across a cross-functional project`],
    achievements: [`Recently ${template.project}`],
    about: `${name} is a ${template.role.toLowerCase()} focused on practical, measurable improvements. Their background combines ${template.skills.split(',').slice(0, 2).join(' and ')} with clear cross-team communication.`,
    sourceImageId: profileImage?.id || '',
    talentStory: {
      body: `This week I ${template.project}. I used ${template.skills.split(',').slice(0, 2).join(' and ')} to validate the change and share the result with the wider team.`
    }
  }, profileImage);
};

const createAdminCandidatePrompt = (message, { includePictures = false, profileImages = [] } = {}) => `You are JumpTake Admin AI. Convert the admin request into JSON that drafts candidate user profiles and their talent story posts.

Return only valid JSON with this shape:
{
  "reply": "short admin-facing reply",
  "userDrafts": [
    {
      "name": "Full name",
      "email": "firstname.lastname@example.com",
      "jumptakeId": "firstname-1234",
      "jobTitle": "Current or target job title",
      "skills": "Comma separated skills",
      "education": ["Institution and qualification"],
      "studies": ["Degree, subject, certification, or focused study"],
      "experience": ["Role, project, or practical experience"],
      "achievements": ["A specific completed result or achievement"],
      "about": "2-3 sentence professional about description for the candidate profile",
      "sourceImageId": "profile-image-1",
      "talentStory": {
        "body": "A specific recent action, solved problem, completed project, or achievement written in the candidate's voice",
        "mediaUrl": "Optional direct image or video URL, otherwise empty",
        "mediaType": "image or video"
      }
    }
  ]
}

Rules:
- Fill only fields that can be inferred from the request.
- If the admin requests a number of profiles, return exactly that many distinct userDrafts.
- Use realistic, varied, believable names and roles across different industries.
- Emails must be lowercase with a plausible unique domain and unique per draft.
- jumptakeId is required for every draft. Generate a unique, readable lowercase ID using the candidate's first name plus a hyphen and four digits, for example maya-4821. Do not include @, spaces, or underscores.
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
- Every userDraft must include a distinct jumptakeId.
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

  // Keep the admin's explicit quantity authoritative even if the model
  // under-fills one of the JSON batches after retries.
  while (drafts.length < requestedCount) {
    const index = drafts.length;
    drafts.push(createFallbackCandidateDraft(index, profileImages[index]));
  }

  return drafts.slice(0, requestedCount);
};

const LIVE_JOB_REPLENISH_ROUNDS = 3;

const getLiveJobDraftKey = (draft = {}) => {
  const sourceUrl = normalizeHttpUrl(draft.applicationLink || draft.source).toLowerCase();
  if (sourceUrl) return `url:${sourceUrl}`;
  return `role:${[
    draft.companyName,
    draft.title,
    draft.location
  ].map((value) => String(value || '').trim().toLowerCase()).join('|')}`;
};

const collectRequestedVerifiedLiveJobs = async ({ prompt, initialDrafts, requestedCount }) => {
  const targetCount = Math.min(ADMIN_ASSISTANT_MAX_DRAFTS, Math.max(1, Number(requestedCount) || 1));
  const checkedKeys = new Set();
  const verifiedKeys = new Set();
  const verifiedDrafts = [];
  let checkedCount = 0;

  const verifyCandidates = async (rows) => {
    const uniqueRows = (Array.isArray(rows) ? rows : []).filter((draft) => {
      const key = getLiveJobDraftKey(draft);
      if (!key || checkedKeys.has(key)) return false;
      checkedKeys.add(key);
      return true;
    });
    if (!uniqueRows.length) return 0;

    checkedCount += uniqueRows.length;
    const verifiedRows = await verifyAdminLiveJobDrafts(uniqueRows, uniqueRows.length);
    verifiedRows.forEach((draft) => {
      const key = getLiveJobDraftKey(draft);
      if (!key || verifiedKeys.has(key) || verifiedDrafts.length >= targetCount) return;
      verifiedKeys.add(key);
      verifiedDrafts.push(draft);
    });
    return uniqueRows.length;
  };

  await verifyCandidates(initialDrafts);

  for (let round = 1; round <= LIVE_JOB_REPLENISH_ROUNDS && verifiedDrafts.length < targetCount; round += 1) {
    const missingCount = targetCount - verifiedDrafts.length;
    const searchCount = Math.min(targetCount, Math.max(10, missingCount + Math.ceil(missingCount / 2)));
    const excludedUrls = [...checkedKeys]
      .filter((key) => key.startsWith('url:'))
      .map((key) => key.slice(4))
      .slice(-200);
    const supplementPrompt = `${prompt}

Additional verified-job search round ${round}:
- ${verifiedDrafts.length} of ${targetCount} requested jobs have passed verification; find ${missingCount} more.
- Generate ${searchCount} additional distinct live job candidates so closed or unverifiable results can be replaced.
- Search different employers and exact role-detail pages from earlier batches. Do not return career home pages, department pages, job indexes, search results, or all-jobs pages.
- Open each role, follow its Apply button, and return that final role-specific destination in applicationLink.
- Do not return any source URL already checked below.
Already checked URLs: ${JSON.stringify(excludedUrls)}`;
    const additionalDrafts = await generateAdminDraftBatches({
      prompt: supplementPrompt,
      kind: 'job',
      requestedCount: searchCount,
      useWebSearch: true
    });
    const checkedThisRound = await verifyCandidates(additionalDrafts);
    if (!checkedThisRound) break;
  }

  return {
    drafts: verifiedDrafts.slice(0, targetCount),
    checkedCount
  };
};

const createAdminAssistantPrompt = ({ message, companyForm, jobForm, jobDraftPreferences = {}, availableCompanies = [] }) => `You are JumpTake Admin AI. Convert the admin request into JSON that fills admin panel forms.

Return only valid JSON with this shape:
{
  "reply": "short admin-facing reply",
  "action": "fillCompany" | "fillJob" | "fillBoth" | "draftCompanies" | "draftWorkNews" | "reply",
  "companyForm": {
    "name": "",
    "jumptakeId": "",
    "adminCompanyId": "",
    "industry": "",
    "headquarters": "",
    "website": "",
    "founded": "",
    "description": ""
  },
  "companyDrafts": [
    {
      "name": "",
      "jumptakeId": "company-name-1234",
      "adminCompanyId": "company-company-name-1234",
      "industry": "",
      "headquarters": "",
      "website": "",
      "founded": "",
      "description": "",
      "logo": ""
    }
  ],
  "jobForm": {
    "company": "",
    "companyName": "",
    "title": "",
    "location": "",
    "sector": "",
    "salary": "",
    "applicationLink": "",
    "applicationDeadline": "",
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
      "sector": "",
      "salary": "",
      "applicationLink": "",
      "applicationDeadline": "",
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
      "companyId": "existing Mongo company ID when supplied below",
      "companyJumpTakeId": "existing company JumpTake ID",
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
- If the admin asks for multiple company profiles/users/drafts, return companyDrafts instead of one companyForm. Return exactly the requested number when possible.
- Every companyDraft requires a distinct readable lowercase jumptakeId made from its company name plus four digits, for example northstar-labs-4821. Do not use @, spaces, or underscores.
- Give every company a complete, specific profile with industry, headquarters, founded year, description, and website when it is a real company. Do not copy one generic description across the drafts.
- If the admin asks to post/create a job, fill jobForm. If they provide a company ID such as ez1231231, put it in jobForm.company.
- If the admin asks for multiple/latest/web jobs, return jobDrafts instead of one jobForm.
- For requests like "post 10 latest jobs from the web", use web search and collect exactly the requested number when possible, otherwise as many reliable current jobs as you can find.
- Only draft jobs whose exact source page is live today, currently accepting applications, and publishes a closing deadline that is today or in the future. Exclude roles with no published deadline as well as expired, closed, filled, archived, removed, missing, or unverifiable listings.
- When web/latest jobs are requested, you have access to web search through the API tool. Do not claim you cannot browse, cannot access live web jobs, or need a browsing-enabled feed.
- Search sources such as Gradcracker, RateMyPlacement, LinkedIn, company career systems, and other reliable job sites, but open the individual role result before returning it.
- source must be the canonical detail page for exactly that title and company. Never use a careers homepage, employer job board, department page, all-jobs page, search page, filtered results URL, or bare domain.
- On the exact role page, inspect and follow the Apply, Apply now, Submit application, or equivalent button. applicationLink must be that final role-specific destination after redirects. It may equal source only when the application form is embedded on the exact role page or the Apply action has no separate URL.
- Reject any result when the exact role page or its Apply action cannot be opened and verified. Never substitute the company's general careers page.
- For every jobDraft include title, companyName, location, sector, applicationLink/source URL, applicationDeadline, jobType, description, requirements, responsibilities, skills, and salary if available.
- Treat sector as a free-form occupation or industry category, not an employment arrangement. It may be Technology, Health, Medical, Business, Economics, Supply Chain, Hospitality, Barista, Coffee Maker, Restaurant Work, Pharmacy, Computer Science, or any other role/sector requested by the admin.
- Apply Job draft preferences to every generated job unless the admin message gives a more specific instruction. When sectors says "all", create a genuinely varied set across the widest practical range of occupations rather than mostly technology roles.
- Read applicationDeadline from the exact role source and return it as YYYY-MM-DD. Only include roles with a published deadline that is today or later. Never estimate or invent a deadline.
- jobDraft.company should be a stable admin company ID based on the company name, lowercase words joined with hyphens, unless the prompt provides a specific company ID.
- Put the exact canonical role-detail URL in source and the final URL behind that role's Apply action in applicationLink.
- Do not say the jobs were posted. Tell the admin the drafts are ready and they can review individual cards, use Post Job, or use Post All.
- Do not fabricate job details. Leave unknown fields blank.
- If the admin asks to post/create Work News, company updates, LinkedIn updates, or feed posts from the live web, return workNewsDrafts instead of jobDrafts.
- When the admin asks for posts for existing JumpTake companies without asking for live web news, use the matching records in Available JumpTake companies. Copy the exact companyId, companyJumpTakeId, companyName, and logo into each draft. Write specific posts about work completed, a problem solved, a product or programme created, a milestone, or an achievement. Do not write generic brand statements.
- For requests like "post on work news make 10 drafts from the live web", use web search and collect exactly the requested number when possible, otherwise as many reliable current company updates as you can find.
- Search LinkedIn public results, company newsrooms, company blogs, official social posts, and reliable business news pages. Prefer original company pages when LinkedIn is unavailable.
- Live-web workNewsDrafts must include companyName, source URL, sourceTitle when available, and a concise JumpTake Work News body. Paraphrase the update; do not copy long text verbatim.
- Original posts for existing Available JumpTake companies may leave source and sourceTitle blank, but must include that company's exact companyId and companyJumpTakeId.
- The body must report the substance of the source: the specific launch, result, product change, programme, partnership, investment, achievement, or workplace development, including concrete names, figures, dates, or outcomes when the source provides them.
- Write the body as the actual news update itself. Never introduce it with meta-language such as "published a company update about", "shared a post about", "released a report about", "ongoing work across", or "in its reporting materials".
- Open the source and use details from its content. A body that merely says who posted or published something is not a usable Work News draft.
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
Job draft preferences: ${JSON.stringify(jobDraftPreferences || {})}
Available JumpTake companies: ${JSON.stringify(availableCompanies)}
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
        DeletedItem.find(query)
          .select('itemType collection originalId parentId originalIndex label deletedAt createdAt')
          .sort({ deletedAt: -1 })
          .skip(skip)
          .limit(limit),
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
        .select((config.summaryFields || []).join(' '))
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

const createAdminJob = async (payload = {}) => {
  const {
    title,
    description,
    company,
    companyName,
    location,
    sector,
    salary,
    applicationLink,
    applicationDeadline,
    source,
    liveVerifiedAt,
    liveVerificationSourceUrl,
    liveVerificationUrl,
    liveVerificationToken,
    jobType,
    requirements,
    responsibilities,
    skills
  } = payload;
  const normalizedDeadline = normalizeApplicationDeadline(applicationDeadline);
  if (applicationDeadline && !normalizedDeadline) {
    const error = new Error('Enter a valid application deadline.');
    error.status = 400;
    throw error;
  }
  if (!isCurrentApplicationDeadline(normalizedDeadline)) {
    const error = new Error('Expired jobs cannot be posted to the live feed.');
    error.status = 400;
    throw error;
  }

  const sourceUrl = normalizeHttpUrl(source);
  if (sourceUrl) {
    if (!normalizedDeadline) {
      const error = new Error('AI-imported jobs require a published application deadline that is today or later.');
      error.status = 409;
      throw error;
    }
    const applicationUrl = normalizeHttpUrl(applicationLink);
    const verificationSourceUrl = normalizeHttpUrl(liveVerificationSourceUrl || sourceUrl);
    const verificationUrl = normalizeHttpUrl(liveVerificationUrl || applicationUrl);
    const verificationIsValid = !isLikelyGenericJobLandingUrl(sourceUrl)
      && !isLikelyGenericJobLandingUrl(applicationUrl)
      && sourceUrl === verificationSourceUrl
      && applicationUrl === verificationUrl
      && hasValidLiveJobVerification({
        url: verificationUrl,
        sourceUrl: verificationSourceUrl,
        applicationDeadline: normalizedDeadline,
        verifiedAt: liveVerifiedAt,
        token: liveVerificationToken
      });
    if (!verificationIsValid) {
      const error = new Error('This exact role page, Apply link, or deadline is no longer verified. Ask Admin AI to check the job again.');
      error.status = 409;
      throw error;
    }
  }

  const resolvedCompany = await resolveAdminJobCompany(company, companyName);
  return Job.create({
    title,
    description,
    company: resolvedCompany.company._id,
    adminCompanyId: resolvedCompany.adminCompanyId,
    location,
    sector: String(sector || resolvedCompany.company.industry || 'General').trim(),
    salary,
    applicationLink: sourceUrl ? normalizeHttpUrl(applicationLink) : applicationLink,
    applicationDeadline: normalizedDeadline || null,
    sourceUrl: sourceUrl || '',
    sourceStatus: sourceUrl ? 'verified' : '',
    sourceVerifiedAt: sourceUrl ? new Date(liveVerifiedAt) : null,
    jobType,
    requirements: Array.isArray(requirements) ? requirements : String(requirements || '').split('\n').map((item) => item.trim()).filter(Boolean),
    responsibilities: Array.isArray(responsibilities) ? responsibilities : String(responsibilities || '').split('\n').map((item) => item.trim()).filter(Boolean),
    skills: Array.isArray(skills) ? skills : String(skills || '').split(',').map((skill) => skill.trim()).filter(Boolean)
  });
};

router.post('/jobs', async (req, res) => {
  try {
    const job = await createAdminJob(req.body);
    res.status(201).json({ item: serializeDocument(job) });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post('/jobs/bulk', async (req, res) => {
  const drafts = Array.isArray(req.body?.drafts) ? req.body.drafts : [];
  if (!drafts.length) {
    return res.status(400).json({ error: 'Add at least one job draft to publish.' });
  }
  if (drafts.length > ADMIN_ASSISTANT_MAX_DRAFTS) {
    return res.status(400).json({ error: `You can publish up to ${ADMIN_ASSISTANT_MAX_DRAFTS} job drafts at once.` });
  }

  const items = [];
  const failures = [];
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index] || {};
    try {
      const job = await createAdminJob(draft);
      items.push({
        draftId: String(draft.id || ''),
        item: serializeDocument(job)
      });
    } catch (error) {
      failures.push({
        draftId: String(draft.id || ''),
        title: String(draft.title || `Draft ${index + 1}`),
        error: error.message || 'Could not publish this job.'
      });
    }
  }

  return res.status(items.length ? 201 : 400).json({
    postedCount: items.length,
    failedCount: failures.length,
    items,
    failures,
    ...(items.length ? {} : { error: failures[0]?.error || 'No job drafts could be published.' })
  });
});

const resolveAdminCompanyJumpTakeId = async (name, requestedValue = '') => {
  const requested = normalizeCompanyDraftJumpTakeId(requestedValue, name);
  const [companyExists, userExists] = await Promise.all([
    Company.exists({ jumptakeId: requested }),
    User.exists({ jumptakeId: requested })
  ]);
  if (!companyExists && !userExists) return requested;
  return generateCompanyJumpTakeId(name);
};

router.post('/companies', async (req, res) => {
  try {
    const {
      name,
      jumptakeId = '',
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

    const resolvedJumpTakeId = await resolveAdminCompanyJumpTakeId(name, jumptakeId);

    const company = await Company.create({
      name: String(name).trim(),
      jumptakeId: resolvedJumpTakeId,
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

const validateAdminPostMediaUrl = (value = '') => {
  const mediaUrl = String(value || '').trim();
  if (!mediaUrl) return '';

  if (/^data:(?:image|video)\//i.test(mediaUrl)) {
    if (mediaUrl.length > 12000000) {
      const error = new Error('Embedded post media must be smaller than 8 MB');
      error.status = 413;
      throw error;
    }
    return mediaUrl;
  }

  if (!/^https?:\/\//i.test(mediaUrl) || mediaUrl.length > 2048) {
    const error = new Error('Post media must be an uploaded image/video or a valid public URL');
    error.status = 400;
    throw error;
  }

  return mediaUrl;
};

router.post('/feed-posts', async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim().slice(0, 5000);
    const requestedCompanyName = String(req.body?.authorName || req.body?.companyName || 'Admin Company').trim().slice(0, 160);
    const requestedAuthorId = String(req.body?.authorId || req.body?.companyId || '').trim();
    const requestedCompanyJumpTakeId = String(req.body?.companyJumpTakeId || req.body?.jumptakeId || '').trim().replace(/^@/, '').toLowerCase();
    let linkedCompany = null;
    if (mongoose.isValidObjectId(requestedAuthorId)) {
      linkedCompany = await Company.findById(requestedAuthorId);
    }
    if (!linkedCompany && requestedCompanyJumpTakeId) {
      linkedCompany = await Company.findOne({ jumptakeId: requestedCompanyJumpTakeId });
    }
    if (!linkedCompany && requestedCompanyName && requestedCompanyName !== 'Admin Company') {
      linkedCompany = await Company.findOne({ name: new RegExp(`^${requestedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }
    if (linkedCompany) await ensureCompanyJumpTakeId(linkedCompany);

    const authorName = String(linkedCompany?.name || requestedCompanyName).trim().slice(0, 160);
    const authorAvatar = String(linkedCompany?.logo || req.body?.authorAvatar || req.body?.companyLogoUrl || '');
    const source = String(req.body?.source || '').trim().slice(0, 1000);
    const sourceTitle = String(req.body?.sourceTitle || '').trim().slice(0, 240);
    const mediaUrl = validateAdminPostMediaUrl(req.body?.mediaUrl);
    const mediaType = req.body?.mediaType === 'video' ? 'video' : 'image';

    if (!body && !mediaUrl) {
      return res.status(400).json({ error: 'Write something or attach media before posting' });
    }

    const post = await FeedPost.create({
      type: 'work-news',
      body,
      authorId: String(linkedCompany?._id || requestedAuthorId || `admin-work-news-${Date.now()}`),
      authorType: 'employer',
      authorName: authorName || 'Admin Company',
      authorAvatar,
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
    res.status(error.status || 400).json({ error: error.message });
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

const normalizeRequestedJumpTakeId = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^@+/, '');

const resolveAdminJumpTakeId = async (name, requestedValue = '') => {
  const requested = normalizeRequestedJumpTakeId(requestedValue);
  if (!requested) {
    return generateJumpTakeId(name);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requested) || requested.length < 3 || requested.length > 48) {
    const error = new Error('JumpTake ID must use 3-48 lowercase letters, numbers, and single hyphens');
    error.status = 400;
    throw error;
  }

  const [userExists, companyExists] = await Promise.all([
    User.exists({ jumptakeId: requested }),
    Company.exists({ jumptakeId: requested })
  ]);
  if (!userExists && !companyExists) {
    return requested;
  }

  const base = requested.replace(/-\d{4,}$/, '').slice(0, 36) || String(name || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const alternative = `${base}-${crypto.randomInt(1000, 10000)}`;
    const [alternativeUserExists, alternativeCompanyExists] = await Promise.all([
      User.exists({ jumptakeId: alternative }),
      Company.exists({ jumptakeId: alternative })
    ]);
    if (!alternativeUserExists && !alternativeCompanyExists) {
      return alternative;
    }
  }

  return generateJumpTakeId(name);
};

router.post('/candidates', async (req, res) => {
  let user = null;
  let jobSeeker = null;
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

    const jumptakeId = await resolveAdminJumpTakeId(name, req.body?.jumptakeId);
    user = await User.create({ email, password, jumptakeId, jobInterests });

    jobSeeker = await JobSeeker.create({
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
    // Candidate creation spans two collections. Remove a partial write so a
    // failed profile never leaves an orphaned login that poisons later drafts.
    await Promise.allSettled([
      jobSeeker?._id ? JobSeeker.deleteOne({ _id: jobSeeker._id }) : Promise.resolve(),
      user?._id ? User.deleteOne({ _id: user._id }) : Promise.resolve()
    ]);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/talent-stories', async (req, res) => {
  try {
    const authorName = String(req.body?.authorName || req.body?.name || '').trim();
    const body = String(req.body?.body || req.body?.about || '').trim();
    const authorAvatar = String(req.body?.authorAvatar || req.body?.profileImage || req.body?.coverImage || req.body?.coverPhoto || '').trim();
    const authorId = String(req.body?.authorId || '').trim();
    const linkedProfileOwnsEmbeddedAvatar = mongoose.isValidObjectId(authorId)
      && /^data:image\//i.test(authorAvatar);

    if (!authorName && !body && !authorAvatar) {
      return res.status(400).json({ error: 'Candidate name, story text, or cover photo is required' });
    }

    const talentStoryMediaUrl = req.body?.media && typeof req.body.media === 'object'
      ? validateAdminPostMediaUrl(req.body.media.dataUrl)
      : '';
    const media = talentStoryMediaUrl
      ? {
          dataUrl: talentStoryMediaUrl,
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
      // The linked JobSeeker already owns this image. Avoid copying a large
      // data URL into every story document; feed reads hydrate it by authorId.
      authorAvatar: linkedProfileOwnsEmbeddedAvatar ? '' : authorAvatar,
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

    const companyForm = req.body?.companyForm || {};
    const uploadedProfileImages = normalizeAdminProfileImages(req.body?.profileImages);
    const lowerMessage = message.toLowerCase();
    const wantsCompanyInfo = /\b(company|business|employer|website|industry|founded|address|headquarters|details|profile)\b/.test(lowerMessage);
    const wantsWebJobs = /\b(latest|recent|live|active|current|web|online|search|find|collect|career\s*page|source\s*link|gradcracker|rate\s*my\s*placement|ratemyplacement|linkedin)\b/.test(lowerMessage)
      && /\b(job|jobs|role|roles|placement|graduate|internship)\b/.test(lowerMessage);
    const wantsJobDrafts = /\b(job|jobs|role|roles|position|positions|vacancy|vacancies|placement|graduate|internship)\b/.test(lowerMessage)
      && /\b(draft|drafts|post|posts|create|creates|creation|creations|make|generate|generation|prepare|fill|collect|find)\b/.test(lowerMessage);
    const wantsCompanyProfileDrafts = !wantsJobDrafts
      && /\b(companies|company\s+profiles?|company\s+users?|employer\s+profiles?|business\s+profiles?)\b/.test(lowerMessage)
      && /\b(draft|drafts|create|creates|creation|creations|make|generate|generation|prepare|collect)\b/.test(lowerMessage)
      && !/\b(posts?|work\s*news|updates?|stories?)\b/.test(lowerMessage);
    const wantsCandidateDrafts = !wantsJobDrafts && !wantsCompanyProfileDrafts
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
    const wantsLiveWorkNews = wantsWorkNewsDrafts
      && /\b(live|latest|recent|web|online|search|find|collect|linkedin|newsroom|official\s+site|company\s+site|website)\b/.test(lowerMessage);
    const availableCompanyDocuments = wantsWorkNewsDrafts
      ? await Company.find({}).sort({ createdAt: -1 }).limit(100)
      : [];
    await Promise.all(availableCompanyDocuments.map(async (company) => {
      try {
        await ensureCompanyJumpTakeId(company);
      } catch (error) {
        console.warn(`[ADMIN ASSISTANT] Could not prepare company context for ${company._id}:`, error.message);
      }
    }));
    const availableCompanies = availableCompanyDocuments.map((company) => ({
      companyId: String(company._id),
      companyJumpTakeId: company.jumptakeId || '',
      companyName: company.name || '',
      industry: company.industry || '',
      headquarters: company.headquarters || '',
      description: company.description || '',
      logo: company.logo || ''
    }));
    const prompt = createAdminAssistantPrompt({
      message,
      companyForm,
      jobForm: req.body?.jobForm || {},
      jobDraftPreferences: req.body?.jobDraftPreferences || {},
      availableCompanies
    });
    const requestedJobDraftCount = getRequestedDraftCount(message, wantsJobDrafts || wantsWebJobs);
    const requestedCompanyDraftCount = getRequestedDraftCount(message, wantsCompanyProfileDrafts);
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
      && (wantsWebJobs || wantsLiveWorkNews || (!wantsCandidateDrafts && !wantsCompanyProfileDrafts && wantsCompanyInfo && hasMissingCompanyDetails));
    const initialDraftKind = requestedCandidateDraftCount
      ? 'candidate'
      : requestedCompanyDraftCount
        ? 'company'
        : requestedJobDraftCount
          ? 'job'
          : requestedWorkNewsDraftCount
            ? 'work-news'
            : '';
    const initialDraftCount = requestedCandidateDraftCount || requestedCompanyDraftCount || requestedJobDraftCount || requestedWorkNewsDraftCount;
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
    let companyDrafts = normalizeCompanyDraftRows(
      parsed.companyDrafts,
      requestedCompanyDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    );
    let workNewsDrafts = normalizeWorkNewsDraftRows(
      parsed.workNewsDrafts,
      requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS,
      { requireSource: wantsLiveWorkNews }
    );
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
      workNewsDrafts = normalizeWorkNewsDraftRows(
        [...workNewsDrafts, parsed.workNewsDraft],
        requestedWorkNewsDraftCount,
        { requireSource: wantsLiveWorkNews }
      );
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

    if (wantsLiveWorkNews && useWebSearch && !workNewsDrafts.length && looksLikeWebWorkNewsRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      const retryPrompt = `${prompt}

Strict retry:
- The admin requested live web Work News drafts.
- You must use the web search tool now.
- Return JSON with workNewsDrafts filled from current company updates, LinkedIn/public social posts, company newsrooms, or official company blogs.
- Do not return a refusal or ask the admin for source/company details.
- If fewer than the requested number are found, return the reliable ones you found.`;
      aiText = await askAdminOpenAI(retryPrompt, { useWebSearch: true });
      parsed = parseJsonObjectFromText(aiText) || parsed;
      workNewsDrafts = normalizeWorkNewsDraftRows(
        parsed.workNewsDrafts,
        requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS,
        { requireSource: true }
      );
    }

    if (requestedCompanyDraftCount > companyDrafts.length) {
      companyDrafts = await generateAdminDraftBatches({
        prompt,
        kind: 'company',
        requestedCount: requestedCompanyDraftCount,
        useWebSearch,
        seedDrafts: companyDrafts
      });
    }
    if (requestedCompanyDraftCount > companyDrafts.length) {
      const missingCount = requestedCompanyDraftCount - companyDrafts.length;
      companyDrafts.push(...Array.from(
        { length: missingCount },
        (_, index) => createFallbackCompanyDraft(companyDrafts.length + index)
      ));
    }
    companyDrafts = normalizeCompanyDraftRows(
      companyDrafts,
      requestedCompanyDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    );

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
        seedDrafts: workNewsDrafts,
        workNewsRequireSource: wantsLiveWorkNews
      });
    }

    if (wantsWorkNewsDrafts) {
      workNewsDrafts = await attachWorkNewsDraftCompanies(workNewsDrafts);
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

    const generatedJobDraftCount = jobDrafts.length;
    let checkedJobDraftCount = generatedJobDraftCount;
    if (wantsWebJobs) {
      if (useWebSearch) {
        const liveJobResult = await collectRequestedVerifiedLiveJobs({
          prompt,
          initialDrafts: jobDrafts,
          requestedCount: requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
        });
        jobDrafts = liveJobResult.drafts;
        checkedJobDraftCount = liveJobResult.checkedCount;
      } else {
        jobDrafts = [];
      }
    }
    const rejectedJobDraftCount = wantsWebJobs ? Math.max(0, checkedJobDraftCount - jobDrafts.length) : 0;

    userDrafts = ensureUniqueCandidateDraftJumpTakeIds(userDrafts);

    if (wantsWebJobs && !jobDrafts.length && looksLikeWebJobRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable job drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    if (wantsLiveWorkNews && !workNewsDrafts.length && looksLikeWebWorkNewsRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      parsed.reply = 'Web search did not return usable Work News drafts. Check that the OpenAI account has web search access, then try the request again.';
    }

    res.json({
      reply: requestedCandidateDraftCount
        ? `${userDrafts.length} candidate profile draft${userDrafts.length === 1 ? '' : 's'} ready, each with a talent story post. Review, edit, and create each one when approved.`
        : requestedCompanyDraftCount
          ? `${companyDrafts.length} company profile draft${companyDrafts.length === 1 ? '' : 's'} ready with assigned JumpTake IDs. Review and create each company when approved.`
        : requestedJobDraftCount
          ? wantsWebJobs
            ? jobDrafts.length
              ? `${jobDrafts.length} verified active job draft${jobDrafts.length === 1 ? '' : 's'} ready with exact Apply links. ${rejectedJobDraftCount ? `${rejectedJobDraftCount} generic, expired, missing, closed, deadline-free, or unverifiable source${rejectedJobDraftCount === 1 ? ' was' : 's were'} excluded. ` : ''}Review them, then post individually or use Post All.`
              : 'No jobs passed exact-role verification. Generic careers pages, missing Apply links, unpublished or expired deadlines, closed roles, and unverifiable listings were not added.'
            : `${jobDrafts.length} job draft${jobDrafts.length === 1 ? '' : 's'} ready. Review them, then post individually or use Post All.`
          : requestedWorkNewsDraftCount
            ? `${workNewsDrafts.length} post draft${workNewsDrafts.length === 1 ? '' : 's'} ready. Review, edit, and post each one when approved.`
            : String(parsed.reply || 'I filled what I could. Review the form before creating the record.'),
      action: requestedCandidateDraftCount
        ? 'draftTalentProfiles'
        : requestedCompanyDraftCount
          ? 'draftCompanies'
          : (parsed.action || 'reply'),
      companyForm: parsed.companyForm && typeof parsed.companyForm === 'object' ? parsed.companyForm : {},
      companyDrafts,
      jobForm: parsed.jobForm && typeof parsed.jobForm === 'object' ? parsed.jobForm : {},
      jobDrafts,
      rejectedJobDraftCount,
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
