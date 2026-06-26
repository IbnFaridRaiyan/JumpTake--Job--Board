const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');

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
    searchFields: ['name', 'industry', 'headquarters', 'description', 'website'],
    summaryFields: ['name', 'industry', 'headquarters', 'website', 'createdAt']
  },
  jobs: {
    label: 'Job Posts',
    model: Job,
    searchFields: ['title', 'description', 'location', 'salary', 'jobType', 'jobNumber'],
    summaryFields: ['title', 'jobNumber', 'location', 'jobType', 'salary', 'active', 'company', 'createdAt']
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
      location,
      salary,
      jobType,
      requirements,
      responsibilities,
      skills
    } = req.body;

    const job = await Job.create({
      title,
      description,
      company,
      location,
      salary,
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

module.exports = router;
