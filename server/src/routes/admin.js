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
    label: 'Feed Posts',
    model: FeedPost,
    searchFields: ['type', 'body', 'authorId', 'authorType', 'authorName'],
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
    'gpt-5',
    'gpt-4.1-mini',
    'gpt-4o-mini'
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
      max_output_tokens: 650
    };

    if (useWebSearch) {
      payload.tools = [{ type: 'web_search_preview' }];
      payload.tool_choice = 'auto';
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
    const shouldRetryWithoutSearch = useWebSearch && /web_search|tool|unsupported|invalid/i.test(message);
    if (shouldRetryWithoutSearch) {
      return askAdminOpenAIWithModel({ apiKey, model, prompt, useWebSearch: false });
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
      max_tokens: 650,
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

const askAdminOpenAI = async (prompt, { useWebSearch = false } = {}) => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return '';
  }

  let lastError = null;
  for (const model of getOpenAIModelCandidates()) {
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

const createAdminAssistantPrompt = ({ message, companyForm, jobForm }) => `You are JumpTake Admin AI. Convert the admin request into JSON that fills admin panel forms.

Return only valid JSON with this shape:
{
  "reply": "short admin-facing reply",
  "action": "fillCompany" | "fillJob" | "fillBoth" | "reply",
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
  }
}

Rules:
- Fill only fields that can be inferred from the request.
- If the admin asks to post/create a job, fill jobForm. If they provide a company ID such as ez1231231, put it in jobForm.company.
- If they ask to create a company, fill companyForm. If they provide a custom company ID/code, put it in companyForm.adminCompanyId.
- For company creation or company enrichment, extract and fill company name, headquarters/address, website, industry, founded year, and description/company details from the admin text.
- If the admin gives only a company name and fields are missing, use web search results to identify the real company details. Prefer official company websites and reliable business/profile pages. Do not invent details; leave uncertain fields blank.
- Put a physical address or city/country in companyForm.headquarters.
- Put the official public URL in companyForm.website.
- Put a concise factual company overview in companyForm.description.
- jobType must be one of Full-time, Part-time, Contract, Internship, Remote.
- Do not include markdown.

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
        count: await config.model.countDocuments()
      }))
    );

    res.json({ collections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/collections/:collection', async (req, res) => {
  try {
    const config = getCollectionConfig(req.params.collection);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const query = getSearchQuery(config, req.query.q);
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

    if (collection === 'users') {
      await deleteCandidateData({ userId: id, jobSeekerId: existing.jobSeekerId });
    }

    if (collection === 'jobSeekers') {
      await deleteCandidateData({ userId: existing.user, jobSeekerId: id });
    }

    if (collection === 'jobs') {
      await deleteJobData(id);
    }

    if (collection === 'companies') {
      await deleteCompanyData(id);
    }

    await config.model.findByIdAndDelete(id);

    res.json({ ok: true, deleted: id });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
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
    const hasMissingCompanyDetails = !companyForm.industry || !companyForm.headquarters || !companyForm.website || !companyForm.founded || !companyForm.description;
    const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false' && wantsCompanyInfo && hasMissingCompanyDetails;
    const aiText = await askAdminOpenAI(prompt, { useWebSearch });
    const parsed = parseJsonObjectFromText(aiText) || createFallbackAdminAssistantPlan(message);

    res.json({
      reply: String(parsed.reply || 'I filled what I could. Review the form before creating the record.'),
      action: parsed.action || 'reply',
      companyForm: parsed.companyForm && typeof parsed.companyForm === 'object' ? parsed.companyForm : {},
      jobForm: parsed.jobForm && typeof parsed.jobForm === 'object' ? parsed.jobForm : {},
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
    const nextComments = comments.filter((comment) => String(comment.id || comment._id) !== String(commentId));

    if (nextComments.length === comments.length) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    post.comments = nextComments;
    await post.save();

    res.json({ item: serializeDocument(post) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
