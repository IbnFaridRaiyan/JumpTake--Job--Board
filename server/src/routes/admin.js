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
const {
  fetchGreenhouseCandidates,
  fetchJSearchCandidates,
  isLikelyGenericJobLandingUrl: isVerifiedGenericJobUrl,
  isRecognizedRoleDetailUrl,
  isRoleSpecificApplicationUrl,
  normalizeHttpUrl: normalizeVerifiedJobUrl,
  verifyLiveJobDrafts: verifyLiveJobDraftsAtSource
} = require('../services/liveJobVerifier');
const { resolveCompanyLogo, resolvePostMedia } = require('../services/webMediaResolver');
const {
  addIdentityKeys,
  candidateIdentityKeys,
  companyIdentityKeys,
  feedPostIdentityKeys,
  filterUniqueDrafts,
  jobIdentityKeys,
  profileImageIdentity
} = require('../services/adminDraftDedup');
const { detectAdminAssistantIntent } = require('../services/adminAssistantIntent');
const { getRequestedDraftCount } = require('../services/adminDraftCount');
const { isSpecificWorkNewsSourceUrl } = require('../services/adminWorkNewsSource');

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
    summaryFields: ['name', 'jumptakeId', 'adminCompanyId', 'industry', 'headquarters', 'website', 'logo', 'createdAt']
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
const escapeRegularExpression = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findIdentityCollision = (rows, draft, identityKeyFactory) => {
  const incomingKeys = new Set(identityKeyFactory(draft));
  if (!incomingKeys.size) return null;
  return (Array.isArray(rows) ? rows : []).find((row) => (
    identityKeyFactory(row).some((key) => incomingKeys.has(key))
  )) || null;
};

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

  const requestedCompanyName = String(fallbackName || '').trim();
  if (requestedCompanyName) {
    const existingByName = await Company.findOne({
      name: new RegExp(`^${escapeRegularExpression(requestedCompanyName)}$`, 'i')
    });
    if (existingByName) {
      await ensureCompanyJumpTakeId(existingByName);
      return {
        company: existingByName,
        adminCompanyId: existingByName.adminCompanyId || requestedCompanyId
      };
    }
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

let adminOpenAIBackoffUntil = 0;
let adminOpenAILastError = null;
const OPENAI_PROVIDER_BACKOFF_MS = Math.max(
  10000,
  Number(process.env.OPENAI_PROVIDER_BACKOFF_MS) || 30000
);
const getOpenAIErrorMessage = (error) => String(
  error?.response?.data?.error?.message || error?.message || ''
);
const isOpenAIQuotaError = (error) => (
  /insufficient_quota|no credits remaining|add credits|billing quota|billing limit/i.test(getOpenAIErrorMessage(error))
  || String(error?.response?.data?.error?.code || '').toLowerCase() === 'insufficient_quota'
);

const createAdminOpenAIProviderError = (cause = adminOpenAILastError) => {
  const quotaError = isOpenAIQuotaError(cause);
  const error = new Error(quotaError
    ? 'OpenAI could not generate these drafts because this API project has no credits remaining. Add credits in OpenAI billing, then retry. No drafts were created.'
    : 'OpenAI could not generate these drafts right now. Check the server API key and OpenAI service access, then retry. No drafts were created.');
  error.status = quotaError ? 402 : 503;
  error.code = quotaError ? 'OPENAI_CREDITS_REQUIRED' : 'OPENAI_UNAVAILABLE';
  return error;
};

const assertExactAdminDraftCounts = (groups = []) => {
  const incomplete = groups.filter(({ requested, actual }) => (
    Number(requested) > 0 && Number(actual) !== Number(requested)
  ));
  if (!incomplete.length) return;

  const error = new Error(`The exact draft request could not be completed: ${incomplete
    .map(({ label, actual, requested }) => `${label} ${actual}/${requested}`)
    .join(', ')}. No partial draft set was returned. Try again or broaden strict source filters.`);
  error.status = 422;
  error.code = 'EXACT_DRAFT_COUNT_INCOMPLETE';
  throw error;
};

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

const askAdminOpenAIWithModel = async ({ apiKey, model, prompt, useWebSearch = false, images = [], responseSchema = null }) => {
  try {
    const payload = {
      model,
      input: createResponsesInput(prompt, images),
      max_output_tokens: 5500
    };

    if (responseSchema?.name && responseSchema?.schema) {
      payload.text = {
        format: {
          type: 'json_schema',
          name: responseSchema.name,
          strict: true,
          schema: responseSchema.schema
        }
      };
    }

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
      if (responseSchema?.name && responseSchema?.schema) {
        legacyPayload.text = {
          format: {
            type: 'json_schema',
            name: responseSchema.name,
            strict: true,
            schema: responseSchema.schema
          }
        };
      }

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
      return askAdminOpenAIChatSearch({ apiKey, prompt, responseSchema });
    }

    const shouldTryChat = /responses|output_text|max_output_tokens|unknown|not found|unsupported|model/i.test(message);
    if (!shouldTryChat) {
      throw error;
    }
  }

  const chatPayload = {
    model,
    temperature: 0.25,
    max_tokens: 5500,
    messages: [{ role: 'user', content: createChatInput(prompt, images) }]
  };
  if (responseSchema?.name && responseSchema?.schema) {
    chatPayload.response_format = {
      type: 'json_schema',
      json_schema: {
        name: responseSchema.name,
        strict: true,
        schema: responseSchema.schema
      }
    };
  }
  const chatResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    chatPayload,
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

const askAdminOpenAIChatSearch = async ({ apiKey, prompt, responseSchema = null }) => {
  let lastError = null;

  for (const model of ['gpt-5-search-api', 'gpt-4o-search-preview', 'gpt-4o-mini-search-preview']) {
    try {
      const chatPayload = {
        model,
        max_tokens: 5500,
        web_search_options: {},
        messages: [{ role: 'user', content: prompt }]
      };
      if (responseSchema?.name && responseSchema?.schema) {
        chatPayload.response_format = {
          type: 'json_schema',
          json_schema: {
            name: responseSchema.name,
            strict: true,
            schema: responseSchema.schema
          }
        };
      }
      const chatResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        chatPayload,
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

const askAdminOpenAI = async (prompt, { useWebSearch = false, images = [], responseSchema = null } = {}) => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    const missingKeyError = new Error('OPENAI_API_KEY is not configured');
    adminOpenAILastError = missingKeyError;
    throw createAdminOpenAIProviderError(missingKeyError);
  }
  if (Date.now() < adminOpenAIBackoffUntil && adminOpenAILastError) {
    throw createAdminOpenAIProviderError(adminOpenAILastError);
  }

  let lastError = null;
  const modelCandidates = useWebSearch ? getOpenAISearchModelCandidates() : getOpenAIModelCandidates();
  for (const model of modelCandidates) {
    try {
      const text = await askAdminOpenAIWithModel({ apiKey, model, prompt, useWebSearch, images, responseSchema });
      if (text) {
        adminOpenAIBackoffUntil = 0;
        adminOpenAILastError = null;
        return text;
      }
    } catch (error) {
      lastError = error;
      adminOpenAILastError = error;
      console.warn(`[ADMIN ASSISTANT] OpenAI model ${model} failed:`, error.response?.data?.error?.message || error.message);
      if (isOpenAIQuotaError(error)) {
        adminOpenAIBackoffUntil = Date.now() + OPENAI_PROVIDER_BACKOFF_MS;
        break;
      }
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
const ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS = Math.max(
  4,
  Math.min(Number(process.env.ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS) || 8, 16)
);
const ADMIN_DEDUPE_PROMPT_LIMIT = 400;

const workNewsDraftIdentityKeys = (draft = {}) => feedPostIdentityKeys({
  ...draft,
  type: 'work-news',
  authorName: draft.authorName || draft.companyName
});

const talentStoryDraftIdentityKeys = (draft = {}) => candidateIdentityKeys({
  ...draft,
  talentStory: draft.talentStory || { body: draft.body }
});

const createStoredRecordSummary = (kind, row = {}) => {
  if (kind === 'job') {
    return {
      company: row.company?.name || row.companyName || '',
      title: row.title || '',
      location: row.location || '',
      source: row.sourceUrl || row.source || '',
      applicationLink: row.applicationLink || ''
    };
  }
  if (kind === 'company') {
    return {
      name: row.name || '',
      jumptakeId: row.jumptakeId || '',
      website: row.website || '',
      logo: /^https?:\/\//i.test(String(row.logo || '')) ? row.logo : (row.logo ? '[stored-image]' : '')
    };
  }
  if (kind === 'candidate') {
    return {
      name: row.name || row.authorName || '',
      email: row.email || '',
      jumptakeId: row.jumptakeId || '',
      profileImage: /^https?:\/\//i.test(String(row.profileImage || row.authorAvatar || ''))
        ? (row.profileImage || row.authorAvatar)
        : ((row.profileImage || row.authorAvatar) ? '[stored-image]' : ''),
      talentStory: String(row.talentStory?.body || row.body || '').slice(0, 180)
    };
  }
  return {
    company: row.authorName || row.companyName || '',
    source: row.source || '',
    body: String(row.body || '').slice(0, 180)
  };
};

const loadAdminDraftExclusions = async ({ jobs = false, companies = false, candidates = false, workNews = false } = {}) => {
  const [storedJobs, storedCompanies, storedProfiles, storedUsers, storedWorkNews, storedTalentStories] = await Promise.all([
    jobs
      ? Job.find({}).select('title company location sourceUrl applicationLink').populate('company', 'name').lean()
      : [],
    companies
      ? Company.find({}).select('name jumptakeId adminCompanyId website logo').lean()
      : [],
    candidates
      ? JobSeeker.find({}).select('user name email profileImage').lean()
      : [],
    candidates
      ? User.find({}).select('email jumptakeId jobSeekerId').lean()
      : [],
    workNews
      ? FeedPost.find({ type: 'work-news' }).select('type body authorName authorId source').lean()
      : [],
    candidates
      ? FeedPost.find({ type: 'talent-story' }).select('type body authorName authorId authorAvatar').lean()
      : []
  ]);

  const userByProfileId = new Map(storedUsers.map((user) => [String(user.jobSeekerId || ''), user]));
  const userById = new Map(storedUsers.map((user) => [String(user._id || ''), user]));
  const candidateRows = storedProfiles.map((profile) => ({
    ...profile,
    ...(userByProfileId.get(String(profile._id || '')) || userById.get(String(profile.user || '')) || {})
  }));
  const candidateStoryRows = storedTalentStories.map((post) => ({
    name: post.authorName,
    profileImage: post.authorAvatar,
    talentStory: { body: post.body }
  }));

  const jobKeys = new Set();
  const companyKeys = new Set();
  const candidateKeys = new Set();
  const workNewsKeys = new Set();
  storedJobs.forEach((row) => addIdentityKeys(jobKeys, jobIdentityKeys(row)));
  storedCompanies.forEach((row) => addIdentityKeys(companyKeys, companyIdentityKeys(row)));
  candidateRows.forEach((row) => addIdentityKeys(candidateKeys, candidateIdentityKeys(row)));
  candidateStoryRows.forEach((row) => addIdentityKeys(candidateKeys, candidateIdentityKeys(row)));
  storedWorkNews.forEach((row) => addIdentityKeys(workNewsKeys, feedPostIdentityKeys(row)));

  return {
    jobKeys,
    companyKeys,
    candidateKeys,
    workNewsKeys,
    profileImageKeys: new Set(candidateRows.map((row) => profileImageIdentity(row.profileImage)).filter(Boolean)),
    promptRecords: [
      ...storedJobs.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((row) => createStoredRecordSummary('job', row)),
      ...storedCompanies.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((row) => createStoredRecordSummary('company', row)),
      ...candidateRows.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((row) => createStoredRecordSummary('candidate', row)),
      ...storedTalentStories.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((row) => createStoredRecordSummary('candidate', row)),
      ...storedWorkNews.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((row) => createStoredRecordSummary('work-news', row))
    ]
  };
};

const addPendingAdminDraftExclusions = (state, pendingDrafts = {}) => {
  const groups = [
    { rows: pendingDrafts.jobs, keys: state.jobKeys, factory: jobIdentityKeys, kind: 'job' },
    { rows: pendingDrafts.companies, keys: state.companyKeys, factory: companyIdentityKeys, kind: 'company' },
    { rows: pendingDrafts.candidates, keys: state.candidateKeys, factory: talentStoryDraftIdentityKeys, kind: 'candidate' },
    { rows: pendingDrafts.workNews, keys: state.workNewsKeys, factory: workNewsDraftIdentityKeys, kind: 'work-news' }
  ];

  groups.forEach(({ rows, keys, factory, kind }) => {
    (Array.isArray(rows) ? rows : []).slice(0, ADMIN_ASSISTANT_MAX_DRAFTS).forEach((row) => {
      addIdentityKeys(keys, factory(row));
      state.promptRecords.push(createStoredRecordSummary(kind, row));
      if (kind === 'candidate') {
        const imageKey = profileImageIdentity(row.profileImage);
        if (imageKey) state.profileImageKeys.add(imageKey);
      }
    });
  });

  state.promptRecords = state.promptRecords.slice(-ADMIN_DEDUPE_PROMPT_LIMIT);
  return state;
};

const appendAdminDuplicateExclusions = (prompt, records = []) => `${prompt}

Database uniqueness instruction (mandatory):
- The records below already exist in JumpTake. Do not return any of them again.
- For candidate/company profile creation, do not reuse an exact name, profile/company picture, email, website, or JumpTake ID.
- For posts, an existing author may post again, but do not reuse the same source URL or post body.
- For jobs, do not reuse an Apply/source URL or the same company/title/location combination.
- Tracking parameters, punctuation, capitalization, and whitespace do not make a record unique.
- Generate genuinely different replacements until the requested number of drafts is filled.
Existing JumpTake records: ${JSON.stringify((Array.isArray(records) ? records : []).slice(-ADMIN_DEDUPE_PROMPT_LIMIT))}`;

const JOB_DRAFTS_RESPONSE_SCHEMA = {
  name: 'jumptake_job_drafts',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      jobDrafts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            company: { type: 'string' },
            companyName: { type: 'string' },
            title: { type: 'string' },
            location: { type: 'string' },
            sector: { type: 'string' },
            salary: { type: 'string' },
            applicationLink: { type: 'string' },
            applicationDeadline: { type: 'string' },
            jobType: { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'] },
            skills: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'string' },
            responsibilities: { type: 'string' },
            source: { type: 'string' }
          },
          required: [
            'company', 'companyName', 'title', 'location', 'sector', 'salary',
            'applicationLink', 'applicationDeadline', 'jobType', 'skills',
            'description', 'requirements', 'responsibilities', 'source'
          ]
        }
      }
    },
    required: ['jobDrafts']
  }
};

const discoverOpenAIJobCandidates = async ({
  message,
  preferences = {},
  count = 12,
  excludedUrls = []
} = {}) => {
  if (process.env.OPENAI_JOB_WEB_DISCOVERY === 'false' || !getOpenAIApiKey()) return [];
  const targetCount = Math.min(20, Math.max(1, Number(count) || 12));
  const location = String(preferences.location || '').trim() || 'any requested location';
  const sectors = String(preferences.sectors || '').trim() || 'a varied set of occupations';
  const prompt = `You are JumpTake's live-job source researcher. Today is ${getTodayIsoDate()}.

Find up to ${targetCount} distinct, currently open jobs for ${sectors} in ${location}. The admin request is: ${JSON.stringify(String(message || '').slice(0, 800))}

Open each result and its Apply/Apply now action before returning it. Return only exact single-role pages with a stable role or requisition ID, never a careers home, search results, category, company-jobs page, or invented URL. Prefer the final employer ATS/application page. applicationLink may equal source only when that exact role page contains an embedded application flow.

Search across a diverse set of live sources, including employer ATS pages and exact roles on Forces Families Jobs, Harri, SaluteMyJob, Yorkshire.com jobs, LinkedIn, Synack/Greenhouse, BlackRock or other tal.net sites, Gradcracker, SuccessFactors, Workday, Greenhouse, Lever, Ashby, Workable, SmartRecruiters, iCIMS, Teamtailor, Recruitee, Indeed, RateMyPlacement, and other reputable role-specific sources.

Recognized examples are shapes only, not jobs to copy:
- /jobs/<role-slug>/<job-id>
- /<employer>/job/<job-id>-<role>
- /jobs/view/<role>-<job-id>
- /careers/?gh_jid=<job-id>
- /opp/<requisition-id>-<role>/...
- /hub/<company-id>/<company>/graduate-job/<job-id>/<role>
- /career?...career_job_req_id=<requisition-id>&career_ns=job_listing
- /details/<role>_<requisition-id>, /jobs/<uuid>/apply, or /viewjob?jk=<job-id>

Mandatory checks:
- The page must return the exact title and company requested in the result.
- The role must still accept applications now. Reject HTTP 404/410, challenge-only evidence, removed roles, closed applications, expired deadlines, and ambiguous pages.
- Use a published YYYY-MM-DD deadline only. Leave applicationDeadline empty when the active exact role publishes no closing date; never invent one.
- source is the canonical exact role page. applicationLink is the final role-specific Apply destination.
- Do not return these already used URLs: ${JSON.stringify((Array.isArray(excludedUrls) ? excludedUrls : []).slice(-400))}`;

  const responseText = await askAdminOpenAI(prompt, {
    useWebSearch: true,
    responseSchema: JOB_DRAFTS_RESPONSE_SCHEMA
  });
  const parsed = parseJsonObjectFromText(responseText) || {};
  return (Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts : [])
    .map((draft) => ({ ...draft, sourceProvider: 'openai-web' }))
    .filter((draft) => {
      const source = normalizeHttpUrl(draft?.source);
      const applicationLink = normalizeHttpUrl(draft?.applicationLink || source);
      return source
        && applicationLink
        && !isLikelyGenericJobLandingUrl(source)
        && !isLikelyGenericJobLandingUrl(applicationLink);
    })
    .slice(0, targetCount);
};

const LIVE_JOB_RESOLUTION_RESPONSE_SCHEMA = {
  name: 'jumptake_live_job_resolution',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      resolvedJobs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            verificationId: { type: 'string' },
            pageExists: { type: 'boolean' },
            exactRolePage: { type: 'boolean' },
            titleMatches: { type: 'boolean' },
            companyMatches: { type: 'boolean' },
            acceptingApplications: { type: 'boolean' },
            applyActionAvailable: { type: 'boolean' },
            applyBelongsToRole: { type: 'boolean' },
            rolePageUrl: { type: 'string' },
            applyUrl: { type: 'string' },
            deadlineStatus: { type: 'string', enum: ['future', 'today', 'ongoing', 'past', 'unknown'] },
            applicationDeadline: { type: 'string' },
            evidence: { type: 'string' }
          },
          required: [
            'verificationId', 'pageExists', 'exactRolePage', 'titleMatches',
            'companyMatches', 'acceptingApplications', 'applyActionAvailable',
            'applyBelongsToRole', 'rolePageUrl', 'applyUrl', 'deadlineStatus',
            'applicationDeadline', 'evidence'
          ]
        }
      }
    },
    required: ['resolvedJobs']
  }
};

const TALENT_STORY_MEDIA_RESPONSE_SCHEMA = {
  name: 'jumptake_talent_story_media',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mediaMatches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            draftId: { type: 'string' },
            mediaPageUrl: { type: 'string' }
          },
          required: ['draftId', 'mediaPageUrl']
        }
      }
    },
    required: ['mediaMatches']
  }
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
    companyWebsite: String(draft?.companyWebsite || '').trim(),
    body: String(draft?.body || '').trim(),
    source: String(draft?.source || '').trim(),
    sourceTitle: String(draft?.sourceTitle || '').trim(),
    publishedAt: String(draft?.publishedAt || '').trim()
  }))
  .filter((draft) => !hasVagueWorkNewsLead(draft) && (!requireSource || isSpecificWorkNewsSourceUrl(draft.source)))
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
      companyLogoUrl: company.logo || draft.companyLogoUrl || '',
      companyWebsite: company.website || ''
    };
  });
};

const mapWithConcurrency = async (rows, concurrency, mapper) => {
  const values = Array.isArray(rows) ? rows : [];
  const output = new Array(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, Number(concurrency) || 1), values.length || 1) },
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await mapper(values[index], index);
      }
    }
  );
  await Promise.all(workers);
  return output;
};

const enrichCompanyDraftLogos = async (drafts = []) => mapWithConcurrency(drafts, 5, async (draft) => {
  const resolved = await resolveCompanyLogo({
    websiteUrl: draft.website,
    logoUrl: draft.logo
  });
  return {
    ...draft,
    website: resolved.resolvedWebsiteUrl || draft.website,
    logo: resolved.logoUrl || '',
    logoVerified: Boolean(resolved.logoUrl)
  };
});

const WORK_NEWS_MAX_SOURCE_AGE_DAYS = Math.max(
  30,
  Math.min(730, Number(process.env.WORK_NEWS_MAX_SOURCE_AGE_DAYS) || 365)
);

const isCurrentWorkNewsPublication = (value = '') => {
  if (!value) return true;
  const publishedTime = Date.parse(value);
  if (!Number.isFinite(publishedTime)) return false;
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return publishedTime <= now + oneDayMs
    && publishedTime >= now - WORK_NEWS_MAX_SOURCE_AGE_DAYS * oneDayMs;
};

const enrichWorkNewsDraftMedia = async (drafts = [], companyDrafts = []) => {
  const pendingCompaniesByName = new Map(companyDrafts.map((company) => [
    String(company.name || '').trim().toLowerCase(),
    company
  ]));
  const pendingCompaniesByJumpTakeId = new Map(companyDrafts.map((company) => [
    String(company.jumptakeId || '').trim().toLowerCase(),
    company
  ]));

  return mapWithConcurrency(drafts, 5, async (draft) => {
    const pendingCompany = pendingCompaniesByJumpTakeId.get(String(draft.companyJumpTakeId || '').trim().toLowerCase())
      || pendingCompaniesByName.get(String(draft.companyName || '').trim().toLowerCase());
    const media = await resolvePostMedia({
      sourceUrl: draft.source,
      mediaUrl: draft.mediaUrl
    });
    if (draft.source && !media.sourceVerified) return null;
    if (!isCurrentWorkNewsPublication(media.publishedAt)) return null;

    let companyLogoUrl = pendingCompany?.logo || draft.companyLogoUrl || '';
    const alreadyVerified = Boolean(pendingCompany?.logoVerified && pendingCompany.logo === companyLogoUrl);
    if (!alreadyVerified) {
      const companyLogo = await resolveCompanyLogo({
        websiteUrl: pendingCompany?.website || draft.companyWebsite || '',
        logoUrl: companyLogoUrl
      });
      companyLogoUrl = companyLogo.logoUrl || '';
    }

    return {
      ...draft,
      companyLogoUrl,
      source: media.resolvedSourceUrl || draft.source,
      sourceTitle: media.sourceTitle || draft.sourceTitle || '',
      publishedAt: media.publishedAt || '',
      sourceVerifiedAt: media.sourceVerified ? new Date().toISOString() : '',
      mediaUrl: media.mediaUrl || '',
      mediaType: media.mediaType || 'image'
    };
  }).then((rows) => rows.filter(Boolean));
};

const LIVE_JOB_VERIFICATION_BATCH_SIZE = 8;
const LIVE_JOB_VERIFICATION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const normalizeHttpUrl = (value = '') => normalizeVerifiedJobUrl(value);
const isLikelyGenericJobLandingUrl = (value = '') => isVerifiedGenericJobUrl(value);

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

const isProtectedJobBoardDraft = (draft = {}) => {
  try {
    const host = new URL(normalizeHttpUrl(draft.source || draft.applicationLink)).hostname
      .toLowerCase()
      .replace(/^www\./, '');
    return [
      'linkedin.com',
      'gradcracker.com',
      'tal.net',
      'successfactors.com',
      'successfactors.eu'
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
};

const isWebResolutionEligibleFailure = (reason = '', draft = {}) => {
  const message = String(reason || '');
  if (/closed|removed|expired|deadline has passed|different role|generic careers|generic job page|multiple jobs|listings\/search page/i.test(message)) {
    return false;
  }
  if (/does not match the requested|title mismatch|company mismatch/i.test(message)) {
    return isProtectedJobBoardDraft(draft);
  }
  return true;
};

const resolveProtectedJobBoardDrafts = async (drafts = []) => {
  const candidates = (Array.isArray(drafts) ? drafts : []).filter((draft) => (
    draft?.verificationId && isRecognizedRoleDetailUrl(draft.source || draft.applicationLink)
  ));
  if (!candidates.length || !getOpenAIApiKey()) return [];

  const batches = [];
  for (let index = 0; index < candidates.length; index += LIVE_JOB_VERIFICATION_BATCH_SIZE) {
    batches.push(candidates.slice(index, index + LIVE_JOB_VERIFICATION_BATCH_SIZE));
  }

  const resolvedBatches = await Promise.all(batches.map(async (batch) => {
    const verificationPrompt = `You are JumpTake's protected job-board resolver. Use web search and open every supplied exact role URL. Today is ${getTodayIsoDate()}.

For each candidate, open the individual role page, confirm the exact title and company, and activate or inspect its Apply/Apply now action. Return the canonical URL for this one role and the final role-specific application destination. Prefer the employer's exact ATS/requisition page when the aggregator sends applicants externally.

Strict rules:
- Search, keyword results, careers home, company jobs, department, category, and all-jobs URLs are invalid.
- Exact role identity may be an Indeed jk, LinkedIn job ID, Workday details/requisition ID, Amazon job ID, employer vacancy code, UUID, numeric job ID, or other stable role-specific identifier in the URL.
- Examples of valid shapes include /viewjob?jk=<job-id>, /jobs/view/<role>-<job-id>, /details/<role>_<requisition-id>, /jobs/<job-id>/<role>, /job-detail/<role>/<vacancy-code>, /vacancy/<vacancy-code>, /jobs/<uuid>/apply, /opp/<id>-<role>, /careers/?gh_jid=<id>, and /career?...career_job_req_id=<id>&career_ns=job_listing.
- applicationLink must be the destination of this role's Apply action. It may equal rolePageUrl only for an embedded application or platform apply flow.
- Do not turn an inaccessible Apply link into a company careers/search URL.
- Mark every boolean false when the evidence is ambiguous. Never substitute a different role.
- Use a published YYYY-MM-DD deadline only. When no closing date is published but the exact role is visibly active and its Apply action works, mark deadlineStatus ongoing and leave applicationDeadline empty. Never invent a deadline.

Candidates:
${JSON.stringify(batch.map((draft) => ({
    verificationId: draft.verificationId,
    title: draft.title,
    companyName: draft.companyName,
    rolePageUrl: draft.source,
    claimedApplyUrl: draft.applicationLink,
    claimedDeadline: draft.applicationDeadline
  })))}`;

    try {
      const responseText = await askAdminOpenAI(verificationPrompt, {
        useWebSearch: true,
        responseSchema: LIVE_JOB_RESOLUTION_RESPONSE_SCHEMA
      });
      const parsed = parseJsonObjectFromText(responseText) || {};
      const results = Array.isArray(parsed.resolvedJobs) ? parsed.resolvedJobs : [];
      const byId = new Map(results.map((item) => [String(item?.verificationId || ''), item]));

      return batch.map((draft) => {
        const result = byId.get(String(draft.verificationId));
        if (!result
          || result.pageExists !== true
          || result.exactRolePage !== true
          || result.titleMatches !== true
          || result.companyMatches !== true
          || result.acceptingApplications !== true
          || result.applyActionAvailable !== true
          || result.applyBelongsToRole !== true
          || !['future', 'today', 'ongoing'].includes(result.deadlineStatus)) return null;

        const rolePageUrl = normalizeHttpUrl(result.rolePageUrl);
        const applyUrl = normalizeHttpUrl(result.applyUrl);
        const applicationDeadline = result.deadlineStatus === 'ongoing'
          ? ''
          : normalizeApplicationDeadline(result.applicationDeadline);
        const deadlineIsValid = result.deadlineStatus === 'ongoing'
          ? !applicationDeadline
          : Boolean(applicationDeadline && isCurrentApplicationDeadline(applicationDeadline));
        if (!rolePageUrl
          || !applyUrl
          || isLikelyGenericJobLandingUrl(rolePageUrl)
          || isLikelyGenericJobLandingUrl(applyUrl)
          || !isRecognizedRoleDetailUrl(rolePageUrl)
          || !(applyUrl === rolePageUrl || isRoleSpecificApplicationUrl(applyUrl))
          || !deadlineIsValid) return null;

        return {
          ...draft,
          source: rolePageUrl,
          applicationLink: applyUrl,
          applicationDeadline,
          verificationNote: String(result.evidence || 'OpenAI web search verified the protected exact role and its Apply destination.').trim()
        };
      }).filter(Boolean);
    } catch (error) {
      console.warn('[ADMIN ASSISTANT] Protected job-board resolution failed:', error.message);
      return [];
    }
  }));

  return resolvedBatches.flat();
};

const verifyAdminLiveJobDrafts = async (rows, count) => {
  const drafts = normalizeLiveJobDraftRows(rows, count);
  if (!drafts.length || !getLiveJobVerificationSecret()) return [];

  const verification = await verifyLiveJobDraftsAtSource(drafts, {
    concurrency: LIVE_JOB_VERIFICATION_BATCH_SIZE / 2
  });
  verification.rejected.forEach(({ draft, reason }) => {
    console.warn(`[ADMIN ASSISTANT] Rejected ${draft?.companyName || 'unknown company'} / ${draft?.title || 'unknown role'}: ${reason}`);
  });

  const protectedFallbackDrafts = await resolveProtectedJobBoardDrafts(
    verification.rejected
      .filter(({ reason, draft }) => isWebResolutionEligibleFailure(reason, draft))
      .map(({ draft }) => draft)
  );
  const acceptedDrafts = [...verification.accepted, ...protectedFallbackDrafts]
    .sort((left, right) => {
      const leftIndex = Number(String(left.verificationId || '').replace(/\D/g, '')) || 0;
      const rightIndex = Number(String(right.verificationId || '').replace(/\D/g, '')) || 0;
      return leftIndex - rightIndex;
    });

  return acceptedDrafts.map((draft) => {
    const rolePageUrl = normalizeHttpUrl(draft.source);
    const applyUrl = normalizeHttpUrl(draft.applicationLink);
    const applicationDeadline = normalizeApplicationDeadline(draft.applicationDeadline);
    const liveVerifiedAt = new Date().toISOString();
    return {
      ...draft,
      source: rolePageUrl,
      applicationLink: applyUrl,
      applicationDeadline,
      liveVerifiedAt,
      liveVerificationSourceUrl: rolePageUrl,
      liveVerificationUrl: applyUrl,
      liveVerificationNote: String(draft.verificationNote || 'The server opened the exact role page and its Apply destination.').trim(),
      liveVerificationToken: createLiveJobVerificationToken({
        url: applyUrl,
        sourceUrl: rolePageUrl,
        applicationDeadline,
        verifiedAt: liveVerifiedAt
      })
    };
  }).slice(0, count);
};

const getAdminDraftArrayName = (kind) => (
  kind === 'job' ? 'jobDrafts' : kind === 'company' ? 'companyDrafts' : 'workNewsDrafts'
);

const createDraftBatchPrompt = ({ basePrompt, kind, count, batchNumber, totalBatches }) => `${basePrompt}

Draft batch instruction (mandatory):
- This is batch ${batchNumber} of ${totalBatches}.
- Return exactly ${count} distinct ${getAdminDraftArrayName(kind)} in the JSON array.
- ${kind === 'job' ? 'Return only one top-level property named jobDrafts; Structured Outputs will enforce its fields.' : 'Return every other draft array empty.'}
- Do not collapse the drafts into jobForm, companyForm, a summary, or a single example.
- Every array item must be a complete, separately editable draft using the schema above.
- Keep descriptions concise enough to return all ${count} items.
- For jobs, honor the requested location and sector/occupation preferences. Include a specific sector in every job draft and keep sector separate from employment type. Open the exact role page and its Apply button; source must be that one role's canonical detail page and applicationLink must be the final role-specific Apply destination, never a careers home, search, department, company-jobs, or all-jobs page. Prefer the employer's exact ATS/application URL over an aggregator whenever the external Apply button exposes it.
- Valid employer destinations normally contain a stable requisition identity, such as Workday /details/<role>_<id>, Amazon /jobs/<id>/<role>, /job-detail/<role>/<code>, /vacancy/<code>, /job/<numeric-id>/<role>, /jobs/<uuid>/apply, or an application endpoint with a unique job/posting ID.
- For Work News, describe the concrete event, product, result, programme, milestone, or change reported by the source itself. Never write meta-copy such as "published an update about", "shared a post about", or "ongoing work across".
- For Work News, open the cited source and return its direct preview image/video URL in mediaUrl when possible. The server will independently inspect the source page and keep only media that resolves as a real image or video.
- For companies, include a distinct lowercase jumptakeId, profile details, industry, headquarters, website when known, founded year, and a substantive description.
- The admin will review, edit, and manually publish them; do not publish anything.`;

const generateAdminDraftBatches = async ({
  prompt,
  kind,
  requestedCount,
  useWebSearch,
  seedDrafts = [],
  workNewsRequireSource = true,
  existingIdentityKeys = new Set()
}) => {
  const identityKeyFactory = kind === 'job'
    ? jobIdentityKeys
    : kind === 'company'
      ? companyIdentityKeys
      : workNewsDraftIdentityKeys;
  const uniquenessKeys = new Set(existingIdentityKeys || []);
  const drafts = filterUniqueDrafts(
    Array.isArray(seedDrafts) ? seedDrafts : [],
    uniquenessKeys,
    identityKeyFactory,
    requestedCount
  ).rows;
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
      const text = await askAdminOpenAI(batchPrompt, {
        useWebSearch,
        responseSchema: kind === 'job' ? JOB_DRAFTS_RESPONSE_SCHEMA : null
      });
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

  drafts.push(...filterUniqueDrafts(
    results.flat(),
    uniquenessKeys,
    identityKeyFactory,
    requestedCount - drafts.length
  ).rows);

  // Models occasionally under-fill large JSON arrays. Retry only the missing
  // portion in small batches so an explicit quantity remains authoritative.
  for (let retryRound = 1; retryRound <= ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS && drafts.length < requestedCount; retryRound += 1) {
    const stillMissing = requestedCount - drafts.length;
    const retryResults = await Promise.all(Array.from(
      { length: Math.ceil(stillMissing / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE) },
      async (_, index) => {
        const count = Math.min(ADMIN_ASSISTANT_DRAFT_BATCH_SIZE, stillMissing - (index * ADMIN_ASSISTANT_DRAFT_BATCH_SIZE));
        const retryPrompt = createDraftBatchPrompt({
          basePrompt: `${prompt}
Already accepted in this request; do not repeat these either: ${JSON.stringify(drafts.slice(-ADMIN_DEDUPE_PROMPT_LIMIT).map((draft) => createStoredRecordSummary(kind, draft)))}`,
          kind,
          count,
          batchNumber: index + 1,
          totalBatches: Math.ceil(stillMissing / ADMIN_ASSISTANT_DRAFT_BATCH_SIZE)
        });
        try {
          const text = await askAdminOpenAI(`${retryPrompt}\nThis is retry round ${retryRound} for missing drafts. Return the full exact array now.`, {
            useWebSearch,
            responseSchema: kind === 'job' ? JOB_DRAFTS_RESPONSE_SCHEMA : null
          });
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
    drafts.push(...filterUniqueDrafts(
      retryResults.flat(),
      uniquenessKeys,
      identityKeyFactory,
      requestedCount - drafts.length
    ).rows);
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

const createRandomAdminProfileImages = (count, excludedImageKeys = new Set()) => {
  const available = [];
  ['men', 'women'].forEach((presentation) => {
    for (let portraitIndex = 0; portraitIndex < 100; portraitIndex += 1) {
      const dataUrl = `https://randomuser.me/api/portraits/${presentation}/${portraitIndex}.jpg`;
      if (!excludedImageKeys.has(profileImageIdentity(dataUrl))) available.push({ dataUrl });
    }
  });

  for (let index = available.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }

  return available.slice(0, Math.max(0, count)).map(({ dataUrl }, index) => ({
    id: `random-profile-image-${Date.now()}-${index + 1}`,
    name: `Random profile picture ${index + 1}`,
    dataUrl
  }));
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

const createAlphabeticNameMarker = (value) => {
  let number = Math.max(1, Number(value) || 1);
  let marker = '';
  while (number > 0) {
    number -= 1;
    marker = String.fromCharCode(65 + (number % 26)) + marker;
    number = Math.floor(number / 26);
  }
  return marker;
};

const createFallbackCandidateDraft = (index, profileImage = null) => {
  const template = FALLBACK_CANDIDATE_PROFILES[index % FALLBACK_CANDIDATE_PROFILES.length];
  const imageUrl = String(profileImage?.dataUrl || '');
  const apparentPresentation = /\/portraits\/women\//i.test(imageUrl)
    ? 'feminine'
    : (/\/portraits\/men\//i.test(imageUrl) ? 'masculine' : (index % 2 ? 'feminine' : 'masculine'));
  const names = apparentPresentation === 'feminine' ? FALLBACK_FEMININE_NAMES : FALLBACK_MASCULINE_NAMES;
  const baseName = names[index % names.length] || template[apparentPresentation];
  const cycle = Math.floor(index / names.length);
  const name = cycle ? `${baseName.split(' ')[0]} ${createAlphabeticNameMarker(cycle)}. ${baseName.split(' ').slice(1).join(' ')}` : baseName;
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
      body: `This week I completed delivery milestone ${index + 1}: I ${template.project}. I used ${template.skills.split(',').slice(0, 2).join(' and ')} to validate the change and share the result with the wider team.`
    }
  }, profileImage);
};

const createAdminCandidatePrompt = (message, { includePictures = false, profileImages = [], excludedRecords = [] } = {}) => `You are JumpTake Admin AI. Convert the admin request into JSON that drafts candidate user profiles and their talent story posts.

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
        "mediaUrl": "A direct public image/video URL or a public image page that visually matches the achievement, otherwise empty",
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
- Include a concrete action, the method or skill used, and the outcome. Never write a generic passion statement such as "I love helping ideas reach the right audience" or "the best campaigns tell a strong story".
- Use web search to find a professional, visually relevant image for each talentStory. Prefer a royalty-free Unsplash, Pexels, or Pixabay image page, or an official product/project image that clearly matches the work described. Do not reuse the candidate profile portrait, do not use an unrelated company logo, and do not imply that a real person shown in a stock photo is the fictional candidate.
- Put the direct image URL in talentStory.mediaUrl when available. If search exposes only a public image page, put that page URL there so the server can extract its verified preview image. Never invent an image URL.${includePictures ? `
- ${profileImages.length} profile picture${profileImages.length === 1 ? ' is' : 's are'} attached to this request in this exact order: ${profileImages.map((image) => image.id).join(', ')}.
- Return one userDraft per attached picture and preserve the matching sourceImageId exactly.
- Inspect each picture to choose a realistic name that fits its apparent masculine or feminine presentation. Treat that visual impression as uncertain, do not state or store a gender classification, and use a gender-neutral name when presentation is unclear.
- The server will retain the exact attached picture as profileImage, so do not invent, replace, or describe the image URL.` : ''}
- Do not include markdown.
- Do not say the profiles or posts were created. Tell the admin the drafts are ready and they should review each card and click Create Profile and Post Talent Story.

Database uniqueness instruction (mandatory):
- Never reuse an exact candidate name, email, JumpTake ID, profile picture, or Talent Story body already in JumpTake.
- Punctuation, capitalization, whitespace, and image query parameters do not make an item different.
- Replace every collision with a genuinely new candidate and a genuinely new completed-work story.
Existing candidate and Talent Story records: ${JSON.stringify((Array.isArray(excludedRecords) ? excludedRecords : []).slice(-ADMIN_DEDUPE_PROMPT_LIMIT))}

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

const generateAdminCandidateDraftBatches = async ({
  message,
  requestedCount,
  useWebSearch,
  includePictures = false,
  profileImages = [],
  seedDrafts = [],
  existingIdentityKeys = new Set(),
  excludedRecords = []
}) => {
  const uniquenessKeys = new Set(existingIdentityKeys || []);
  const drafts = filterUniqueDrafts(
    Array.isArray(seedDrafts) ? seedDrafts : [],
    uniquenessKeys,
    talentStoryDraftIdentityKeys,
    requestedCount
  ).rows;
  const remaining = requestedCount - drafts.length;
  if (remaining <= 0) return drafts;

  const createBatches = (count, availableImages) => {
    const batches = [];
    for (let startIndex = 0; startIndex < count; startIndex += ADMIN_CANDIDATE_DRAFT_BATCH_SIZE) {
      const batchCount = Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, count - startIndex);
      batches.push({
        count: batchCount,
        batchImages: availableImages.slice(startIndex, startIndex + batchCount)
      });
    }
    return batches;
  };

  const requestBatches = async (count, retryRound = 0) => {
    const usedImageIds = new Set(drafts.map((draft) => String(draft.sourceImageId || '')).filter(Boolean));
    const availableImages = profileImages.filter((image) => !usedImageIds.has(String(image.id || '')));
    const batches = createBatches(count, availableImages);
    const results = await Promise.all(batches.map(async ({ count: batchCount, batchImages }, index) => {
      try {
        const batchPrompt = createCandidateBatchPrompt({
          basePrompt: createAdminCandidatePrompt(message, {
            includePictures,
            profileImages: batchImages,
            excludedRecords: [
              ...excludedRecords,
              ...drafts.map((draft) => createStoredRecordSummary('candidate', draft))
            ]
          }),
          count: batchCount,
          batchNumber: index + 1,
          totalBatches: batches.length
        });
        const retryInstruction = retryRound
          ? `\nThis is retry round ${retryRound}. Earlier collisions were removed, so return genuinely different candidates and stories.`
          : '';
        const text = await askAdminOpenAI(`${batchPrompt}${retryInstruction}`, {
          useWebSearch,
          images: batchImages
        });
        const parsed = parseJsonObjectFromText(text) || {};
        const rows = Array.isArray(parsed.userDrafts) ? parsed.userDrafts : [];
        return rows.slice(0, batchCount).map((draft, rowIndex) => {
          const matchedImage = batchImages.find((image) => image.id === draft?.sourceImageId) || batchImages[rowIndex];
          return normalizeGeneratedCandidateDraft(draft, matchedImage);
        });
      } catch (error) {
        console.warn(`[ADMIN ASSISTANT] candidate draft batch ${index + 1} failed:`, error.message);
        return [];
      }
    }));
    drafts.push(...filterUniqueDrafts(
      results.flat(),
      uniquenessKeys,
      talentStoryDraftIdentityKeys,
      requestedCount - drafts.length
    ).rows);
  };

  await requestBatches(remaining);
  for (let retryRound = 1; retryRound <= ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS && drafts.length < requestedCount; retryRound += 1) {
    await requestBatches(requestedCount - drafts.length, retryRound);
  }

  let fallbackIndex = 0;
  while (drafts.length < requestedCount && fallbackIndex < requestedCount * 100 + 1000) {
    const usedImageIds = new Set(drafts.map((draft) => String(draft.sourceImageId || '')).filter(Boolean));
    const profileImage = profileImages.find((image) => !usedImageIds.has(String(image.id || '')));
    const candidate = createFallbackCandidateDraft(fallbackIndex, profileImage);
    const uniqueCandidate = filterUniqueDrafts(
      [candidate],
      uniquenessKeys,
      talentStoryDraftIdentityKeys,
      1
    ).rows[0];
    if (uniqueCandidate) drafts.push(uniqueCandidate);
    fallbackIndex += 1;
  }

  return drafts.slice(0, requestedCount);
};

const enrichCandidateTalentStoryMedia = async (drafts = [], { useWebSearch = false } = {}) => {
  let enriched = await mapWithConcurrency(drafts, 6, async (draft) => {
    const requestedMediaUrl = String(draft?.talentStory?.mediaUrl || '').trim();
    if (!requestedMediaUrl) return draft;
    const media = await resolvePostMedia({ mediaUrl: requestedMediaUrl });
    return {
      ...draft,
      talentStory: {
        ...draft.talentStory,
        mediaUrl: media.mediaUrl || '',
        mediaType: media.mediaType || 'image'
      }
    };
  });

  if (!useWebSearch || !getOpenAIApiKey()) return enriched;
  const missing = enriched
    .map((draft, index) => ({ draft, index, draftId: `talent-media-${index + 1}` }))
    .filter(({ draft }) => !draft?.talentStory?.mediaUrl);

  for (let start = 0; start < missing.length; start += 8) {
    const batch = missing.slice(start, start + 8);
    const prompt = `You are JumpTake Admin AI's talent-story media researcher. Use web search to find one professional image that visually matches each fictional candidate's completed work or achievement.

Rules:
- Prefer royalty-free Unsplash, Pexels, or Pixabay image pages, or a public official product/project image.
- Match the actual activity in the story, such as software testing, dashboard analysis, campaign work, design prototyping, healthcare, hospitality, or logistics.
- Do not return candidate portraits, headshots, company logos, search-result pages, private URLs, data URLs, or invented URLs.
- A direct image URL is ideal. A public photo/article page with a valid Open Graph preview image is acceptable.
- Return an empty mediaPageUrl when no trustworthy match can be found.

Talent stories:
${JSON.stringify(batch.map(({ draft, draftId }) => ({
    draftId,
    role: draft.jobTitle,
    skills: draft.skills,
    story: draft.talentStory?.body
  })))}`;

    try {
      const responseText = await askAdminOpenAI(prompt, {
        useWebSearch: true,
        responseSchema: TALENT_STORY_MEDIA_RESPONSE_SCHEMA
      });
      const parsed = parseJsonObjectFromText(responseText) || {};
      const matches = new Map((Array.isArray(parsed.mediaMatches) ? parsed.mediaMatches : [])
        .map((item) => [String(item?.draftId || ''), String(item?.mediaPageUrl || '').trim()]));
      const resolvedBatch = await mapWithConcurrency(batch, 4, async ({ draftId, index }) => {
        const mediaPageUrl = matches.get(draftId);
        if (!mediaPageUrl) return null;
        const media = await resolvePostMedia({ mediaUrl: mediaPageUrl });
        return media.mediaUrl ? { index, media } : null;
      });
      resolvedBatch.filter(Boolean).forEach(({ index, media }) => {
        enriched[index] = {
          ...enriched[index],
          talentStory: {
            ...enriched[index].talentStory,
            mediaUrl: media.mediaUrl,
            mediaType: media.mediaType
          }
        };
      });
    } catch (error) {
      console.warn('[ADMIN ASSISTANT] Talent Story media search failed:', error.message);
    }
  }

  return enriched;
};

const getLiveJobReplenishRounds = (targetCount) => Math.min(
  ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS,
  Math.max(4, Math.ceil(Math.max(1, Number(targetCount) || 1) / 20) + 2)
);

const collectRequestedVerifiedLiveJobs = async ({
  prompt,
  initialDrafts,
  requestedCount,
  existingIdentityKeys = new Set(),
  publicJobPreferences = null
}) => {
  const targetCount = Math.min(ADMIN_ASSISTANT_MAX_DRAFTS, Math.max(1, Number(requestedCount) || 1));
  const checkedKeys = new Set(existingIdentityKeys || []);
  const verifiedKeys = new Set(existingIdentityKeys || []);
  const verifiedDrafts = [];
  let checkedCount = 0;

  const verifyCandidates = async (rows) => {
    const uniqueRows = filterUniqueDrafts(
      rows,
      checkedKeys,
      jobIdentityKeys,
      Math.min(1000, targetCount * 8)
    ).rows;
    if (!uniqueRows.length) return 0;

    let processedCount = 0;
    for (let start = 0; start < uniqueRows.length && verifiedDrafts.length < targetCount; start += 12) {
      const chunk = uniqueRows.slice(start, start + 12);
      processedCount += chunk.length;
      checkedCount += chunk.length;
      const verifiedRows = await verifyAdminLiveJobDrafts(chunk, chunk.length);
      verifiedRows.forEach((draft) => {
        const keys = jobIdentityKeys(draft);
        if (keys.some((key) => verifiedKeys.has(key)) || verifiedDrafts.length >= targetCount) return;
        addIdentityKeys(verifiedKeys, keys);
        verifiedDrafts.push(draft);
      });
    }
    return processedCount;
  };

  await verifyCandidates(initialDrafts);

  const preferences = publicJobPreferences || {};
  const replenishRounds = getLiveJobReplenishRounds(targetCount);
  for (let round = 1; round <= replenishRounds && verifiedDrafts.length < targetCount; round += 1) {
    const missingCount = targetCount - verifiedDrafts.length;
    const searchCount = Math.min(targetCount, Math.max(20, missingCount * 2));
    const excludedUrls = [...checkedKeys]
      .filter((key) => key.startsWith('job-url:'))
      .map((key) => key.slice('job-url:'.length))
      .slice(-400);
    const supplementPrompt = `${prompt}

Additional verified-job search round ${round}:
- ${verifiedDrafts.length} of ${targetCount} requested jobs have passed verification; find ${missingCount} more.
- Generate ${searchCount} additional distinct live job candidates so closed or unverifiable results can be replaced.
- Search different employers and exact role-detail pages from earlier batches. Do not return career home pages, department pages, job indexes, search results, or all-jobs pages.
- Open each role, follow its Apply button, and return that final role-specific destination in applicationLink.
- Do not return any source URL already checked below.
Already checked URLs: ${JSON.stringify(excludedUrls)}`;
    const sourceTarget = Math.min(1000, Math.max(100, searchCount * 8));
    const sourceResults = await Promise.allSettled([
      fetchGreenhouseCandidates({
        query: String(preferences.sectors || '').trim(),
        location: String(preferences.location || '').trim(),
        count: sourceTarget,
        excludedUrls
      }),
      process.env.RAPIDAPI_KEY
        ? fetchJSearchCandidates({
          query: String(preferences.sectors || prompt || 'jobs').trim(),
          location: String(preferences.location || '').trim(),
          count: Math.min(100, sourceTarget)
        })
        : Promise.resolve([]),
      discoverOpenAIJobCandidates({
        message: supplementPrompt,
        preferences,
        count: Math.min(20, searchCount),
        excludedUrls
      })
    ]);
    const additionalDrafts = sourceResults.flatMap((result) => (
      result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
    ));
    sourceResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const sourceName = ['Greenhouse', 'JSearch', 'OpenAI web search'][index];
        console.warn(`[ADMIN ASSISTANT] ${sourceName} replenish round ${round} failed:`, result.reason?.message || result.reason);
      }
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
  "action": "fillCompany" | "fillJob" | "fillBoth" | "draftCompanies" | "draftWorkNews" | "draftCompaniesAndWorkNews" | "reply",
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
      "companyWebsite": "official company website",
      "companyLogoUrl": "",
      "body": "",
      "mediaUrl": "",
      "mediaType": "image",
      "source": "",
      "sourceTitle": "",
      "publishedAt": "YYYY-MM-DD when the source publishes a date"
    }
  ]
}

Rules:
- Fill only fields that can be inferred from the request.
- If the admin asks for multiple company profiles/users/drafts, return companyDrafts instead of one companyForm. Return exactly the requested number when possible.
- A request can ask for companyDrafts and workNewsDrafts together. In that case return both arrays with the requested quantity in each; never reinterpret company users as candidate users.
- When Work News belongs to companies created in the same request, use the exact company name and company JumpTake ID from companyDrafts in the matching workNewsDraft. Create one sourced update per company before creating a second update for any company.
- Every companyDraft requires a distinct readable lowercase jumptakeId made from its company name plus four digits, for example northstar-labs-4821. Do not use @, spaces, or underscores.
- Give every company a complete, specific profile with industry, headquarters, founded year, description, and website when it is a real company. Do not copy one generic description across the drafts.
- For every real companyDraft, use the company's official public website and put its official logo image URL in logo when one is discoverable. Never use an unrelated stock image, generated avatar, or another company's mark. The server will independently verify and replace this value from the official site.
- If the admin asks to post/create a job, fill jobForm. If they provide a company ID such as ez1231231, put it in jobForm.company.
- If the admin asks for multiple/latest/web jobs, return jobDrafts instead of one jobForm.
- For requests like "post 10 latest jobs from the web", use web search and collect exactly the requested number when possible, otherwise as many reliable current jobs as you can find.
- Only draft jobs whose exact source page is live today and currently accepting applications. A published closing deadline must be today or later; an active role with no published closing date is allowed only when its Apply action is visibly available and verified. Exclude expired, closed, filled, archived, removed, missing, or unverifiable listings.
- When web/latest jobs are requested, you have access to web search through the API tool. Do not claim you cannot browse, cannot access live web jobs, or need a browsing-enabled feed.
- Search sources such as Indeed, Gradcracker, RateMyPlacement, LinkedIn, company career systems, and other reliable job sites, but open the individual role result before returning it.
- source must be the canonical detail page for exactly that title and company. Never use a careers homepage, employer job board, department page, all-jobs page, search page, filtered results URL, or bare domain.
- On the exact role page, inspect and follow the Apply, Apply now, Submit application, or equivalent button. applicationLink must be that final role-specific destination after redirects. It may equal source only when the application form is embedded on the exact role page or the Apply action has no separate URL.
- Recognise exact aggregator detail URLs by their role identity: Indeed /viewjob?jk=<job-id>, LinkedIn /jobs/view/<role-slug>-<job-id>, Gradcracker /hub/<employer-id>/<employer>/<job-type>/<job-id>/<role>, and RateMyPlacement/Higherin /jobs/<job-id>/<company>/<role>. Their search, company jobs, and listing URLs are invalid.
- Recognise exact employer/ATS URLs by a stable requisition identity: Workday /details/<role>_<id>, Amazon /jobs/<id>/<role>, /job-detail/<role>/<code>, /vacancy/<code>, /job/<numeric-id>/<role>, /jobs/<uuid>/apply, or an application endpoint containing a unique job/posting ID. Discover and verify equivalent exact-role patterns from other employers rather than limiting searches to these examples.
- When an aggregator's Apply action leaves that site, use the final employer ATS page for this exact requisition. Do not shorten it to the ATS home, employer careers page, or keyword search URL.
- Reject any result when the exact role page or its Apply action cannot be opened and verified. Never substitute the company's general careers page.
- For every jobDraft include title, companyName, location, sector, applicationLink/source URL, applicationDeadline, jobType, description, requirements, responsibilities, skills, and salary if available.
- Treat sector as a free-form occupation or industry category, not an employment arrangement. It may be Technology, Health, Medical, Business, Economics, Supply Chain, Hospitality, Barista, Coffee Maker, Restaurant Work, Pharmacy, Computer Science, or any other role/sector requested by the admin.
- Apply Job draft preferences to every generated job unless the admin message gives a more specific instruction. When sectors says "all", create a genuinely varied set across the widest practical range of occupations rather than mostly technology roles.
- Read applicationDeadline from the exact role source and return it as YYYY-MM-DD. If the active role genuinely publishes no closing date, leave applicationDeadline blank. Never estimate or invent a deadline.
- jobDraft.company should be a stable admin company ID based on the company name, lowercase words joined with hyphens, unless the prompt provides a specific company ID.
- Put the exact canonical role-detail URL in source and the final URL behind that role's Apply action in applicationLink.
- Do not say the jobs were posted. Tell the admin the drafts are ready and they can review individual cards, use Post Job, or use Post All.
- Do not fabricate job details. Leave unknown fields blank.
- If the admin asks to post/create Work News, company updates, LinkedIn updates, or feed posts from the live web, return workNewsDrafts instead of jobDrafts.
- When the admin asks for posts for existing JumpTake companies without asking for live web news, use the matching records in Available JumpTake companies. Copy the exact companyId, companyJumpTakeId, companyName, and logo into each draft. Write specific posts about work completed, a problem solved, a product or programme created, a milestone, or an achievement. Do not write generic brand statements.
- For requests like "post on work news make 10 drafts from the live web", use web search and collect exactly the requested number when possible, otherwise as many reliable current company updates as you can find.
- Search LinkedIn public results, company newsrooms, company blogs, official social posts, and reliable business news pages. Prefer original company pages when LinkedIn is unavailable.
- Live-web workNewsDrafts must include companyName, source URL, sourceTitle when available, and a concise JumpTake Work News body. Paraphrase the update; do not copy long text verbatim.
- Put the company's official public homepage in companyWebsite. It is used to verify and recover the correct company profile picture when a direct logo URL is unavailable.
- source must be the exact live article, press release, newsroom item, or official post that contains the reported update. Never cite a company homepage, newsroom index, news search, topic listing, or bare domain.
- Only use currently relevant news. Read the source's published date into publishedAt as YYYY-MM-DD when it is shown; never invent a date, and exclude archived or stale updates.
- Original posts for existing Available JumpTake companies may leave source and sourceTitle blank, but must include that company's exact companyId and companyJumpTakeId.
- The body must report the substance of the source: the specific launch, result, product change, programme, partnership, investment, achievement, or workplace development, including concrete names, figures, dates, or outcomes when the source provides them.
- Write the body as the actual news update itself. Never introduce it with meta-language such as "published a company update about", "shared a post about", "released a report about", "ongoing work across", or "in its reporting materials".
- Open the source and use details from its content. A body that merely says who posted or published something is not a usable Work News draft.
- Actively search for the company's official logo/profile image using the company website, newsroom, public social profile, or reliable brand/profile pages. Put a direct company logo or profile image URL in companyLogoUrl only when a reliable direct image URL is available. Otherwise leave it blank so JumpTake can use its default icon.
- Put a direct image URL from the update in mediaUrl only when a reliable direct image URL is available. mediaType must be image or video. If no media exists or the URL is not direct, leave mediaUrl blank.
- For every live Work News draft, inspect the cited source's Open Graph image/video, embedded video sources, structured article media, and main article imagery. Prefer media belonging to that exact update over generic company artwork. The server will verify and extract the final displayable URL from source.
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

router.patch('/companies/:id/logo', async (req, res) => {
  try {
    const logo = String(req.body?.logo || '').trim();
    const isImageDataUrl = /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,/i.test(logo);
    const isRemoteImage = /^https?:\/\/\S+$/i.test(logo);

    if (logo && !isImageDataUrl && !isRemoteImage) {
      return res.status(400).json({ error: 'Use an image upload or a valid image URL' });
    }

    if (logo.length > 3 * 1024 * 1024) {
      return res.status(413).json({ error: 'Company profile picture is too large' });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: { logo } },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json({ item: serializeDocument(company) });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    return res.status(error.status || 500).json({ error: error.message });
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
      const error = new Error('This exact role page or Apply link is no longer verified. Ask Admin AI to check the job again.');
      error.status = 409;
      throw error;
    }
  }

  const resolvedCompany = await resolveAdminJobCompany(company, companyName);
  const normalizedApplicationUrl = sourceUrl ? normalizeHttpUrl(applicationLink) : applicationLink;
  const sourceFingerprint = sourceUrl
    ? crypto.createHash('sha256').update(sourceUrl).digest('hex')
    : '';
  const existingCompanyJobs = await Job.find({ company: resolvedCompany.company._id })
    .select('title location sourceUrl applicationLink')
    .lean();
  const duplicateJob = findIdentityCollision(
    existingCompanyJobs.map((job) => ({ ...job, companyName: resolvedCompany.company.name })),
    { title, location, source: sourceUrl, applicationLink: normalizedApplicationUrl, companyName: resolvedCompany.company.name },
    jobIdentityKeys
  );
  if (duplicateJob) {
    const error = new Error('This job already exists in JumpTake. Ask Admin AI for a different live role.');
    error.status = 409;
    throw error;
  }
  const jobValues = {
    title,
    description,
    company: resolvedCompany.company._id,
    adminCompanyId: resolvedCompany.adminCompanyId,
    location,
    sector: String(sector || resolvedCompany.company.industry || 'General').trim(),
    salary,
    applicationLink: normalizedApplicationUrl,
    applicationDeadline: normalizedDeadline || null,
    sourceUrl: sourceUrl || '',
    ...(sourceFingerprint ? { sourceFingerprint } : {}),
    sourceStatus: sourceUrl ? 'verified' : '',
    sourceVerifiedAt: sourceUrl ? new Date(liveVerifiedAt) : null,
    jobType,
    requirements: Array.isArray(requirements) ? requirements : String(requirements || '').split('\n').map((item) => item.trim()).filter(Boolean),
    responsibilities: Array.isArray(responsibilities) ? responsibilities : String(responsibilities || '').split('\n').map((item) => item.trim()).filter(Boolean),
    skills: Array.isArray(skills) ? skills : String(skills || '').split(',').map((skill) => skill.trim()).filter(Boolean),
    active: true,
    updatedAt: new Date()
  };

  return Job.create(jobValues);
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

    const storedCompanies = await Company.find({}).select('name jumptakeId website logo').lean();
    if (findIdentityCollision(storedCompanies, { name, jumptakeId, website, logo }, companyIdentityKeys)) {
      return res.status(409).json({ error: 'This company name, website, JumpTake ID, or profile picture already exists.' });
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
    const sourcePublishedAt = req.body?.publishedAt && Number.isFinite(Date.parse(req.body.publishedAt))
      ? new Date(req.body.publishedAt)
      : null;
    const mediaUrl = validateAdminPostMediaUrl(req.body?.mediaUrl);
    const mediaType = req.body?.mediaType === 'video' ? 'video' : 'image';

    if (!body && !mediaUrl) {
      return res.status(400).json({ error: 'Write something or attach media before posting' });
    }

    const storedWorkNews = await FeedPost.find({ type: 'work-news' })
      .select('type body authorName authorId source')
      .lean();
    if (findIdentityCollision(storedWorkNews, {
      type: 'work-news',
      body,
      authorName,
      authorId: String(linkedCompany?._id || requestedAuthorId),
      source
    }, feedPostIdentityKeys)) {
      return res.status(409).json({ error: 'This Work News source or company post already exists.' });
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
      sourceTitle,
      sourcePublishedAt
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

    const storedProfiles = await JobSeeker.find({}).select('name email profileImage').lean();
    if (findIdentityCollision(storedProfiles, {
      name,
      email: req.body?.email,
      profileImage
    }, candidateIdentityKeys)) {
      return res.status(409).json({ error: 'This candidate name, email, or profile picture already exists.' });
    }

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

    const storedTalentStories = await FeedPost.find({ type: 'talent-story' })
      .select('type body authorName authorId')
      .lean();
    if (findIdentityCollision(storedTalentStories, {
      type: 'talent-story',
      body,
      authorName,
      authorId
    }, feedPostIdentityKeys)) {
      return res.status(409).json({ error: 'This candidate Talent Story already exists.' });
    }

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
    let uploadedProfileImages = normalizeAdminProfileImages(req.body?.profileImages);
    const {
      wantsCandidateDrafts,
      wantsCompanyInfo,
      wantsCompanyProfileDrafts,
      wantsJobDrafts,
      wantsLiveCompanyProfiles,
      wantsLiveWorkNews,
      wantsWebJobs,
      wantsWorkNewsDrafts
    } = detectAdminAssistantIntent(message, { hasProfileImages: uploadedProfileImages.length > 0 });
    const wantsCandidateProfilePictures = wantsCandidateDrafts
      && (uploadedProfileImages.length > 0 || !/\b(without|no)\s+(?:profile\s+)?(?:pictures?|photos?|images?|headshots?)\b/i.test(message));
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
    const pendingDrafts = req.body?.existingDrafts || {};
    const draftExclusions = addPendingAdminDraftExclusions(await loadAdminDraftExclusions({
      jobs: wantsJobDrafts || wantsWebJobs,
      companies: wantsCompanyProfileDrafts,
      candidates: wantsCandidateDrafts,
      workNews: wantsWorkNewsDrafts
    }), {
      jobs: (wantsJobDrafts || wantsWebJobs) ? pendingDrafts.jobs : [],
      companies: wantsCompanyProfileDrafts ? pendingDrafts.companies : [],
      candidates: wantsCandidateDrafts ? pendingDrafts.candidates : [],
      workNews: wantsWorkNewsDrafts ? pendingDrafts.workNews : []
    });
    const uploadedImageKeys = new Set(draftExclusions.profileImageKeys);
    uploadedProfileImages = uploadedProfileImages.filter((image) => {
      const key = profileImageIdentity(image.dataUrl);
      if (key && uploadedImageKeys.has(key)) return false;
      if (key) uploadedImageKeys.add(key);
      return true;
    });
    const prompt = appendAdminDuplicateExclusions(createAdminAssistantPrompt({
      message,
      companyForm,
      jobForm: req.body?.jobForm || {},
      jobDraftPreferences: req.body?.jobDraftPreferences || {},
      availableCompanies
    }), draftExclusions.promptRecords);
    const requestedJobDraftCount = getRequestedDraftCount(message, {
      enabled: wantsJobDrafts || wantsWebJobs,
      kind: 'job',
      max: ADMIN_ASSISTANT_MAX_DRAFTS
    });
    const requestedCompanyDraftCount = getRequestedDraftCount(message, {
      enabled: wantsCompanyProfileDrafts,
      kind: 'company',
      max: ADMIN_ASSISTANT_MAX_DRAFTS
    });
    const requestedWorkNewsDraftCount = getRequestedDraftCount(message, {
      enabled: wantsWorkNewsDrafts,
      kind: 'work-news',
      max: ADMIN_ASSISTANT_MAX_DRAFTS
    });
    const requestedCandidateDraftCount = wantsCandidateDrafts
      ? Math.max(getRequestedDraftCount(message, {
        kind: 'candidate',
        max: ADMIN_ASSISTANT_MAX_DRAFTS
      }), uploadedProfileImages.length)
      : 0;
    const randomProfileImageCount = wantsCandidateProfilePictures
      ? Math.max(0, requestedCandidateDraftCount - uploadedProfileImages.length)
      : 0;
    const candidateProfileImages = [
      ...uploadedProfileImages,
      ...createRandomAdminProfileImages(randomProfileImageCount, uploadedImageKeys)
    ];
    const initialCandidateImages = candidateProfileImages.slice(0, Math.min(ADMIN_CANDIDATE_DRAFT_BATCH_SIZE, requestedCandidateDraftCount));
    const candidatePrompt = wantsCandidateDrafts
      ? createAdminCandidatePrompt(message, {
        includePictures: wantsCandidateProfilePictures,
        profileImages: initialCandidateImages,
        excludedRecords: draftExclusions.promptRecords
      })
      : prompt;
    const hasMissingCompanyDetails = !companyForm.industry || !companyForm.headquarters || !companyForm.website || !companyForm.founded || !companyForm.description;
    const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false'
      && (wantsWebJobs || wantsLiveWorkNews || wantsLiveCompanyProfiles || wantsCandidateDrafts || (!wantsCompanyProfileDrafts && wantsCompanyInfo && hasMissingCompanyDetails));
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
    let aiText = '';
    let openAIProviderError = '';
    if (!(initialDraftKind === 'job' && wantsWebJobs)) {
      try {
        aiText = await askAdminOpenAI(initialPrompt, {
          useWebSearch,
          images: initialDraftKind === 'candidate' ? initialCandidateImages : [],
          responseSchema: initialDraftKind === 'job' ? JOB_DRAFTS_RESPONSE_SCHEMA : null
        });
      } catch (error) {
        openAIProviderError = String(error.response?.data?.error?.message || error.message || 'OpenAI request failed');
        console.warn('[ADMIN ASSISTANT] Initial OpenAI request failed:', openAIProviderError);
        throw createAdminOpenAIProviderError(error);
      }
    }
    let parsed = parseJsonObjectFromText(aiText) || createFallbackAdminAssistantPlan(message);
    let jobDrafts = filterUniqueDrafts(
      Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts : [],
      new Set(draftExclusions.jobKeys),
      jobIdentityKeys,
      requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    ).rows;
    let companyDrafts = filterUniqueDrafts(
      normalizeCompanyDraftRows(parsed.companyDrafts, requestedCompanyDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS),
      new Set(draftExclusions.companyKeys),
      companyIdentityKeys,
      requestedCompanyDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    ).rows;
    let workNewsDrafts = filterUniqueDrafts(
      normalizeWorkNewsDraftRows(
        parsed.workNewsDrafts,
        requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS,
        { requireSource: wantsLiveWorkNews }
      ),
      new Set(draftExclusions.workNewsKeys),
      workNewsDraftIdentityKeys,
      requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    ).rows;
    let userDrafts = filterUniqueDrafts(Array.isArray(parsed.userDrafts)
      ? parsed.userDrafts
        .slice(0, requestedCandidateDraftCount || ADMIN_CANDIDATE_DRAFT_BATCH_SIZE)
        .map((draft, index) => {
          const matchedImage = initialCandidateImages.find((image) => image.id === draft?.sourceImageId) || initialCandidateImages[index];
          return normalizeGeneratedCandidateDraft(draft, matchedImage);
        })
      : [], new Set(draftExclusions.candidateKeys), talentStoryDraftIdentityKeys, requestedCandidateDraftCount || ADMIN_CANDIDATE_DRAFT_BATCH_SIZE).rows;

    let usedPublicJobSource = false;
    if (wantsWebJobs) {
      const preferences = req.body?.jobDraftPreferences || {};
      const sourceCandidateTarget = Math.min(
        1000,
        Math.max(100, (requestedJobDraftCount || ADMIN_ASSISTANT_DRAFT_BATCH_SIZE) * 6)
      );
      const excludedSourceUrls = [...draftExclusions.jobKeys]
        .filter((key) => key.startsWith('job-url:'))
        .map((key) => key.slice('job-url:'.length))
        .slice(-400);
      const [greenhouseResult, jSearchResult, openAIWebResult] = await Promise.allSettled([
        fetchGreenhouseCandidates({
          query: String(preferences.sectors || '').trim(),
          location: String(preferences.location || '').trim(),
          count: sourceCandidateTarget,
          excludedUrls: excludedSourceUrls
        }),
        process.env.RAPIDAPI_KEY
          ? fetchJSearchCandidates({
            query: String(preferences.sectors || message || 'jobs').trim(),
            location: String(preferences.location || '').trim(),
            count: Math.min(100, sourceCandidateTarget)
          })
          : Promise.resolve([]),
        useWebSearch
          ? discoverOpenAIJobCandidates({
            message,
            preferences,
            count: Math.min(20, Math.max(8, requestedJobDraftCount || 8)),
            excludedUrls: excludedSourceUrls
          })
          : Promise.resolve([])
      ]);
      const greenhouseDrafts = greenhouseResult.status === 'fulfilled' ? greenhouseResult.value : [];
      const aggregatorDrafts = jSearchResult.status === 'fulfilled' ? jSearchResult.value : [];
      const openAIWebDrafts = openAIWebResult.status === 'fulfilled' ? openAIWebResult.value : [];
      if (greenhouseResult.status === 'rejected') {
        console.warn('[ADMIN ASSISTANT] Greenhouse source fetch failed:', greenhouseResult.reason?.message || greenhouseResult.reason);
      }
      if (jSearchResult.status === 'rejected') {
        console.warn('[ADMIN ASSISTANT] JSearch candidate fetch failed:', jSearchResult.reason?.message || jSearchResult.reason);
      }
      if (openAIWebResult.status === 'rejected') {
        console.warn('[ADMIN ASSISTANT] OpenAI job source discovery failed; continuing with direct providers:', openAIWebResult.reason?.message || openAIWebResult.reason);
      }
      usedPublicJobSource = greenhouseDrafts.length > 0 || aggregatorDrafts.length > 0 || openAIWebDrafts.length > 0;
      jobDrafts = filterUniqueDrafts(
        [...openAIWebDrafts, ...aggregatorDrafts, ...greenhouseDrafts, ...jobDrafts],
        new Set(draftExclusions.jobKeys),
        jobIdentityKeys,
        sourceCandidateTarget
      ).rows;
    }

    if (requestedJobDraftCount > 1 && !jobDrafts.length && parsed.jobForm && Object.keys(parsed.jobForm).length) {
      jobDrafts = filterUniqueDrafts(
        [parsed.jobForm],
        new Set(draftExclusions.jobKeys),
        jobIdentityKeys,
        requestedJobDraftCount
      ).rows;
    }
    if (requestedWorkNewsDraftCount > 0 && parsed.workNewsDraft && typeof parsed.workNewsDraft === 'object') {
      workNewsDrafts = filterUniqueDrafts(
        normalizeWorkNewsDraftRows(
          [...workNewsDrafts, parsed.workNewsDraft],
          requestedWorkNewsDraftCount,
          { requireSource: wantsLiveWorkNews }
        ),
        new Set(draftExclusions.workNewsKeys),
        workNewsDraftIdentityKeys,
        requestedWorkNewsDraftCount
      ).rows;
    }

    if (wantsWebJobs && useWebSearch && !jobDrafts.length && looksLikeWebJobRefusal(`${parsed.reply || ''} ${aiText || ''}`)) {
      const retryPrompt = `${prompt}

Strict retry:
- The admin requested live web job drafts.
- You must use the web search tool now.
- Return JSON with jobDrafts filled from current search results.
- Do not return a refusal or ask the admin for source/company details.
- If fewer than the requested number are found, return the reliable ones you found.`;
      aiText = await askAdminOpenAI(retryPrompt, {
        useWebSearch: true,
        responseSchema: JOB_DRAFTS_RESPONSE_SCHEMA
      });
      parsed = parseJsonObjectFromText(aiText) || parsed;
      jobDrafts = filterUniqueDrafts(
        Array.isArray(parsed.jobDrafts) ? parsed.jobDrafts : [],
        new Set(draftExclusions.jobKeys),
        jobIdentityKeys,
        requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
      ).rows;
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
      workNewsDrafts = filterUniqueDrafts(
        normalizeWorkNewsDraftRows(
          parsed.workNewsDrafts,
          requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS,
          { requireSource: true }
        ),
        new Set(draftExclusions.workNewsKeys),
        workNewsDraftIdentityKeys,
        requestedWorkNewsDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
      ).rows;
    }

    if (requestedCompanyDraftCount > companyDrafts.length) {
      companyDrafts = await generateAdminDraftBatches({
        prompt,
        kind: 'company',
        requestedCount: requestedCompanyDraftCount,
        useWebSearch: wantsLiveCompanyProfiles || useWebSearch,
        seedDrafts: companyDrafts,
        existingIdentityKeys: draftExclusions.companyKeys
      });
    }
    if (!wantsLiveCompanyProfiles && requestedCompanyDraftCount > companyDrafts.length) {
      const companyKeys = new Set(draftExclusions.companyKeys);
      companyDrafts = filterUniqueDrafts(companyDrafts, companyKeys, companyIdentityKeys, requestedCompanyDraftCount).rows;
      let fallbackIndex = 0;
      while (companyDrafts.length < requestedCompanyDraftCount && fallbackIndex < requestedCompanyDraftCount * 100 + 1000) {
        const fallback = createFallbackCompanyDraft(fallbackIndex);
        const uniqueFallback = filterUniqueDrafts([fallback], companyKeys, companyIdentityKeys, 1).rows[0];
        if (uniqueFallback) companyDrafts.push(uniqueFallback);
        fallbackIndex += 1;
      }
    }
    companyDrafts = normalizeCompanyDraftRows(
      companyDrafts,
      requestedCompanyDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
    );
    companyDrafts = await enrichCompanyDraftLogos(companyDrafts);

    const workNewsPrompt = requestedCompanyDraftCount && requestedWorkNewsDraftCount && companyDrafts.length
      ? `${prompt}

Companies created by this same request (mandatory Work News targets):
${JSON.stringify(companyDrafts.map(({ name, jumptakeId, website }) => ({ name, jumptakeId, website })))}
- Create the Work News drafts only for these companies, using each exact name and jumptakeId.
- Return one current, concrete update per listed company, sourced from that company's official website, newsroom, or official publication.
- Do not substitute candidate profiles, talent stories, unrelated companies, generic home pages, or unsourced promotional copy.`
      : prompt;

    if (!wantsWebJobs && requestedJobDraftCount > jobDrafts.length) {
      jobDrafts = await generateAdminDraftBatches({
        prompt,
        kind: 'job',
        requestedCount: requestedJobDraftCount,
        useWebSearch,
        seedDrafts: jobDrafts,
        existingIdentityKeys: draftExclusions.jobKeys
      });
    }

    if (requestedWorkNewsDraftCount > workNewsDrafts.length) {
      workNewsDrafts = await generateAdminDraftBatches({
        prompt: workNewsPrompt,
        kind: 'work-news',
        requestedCount: requestedWorkNewsDraftCount,
        useWebSearch,
        seedDrafts: workNewsDrafts,
        workNewsRequireSource: wantsLiveWorkNews,
        existingIdentityKeys: draftExclusions.workNewsKeys
      });
    }

    if (wantsWorkNewsDrafts) {
      const acceptedWorkNewsDrafts = [];
      const checkedWorkNewsKeys = new Set(draftExclusions.workNewsKeys);
      const pendingCompaniesByName = requestedCompanyDraftCount && companyDrafts.length
        ? new Map(companyDrafts.map((company) => [company.name.trim().toLowerCase(), company]))
        : null;
      const prepareWorkNewsCandidates = async (rows) => {
        let candidates = await attachWorkNewsDraftCompanies(rows);
        if (pendingCompaniesByName) {
          candidates = candidates
            .filter((draft) => pendingCompaniesByName.has(String(draft.companyName || '').trim().toLowerCase()))
            .map((draft) => {
              const company = pendingCompaniesByName.get(String(draft.companyName || '').trim().toLowerCase());
              return {
                ...draft,
                companyJumpTakeId: company.jumptakeId,
                companyName: company.name,
                companyLogoUrl: company.logo || draft.companyLogoUrl || '',
                companyLogoVerified: company.logoVerified || false,
                companyWebsite: company.website || ''
              };
            });
        }
        candidates = filterUniqueDrafts(
          candidates,
          checkedWorkNewsKeys,
          workNewsDraftIdentityKeys,
          Math.max(0, requestedWorkNewsDraftCount - acceptedWorkNewsDrafts.length)
        ).rows;
        return enrichWorkNewsDraftMedia(candidates, companyDrafts);
      };

      acceptedWorkNewsDrafts.push(...await prepareWorkNewsCandidates(workNewsDrafts));
      for (
        let retryRound = 1;
        retryRound <= ADMIN_ASSISTANT_DRAFT_RETRY_ROUNDS && acceptedWorkNewsDrafts.length < requestedWorkNewsDraftCount;
        retryRound += 1
      ) {
        const missingCount = requestedWorkNewsDraftCount - acceptedWorkNewsDrafts.length;
        const candidateCount = Math.min(
          ADMIN_ASSISTANT_MAX_DRAFTS,
          Math.max(missingCount, missingCount * 2)
        );
        const replacementPrompt = `${workNewsPrompt}

Verified Work News refill round ${retryRound}:
- ${acceptedWorkNewsDrafts.length} of ${requestedWorkNewsDraftCount} requested drafts passed source validation.
- Return ${candidateCount} different candidates so invalid, duplicate, inaccessible, or stale sources can be replaced.
- Every source must be a direct, live article or company update page. Do not return homepages, newsroom indexes, or invented links.`;
        const replacementDrafts = await generateAdminDraftBatches({
          prompt: replacementPrompt,
          kind: 'work-news',
          requestedCount: candidateCount,
          useWebSearch,
          workNewsRequireSource: wantsLiveWorkNews,
          existingIdentityKeys: checkedWorkNewsKeys
        });
        const replacements = await prepareWorkNewsCandidates(replacementDrafts);
        acceptedWorkNewsDrafts.push(...replacements);
        if (!replacementDrafts.length) break;
      }
      workNewsDrafts = acceptedWorkNewsDrafts.slice(0, requestedWorkNewsDraftCount);
    }

    if (requestedCandidateDraftCount > userDrafts.length) {
      userDrafts = await generateAdminCandidateDraftBatches({
        message,
        requestedCount: requestedCandidateDraftCount,
        useWebSearch,
        includePictures: wantsCandidateProfilePictures,
        profileImages: candidateProfileImages,
        seedDrafts: userDrafts,
        existingIdentityKeys: draftExclusions.candidateKeys,
        excludedRecords: draftExclusions.promptRecords
      });
    }

    if (wantsCandidateDrafts) {
      userDrafts = await enrichCandidateTalentStoryMedia(userDrafts, { useWebSearch });
    }

    const generatedJobDraftCount = jobDrafts.length;
    let checkedJobDraftCount = generatedJobDraftCount;
    if (wantsWebJobs) {
      if (useWebSearch) {
        const liveJobResult = await collectRequestedVerifiedLiveJobs({
          prompt,
          initialDrafts: jobDrafts,
          requestedCount: requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS,
          existingIdentityKeys: draftExclusions.jobKeys,
          publicJobPreferences: req.body?.jobDraftPreferences || {}
        });
        jobDrafts = liveJobResult.drafts;
        checkedJobDraftCount = liveJobResult.checkedCount;
      } else if (jobDrafts.length) {
        jobDrafts = await verifyAdminLiveJobDrafts(
          jobDrafts,
          requestedJobDraftCount || ADMIN_ASSISTANT_MAX_DRAFTS
        );
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

    const providerFailedDuringDrafting = adminOpenAILastError && (
      (requestedCompanyDraftCount > companyDrafts.length)
      || (requestedWorkNewsDraftCount > workNewsDrafts.length)
      || (requestedCandidateDraftCount > userDrafts.length)
      || (!wantsWebJobs && requestedJobDraftCount > jobDrafts.length)
    );
    if (providerFailedDuringDrafting) {
      throw createAdminOpenAIProviderError(adminOpenAILastError);
    }

    assertExactAdminDraftCounts([
      { label: 'job drafts', requested: requestedJobDraftCount, actual: jobDrafts.length },
      { label: 'company drafts', requested: requestedCompanyDraftCount, actual: companyDrafts.length },
      { label: 'Work News drafts', requested: requestedWorkNewsDraftCount, actual: workNewsDrafts.length },
      { label: 'candidate drafts', requested: requestedCandidateDraftCount, actual: userDrafts.length }
    ]);

    const companyReply = requestedCompanyDraftCount
      ? `${companyDrafts.length} company profile draft${companyDrafts.length === 1 ? '' : 's'} ready with assigned JumpTake IDs.`
      : '';
    const workNewsReply = requestedWorkNewsDraftCount
      ? `${workNewsDrafts.length} sourced Work News draft${workNewsDrafts.length === 1 ? '' : 's'} ready for review.`
      : '';
    const combinedCompanyNewsReply = [companyReply, workNewsReply].filter(Boolean).join(' ');

    res.json({
      reply: requestedCandidateDraftCount
        ? `${userDrafts.length} candidate profile draft${userDrafts.length === 1 ? '' : 's'} ready, each with a talent story post. Review, edit, and create each one when approved.`
        : combinedCompanyNewsReply
          ? `${combinedCompanyNewsReply} Review each draft before creating or posting it.`
          : requestedJobDraftCount
          ? wantsWebJobs
            ? `${jobDrafts.length} verified active job draft${jobDrafts.length === 1 ? '' : 's'} ready with exact Apply links. ${rejectedJobDraftCount ? `${rejectedJobDraftCount} generic, expired, missing, closed, 404, or unverifiable source${rejectedJobDraftCount === 1 ? ' was' : 's were'} excluded and replaced. ` : ''}Review them, then post individually or use Post All.`
            : `${jobDrafts.length} job draft${jobDrafts.length === 1 ? '' : 's'} ready. Review them, then post individually or use Post All.`
          : String(parsed.reply || 'I filled what I could. Review the form before creating the record.'),
      action: requestedCandidateDraftCount
        ? 'draftTalentProfiles'
        : requestedCompanyDraftCount && requestedWorkNewsDraftCount
          ? 'draftCompaniesAndWorkNews'
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
      requestedDraftCounts: {
        jobs: requestedJobDraftCount,
        companies: requestedCompanyDraftCount,
        workNews: requestedWorkNewsDraftCount,
        candidates: requestedCandidateDraftCount
      },
      provider: wantsWebJobs && usedPublicJobSource
        ? 'verified-public-job-boards'
        : aiText
          ? (useWebSearch ? 'openai-web' : 'openai')
          : (openAIProviderError ? 'provider-unavailable' : 'fallback')
    });
  } catch (error) {
    const status = Number(error.status) || (isOpenAIQuotaError(error) ? 402 : 500);
    res.status(status).json({
      error: error.message || 'Admin assistant failed',
      code: error.code || (status === 402 ? 'OPENAI_CREDITS_REQUIRED' : 'ADMIN_ASSISTANT_FAILED')
    });
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
