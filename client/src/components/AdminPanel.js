import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from './ProfileAvatar';
import { createSquareProfileImage } from '../utils/profileImages';
import confirmAction from '../utils/confirmAction';
import getAdminDraftDestination from '../utils/adminDraftDestination';

const API_BASE = process.env.REACT_APP_API_URL || '';
const ADMIN_KEY_STORAGE = 'jumptakeAdminKey';
const ADMIN_ASSISTANT_MAX_IMAGES = 20;
const ADMIN_COLLECTION_PAGE_SIZE = 100;
const ADMIN_POST_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
const FEED_POST_COLLECTIONS = new Set(['feedPosts', 'workNewsPosts', 'talentStoryPosts']);

const emptyCompanyForm = {
  name: '',
  jumptakeId: '',
  adminCompanyId: '',
  industry: '',
  headquarters: '',
  website: '',
  founded: '',
  description: '',
  logo: ''
};

const emptyJobForm = {
  company: '',
  companyName: '',
  title: '',
  location: '',
  sector: '',
  salary: '',
  applicationLink: '',
  applicationDeadline: '',
  jobType: 'Full-time',
  description: '',
  requirements: '',
  responsibilities: '',
  skills: '',
  source: '',
  liveVerifiedAt: '',
  liveVerificationSourceUrl: '',
  liveVerificationUrl: '',
  liveVerificationNote: '',
  liveVerificationToken: ''
};

const emptyWorkNewsDraft = {
  companyId: '',
  companyJumpTakeId: '',
  companyName: '',
  companyWebsite: '',
  companyLogoUrl: '',
  body: '',
  mediaUrl: '',
  mediaType: 'image',
  source: '',
  sourceTitle: '',
  publishedAt: '',
  sourceVerifiedAt: ''
};

const emptyWorkNewsPostForm = {
  companyId: '',
  companyJumpTakeId: '',
  companyName: '',
  companyWebsite: '',
  companyLogoUrl: '',
  body: '',
  mediaUrl: '',
  mediaType: 'image',
  source: '',
  sourceTitle: '',
  publishedAt: ''
};

const emptyCandidateForm = {
  name: '',
  email: '',
  jumptakeId: '',
  password: '',
  profileImage: '',
  coverImage: '',
  about: '',
  skills: ''
};

const emptyTalentStoryForm = {
  authorName: '',
  authorAvatar: '',
  body: '',
  mediaUrl: '',
  mediaType: 'image'
};

const getLogoFallbackFromWebsite = (website = '') => {
  try {
    const url = new URL(website);
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url.origin)}&sz=256`;
  } catch (error) {
    return '';
  }
};

const randomCompanyNames = [
  'Northstar Works',
  'BrightPath Labs',
  'Evergreen Talent',
  'Atlas Hiring Group',
  'BluePeak Systems',
  'NovaBridge Careers'
];

const randomIndustries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Logistics'];
const randomHeadquarters = ['New York, NY', 'Austin, TX', 'San Francisco, CA', 'Chicago, IL', 'Seattle, WA', 'Miami, FL'];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const mergeFilledFields = (current, updates = {}) => Object.fromEntries(
  Object.entries(current).map(([key, value]) => {
    const nextValue = updates[key];
    return [key, nextValue === undefined || nextValue === null || nextValue === '' ? value : String(nextValue)];
  })
);

const normalizeJobDraft = (draft = {}, index = 0) => ({
  ...emptyJobForm,
  ...Object.fromEntries(
    Object.keys(emptyJobForm).map((key) => [
      key,
      draft[key] === undefined || draft[key] === null ? emptyJobForm[key] : String(draft[key])
    ])
  ),
  id: draft.id || `job-draft-${Date.now()}-${index}`
});

const normalizeWorkNewsDraft = (draft = {}, index = 0) => ({
  ...emptyWorkNewsDraft,
  ...Object.fromEntries(
    Object.keys(emptyWorkNewsDraft).map((key) => [
      key,
      draft[key] === undefined || draft[key] === null ? emptyWorkNewsDraft[key] : String(draft[key])
    ])
  ),
  companyLogoUrl: draft.companyLogoUrl || getLogoFallbackFromWebsite(draft.companyWebsite),
  mediaType: draft.mediaType === 'video' ? 'video' : 'image',
  id: draft.id || `work-news-draft-${Date.now()}-${index}`
});

const normalizeCompanyDraft = (draft = {}, index = 0) => ({
  ...emptyCompanyForm,
  ...Object.fromEntries(
    Object.keys(emptyCompanyForm).map((key) => [
      key,
      draft[key] === undefined || draft[key] === null ? emptyCompanyForm[key] : String(draft[key])
    ])
  ),
  id: draft.id || `company-draft-${Date.now()}-${index}`,
  createdCompanyId: draft.createdCompanyId || ''
});

const draftsReferToSameCompany = (companyDraft = {}, workNewsDraft = {}) => {
  const companyJumpTakeId = String(companyDraft.jumptakeId || '').trim().toLowerCase();
  const postJumpTakeId = String(workNewsDraft.companyJumpTakeId || '').trim().toLowerCase();
  if (companyJumpTakeId && postJumpTakeId && companyJumpTakeId === postJumpTakeId) return true;

  const companyName = String(companyDraft.name || '').trim().toLowerCase();
  const postCompanyName = String(workNewsDraft.companyName || '').trim().toLowerCase();
  return Boolean(companyName && postCompanyName && companyName === postCompanyName);
};

const normalizeCandidateListText = (value) => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item || '').trim();
      return [item.institution, item.degree, item.field, item.title, item.company, item.description, item.date]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' - ');
    })
    .filter(Boolean)
    .join('\n');
};

const normalizeCandidateDraft = (draft = {}, index = 0) => ({
  id: draft.id || `candidate-draft-${Date.now()}-${index}`,
  name: String(draft.name || ''),
  email: String(draft.email || ''),
  jumptakeId: String(draft.jumptakeId || ''),
  password: String(draft.password || ''),
  jobTitle: String(draft.jobTitle || ''),
  skills: String(draft.skills || ''),
  education: normalizeCandidateListText(draft.education),
  studies: normalizeCandidateListText(draft.studies || draft.degrees || draft.fieldOfStudy),
  experience: normalizeCandidateListText(draft.experience),
  achievements: normalizeCandidateListText(draft.achievements),
  about: String(draft.about || ''),
  profileImage: String(draft.profileImage || ''),
  coverImage: String(draft.coverImage || ''),
  storyBody: String(draft.talentStory?.body || draft.storyBody || ''),
  storyMediaUrl: String(draft.talentStory?.mediaUrl || draft.talentStory?.media?.dataUrl || draft.storyMediaUrl || ''),
  storyMediaType: draft.talentStory?.mediaType === 'video' || draft.talentStory?.media?.type === 'video' || draft.storyMediaType === 'video' ? 'video' : 'image',
  createdUserId: draft.createdUserId || '',
  createdJobSeekerId: draft.createdJobSeekerId || ''
});

const readAdminFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  if (file?.size > ADMIN_POST_MEDIA_MAX_BYTES) {
    reject(new Error('Choose a post image or video smaller than 8 MB.'));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.onload = (event) => resolve(String(event.target.result || ''));
  reader.readAsDataURL(file);
});

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Not set';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'None';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [draftKey, setDraftKey] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyLogoEdits, setCompanyLogoEdits] = useState({});
  const [updatingCompanyLogoId, setUpdatingCompanyLogoId] = useState('');
  const companyLogoInputRef = useRef(null);
  const [isProcessingCompanyLogo, setIsProcessingCompanyLogo] = useState(false);
  const [companyForm, setCompanyForm] = useState({ ...emptyCompanyForm });
  const [adminCompanyDrafts, setAdminCompanyDrafts] = useState([]);
  const [adminAssistantOpen, setAdminAssistantOpen] = useState(false);
  const [adminAssistantInput, setAdminAssistantInput] = useState('');
  const [adminAssistantImages, setAdminAssistantImages] = useState([]);
  const [adminAssistantBusy, setAdminAssistantBusy] = useState(false);
  const [adminAssistantMessages, setAdminAssistantMessages] = useState([
    {
      role: 'assistant',
      text: 'Tell me what company, job, Work News, candidate profile, or talent story drafts to create and I will fill the admin forms.'
    }
  ]);
  const [jobForm, setJobForm] = useState({ ...emptyJobForm });
  const [adminJobDrafts, setAdminJobDrafts] = useState([]);
  const [jobDraftPreferences, setJobDraftPreferences] = useState({ location: '', sectors: '' });
  const [isPostingAllJobs, setIsPostingAllJobs] = useState(false);
  const [adminWorkNewsDrafts, setAdminWorkNewsDrafts] = useState([]);
  const [workNewsPostForm, setWorkNewsPostForm] = useState({ ...emptyWorkNewsPostForm });
  const [candidateForm, setCandidateForm] = useState({ ...emptyCandidateForm });
  const [talentStoryForm, setTalentStoryForm] = useState({ ...emptyTalentStoryForm });
  const [adminCandidateDrafts, setAdminCandidateDrafts] = useState([]);
  const candidateProfileInputRef = useRef(null);
  const candidateCoverInputRef = useRef(null);
  const talentStoryCoverInputRef = useRef(null);
  const adminAssistantImageInputRef = useRef(null);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey
  }), [adminKey]);

  const adminFetch = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}/api/admin${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Admin request failed');
    }

    return data;
  }, [headers]);

  const loadSummary = useCallback(async () => {
    const data = await adminFetch('/summary');
    setCollections(data.collections || []);

    if (data.collections?.length && !data.collections.some((collection) => collection.key === selectedCollection)) {
      setSelectedCollection(data.collections[0].key);
    }
  }, [adminFetch, selectedCollection]);

  const loadCollection = useCallback(async (options = {}) => {
    const targetCollection = options.collection || selectedCollection;
    const targetPage = Number(options.page || page);
    const targetSearch = options.search === undefined ? search : String(options.search || '');

    if (!targetCollection || !isAuthed) {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(ADMIN_COLLECTION_PAGE_SIZE)
      });

      if (targetSearch.trim()) {
        params.set('q', targetSearch.trim());
      }

      const data = await adminFetch(`/collections/${targetCollection}?${params.toString()}`);
      setItems(data.items || []);
      setSelectedItemIds([]);
      setPagination({
        total: data.total || 0,
        totalPages: data.totalPages || 1
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, isAuthed, page, search, selectedCollection]);

  const validateKey = useCallback(async (keyToUse = adminKey) => {
    if (!keyToUse) {
      setIsAuthed(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/session`, {
        headers: {
          'x-admin-key': keyToUse
        }
      });

      if (!response.ok) {
        throw new Error('Invalid admin key');
      }

      sessionStorage.setItem(ADMIN_KEY_STORAGE, keyToUse);
      setAdminKey(keyToUse);
      setDraftKey('');
      setIsAuthed(true);
      setMessage('');
    } catch (error) {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      setIsAuthed(false);
      setMessage(error.message);
    }
  }, [adminKey]);

  useEffect(() => {
    validateKey();
  }, [validateKey]);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }

    loadSummary().catch((error) => setMessage(error.message));
  }, [isAuthed, loadSummary]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const handleCollectionSelect = (collectionKey) => {
    setSelectedCollection(collectionKey);
    setPage(1);
    setSearch('');
    setSelectedItemIds([]);
  };

  const handleDelete = async (id) => {
    const deletingFeedPost = FEED_POST_COLLECTIONS.has(selectedCollection);
    const confirmed = await confirmAction({
      title: deletingFeedPost ? 'Delete post?' : 'Delete record?',
      message: deletingFeedPost
        ? 'Delete this post and every comment and reaction attached to it permanently?'
        : 'Delete this record and its related data permanently?'
    });

    if (!confirmed) {
      return;
    }

    try {
      setMessage('');
      await adminFetch(`/collections/${selectedCollection}/${id}`, {
        method: 'DELETE'
      });
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage(deletingFeedPost ? 'Post deleted.' : 'Record deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();

    try {
      setMessage('');
      await adminFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobForm)
      });
      setJobForm({ ...emptyJobForm });
      setSelectedCollection('jobs');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'jobs', page: 1 })]);
      setMessage('Job post created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleWorkNewsPostLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const logo = await createSquareProfileImage(file);
      setWorkNewsPostForm((current) => ({ ...current, companyLogoUrl: logo }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that company profile picture.');
    }
  };

  const handleWorkNewsPostMediaUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const dataUrl = await readAdminFileAsDataUrl(file);
      setWorkNewsPostForm((current) => ({
        ...current,
        mediaUrl: dataUrl,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image'
      }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that Work News media.');
    }
  };

  const handleCreateWorkNewsPost = async (event) => {
    event.preventDefault();

    try {
      setMessage('');
      await adminFetch('/feed-posts', {
        method: 'POST',
        body: JSON.stringify({
          companyId: workNewsPostForm.companyId,
          companyJumpTakeId: workNewsPostForm.companyJumpTakeId,
          companyName: workNewsPostForm.companyName,
          companyWebsite: workNewsPostForm.companyWebsite,
          authorName: workNewsPostForm.companyName,
          companyLogoUrl: workNewsPostForm.companyLogoUrl,
          authorAvatar: workNewsPostForm.companyLogoUrl,
          body: workNewsPostForm.body,
          mediaUrl: workNewsPostForm.mediaUrl,
          mediaType: workNewsPostForm.mediaType,
          source: workNewsPostForm.source,
          sourceTitle: workNewsPostForm.sourceTitle,
          publishedAt: workNewsPostForm.publishedAt
        })
      });
      setWorkNewsPostForm({ ...emptyWorkNewsPostForm });
      setSelectedCollection('workNewsPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'workNewsPosts', page: 1 })]);
      setMessage('Work News post created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCandidateCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const coverImage = await createSquareProfileImage(file);
      setCandidateForm((current) => ({ ...current, coverImage }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that candidate cover photo.');
    }
  };

  const handleCandidateProfileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const profileImage = await createSquareProfileImage(file);
      setCandidateForm((current) => ({ ...current, profileImage }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that candidate profile picture.');
    }
  };

  const handleCreateCandidate = async (event) => {
    event.preventDefault();

    try {
      setMessage('');
      const data = await adminFetch('/candidates', {
        method: 'POST',
        body: JSON.stringify(candidateForm)
      });
      setCandidateForm({ ...emptyCandidateForm });
      setSelectedCollection('users');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'users', page: 1 })]);
      setMessage(data.generatedPassword
        ? `Candidate user created. Temporary login: ${data.user.email} / ${data.generatedPassword}`
        : `Candidate user created: ${data.user.email || data.user.jumptakeId}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleTalentStoryCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const avatar = await createSquareProfileImage(file);
      setTalentStoryForm((current) => ({ ...current, authorAvatar: avatar }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that cover photo.');
    }
  };

  const handleTalentStoryMediaUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setMessage('');
      const mediaUrl = await readAdminFileAsDataUrl(file);
      setTalentStoryForm((current) => ({
        ...current,
        mediaUrl,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image'
      }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that Talent Story media.');
    }
  };

  const handleCreateTalentStory = async (event) => {
    event.preventDefault();

    try {
      setMessage('');
      await adminFetch('/talent-stories', {
        method: 'POST',
        body: JSON.stringify({
          authorName: talentStoryForm.authorName,
          authorAvatar: talentStoryForm.authorAvatar,
          body: talentStoryForm.body,
          media: talentStoryForm.mediaUrl ? {
            dataUrl: talentStoryForm.mediaUrl,
            type: talentStoryForm.mediaType,
            name: `${talentStoryForm.authorName || 'Candidate'} Talent Story media`
          } : null
        })
      });
      setTalentStoryForm({ ...emptyTalentStoryForm });
      setSelectedCollection('talentStoryPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'talentStoryPosts', page: 1 })]);
      setMessage('Talent Story post created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleBulkDelete = async (deleteAll = false) => {
    const permanentlyDelete = selectedCollection === 'deletedItems';
    const selectedCount = selectedItemIds.length;
    if (!deleteAll && !selectedCount) {
      setMessage('Select at least one record first.');
      return;
    }

    const confirmed = await confirmAction({
      title: permanentlyDelete
        ? (deleteAll ? 'Delete all forever?' : `Delete ${selectedCount} selected forever?`)
        : (deleteAll ? 'Delete all records?' : `Delete ${selectedCount} selected records?`),
      message: permanentlyDelete
        ? 'This permanently removes the selected deleted data. It cannot be restored.'
        : 'The records will move to Deleted Items so they can still be restored.',
      confirmLabel: permanentlyDelete ? 'Delete Forever' : 'Delete'
    });

    if (!confirmed) {
      return;
    }

    try {
      setMessage('');
      const data = await adminFetch(
        permanentlyDelete ? '/deleted-items/bulk-permanent' : `/collections/${selectedCollection}/bulk-delete`,
        {
          method: 'POST',
          body: JSON.stringify({ deleteAll, ids: deleteAll ? [] : selectedItemIds })
        }
      );
      setSelectedItemIds([]);
      await Promise.all([loadSummary(), loadCollection()]);
      const affectedCount = data.deletedCount ?? data.permanentlyDeletedCount ?? selectedCount;
      setMessage(`${affectedCount} record${affectedCount === 1 ? '' : 's'} ${permanentlyDelete ? 'deleted forever' : 'moved to Deleted Items'}.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleSelectedItem = (itemId) => {
    setSelectedItemIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const handleRandomizeCompany = () => {
    const randomName = pickRandom(randomCompanyNames);
    setCompanyForm((current) => ({
      ...current,
      name: `${randomName} ${Math.floor(100 + Math.random() * 900)}`,
      adminCompanyId: current.adminCompanyId || `company-${Math.floor(100000 + Math.random() * 900000)}`,
      industry: current.industry || pickRandom(randomIndustries),
      headquarters: current.headquarters || pickRandom(randomHeadquarters),
      description: current.description || 'Admin-created company profile for testing jobs, posts, and employer portal flows.'
    }));
  };

  const handleCompanyLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      setIsProcessingCompanyLogo(true);
      const logo = await createSquareProfileImage(file);
      setCompanyForm((current) => ({ ...current, logo }));
    } catch (error) {
      setMessage(error.message || 'Could not prepare that company picture.');
    } finally {
      setIsProcessingCompanyLogo(false);
    }
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();

    try {
      setMessage('');
      const data = await adminFetch('/companies', {
        method: 'POST',
        body: JSON.stringify(companyForm)
      });
      const createdCompanyId = data.item?.adminCompanyId || data.item?._id || '';
      const companiesData = await adminFetch('/collections/companies?page=1&limit=20');
      setCompanyForm({ ...emptyCompanyForm });
      setSelectedCollection('companies');
      setPage(1);
      setItems(companiesData.items || []);
      setPagination({
        total: companiesData.total || 0,
        totalPages: companiesData.totalPages || 1
      });
      if (createdCompanyId) {
        setJobForm((current) => ({ ...current, company: createdCompanyId }));
      }
      await loadSummary();
      setMessage(createdCompanyId
        ? `Company created. JumpTake ID: @${data.item?.jumptakeId || 'assigned'} - Company ID: ${createdCompanyId}`
        : 'Company created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAdminAssistantImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const availableSlots = Math.max(0, ADMIN_ASSISTANT_MAX_IMAGES - adminAssistantImages.length);
    if (!availableSlots) {
      setMessage(`Admin AI accepts up to ${ADMIN_ASSISTANT_MAX_IMAGES} profile pictures at once.`);
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    const results = await Promise.allSettled(selectedFiles.map(async (file, index) => ({
      id: `admin-ai-image-${Date.now()}-${index}`,
      name: file.name || `Profile picture ${index + 1}`,
      dataUrl: await createSquareProfileImage(file)
    })));
    const preparedImages = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    if (preparedImages.length) {
      setAdminAssistantImages((current) => [...current, ...preparedImages].slice(0, ADMIN_ASSISTANT_MAX_IMAGES));
    }

    const rejectedCount = results.length - preparedImages.length;
    if (rejectedCount || files.length > selectedFiles.length) {
      setMessage(`${preparedImages.length} picture${preparedImages.length === 1 ? '' : 's'} attached. ${rejectedCount + (files.length - selectedFiles.length)} could not be added.`);
    }
  };

  const getExistingCompanyLogo = (company) => (
    Object.prototype.hasOwnProperty.call(companyLogoEdits, company._id)
      ? companyLogoEdits[company._id]
      : company.logo || ''
  );

  const updateExistingCompanyLogoEdit = (companyId, logo) => {
    setCompanyLogoEdits((current) => ({ ...current, [companyId]: logo }));
  };

  const saveExistingCompanyLogo = async (companyId, logo) => {
    try {
      setMessage('');
      setUpdatingCompanyLogoId(companyId);
      await adminFetch(`/companies/${companyId}/logo`, {
        method: 'PATCH',
        body: JSON.stringify({ logo: String(logo || '').trim() })
      });
      setCompanyLogoEdits((current) => {
        const next = { ...current };
        delete next[companyId];
        return next;
      });
      await loadCollection({ collection: 'companies', page });
      setMessage(logo ? 'Company profile picture updated.' : 'Company profile picture removed.');
    } catch (error) {
      setMessage(error.message || 'Could not update that company profile picture.');
    } finally {
      setUpdatingCompanyLogoId('');
    }
  };

  const handleExistingCompanyLogoUpload = async (companyId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      setUpdatingCompanyLogoId(companyId);
      const logo = await createSquareProfileImage(file);
      updateExistingCompanyLogoEdit(companyId, logo);
      await saveExistingCompanyLogo(companyId, logo);
    } catch (error) {
      setMessage(error.message || 'Could not prepare that company profile picture.');
      setUpdatingCompanyLogoId('');
    }
  };

  const updateAdminCompanyDraft = (draftId, field, value) => {
    const previousDraft = adminCompanyDrafts.find((draft) => draft.id === draftId);
    setAdminCompanyDrafts((current) => current.map((draft) => (
      draft.id === draftId ? { ...draft, [field]: value } : draft
    )));

    const linkedField = {
      name: 'companyName',
      jumptakeId: 'companyJumpTakeId',
      logo: 'companyLogoUrl',
      website: 'companyWebsite'
    }[field];
    if (previousDraft && linkedField) {
      setAdminWorkNewsDrafts((current) => current.map((draft) => {
        const matchesCompany = draftsReferToSameCompany(previousDraft, draft);
        return matchesCompany ? { ...draft, [linkedField]: value } : draft;
      }));
    }
  };

  const handleAdminCompanyDraftLogoUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setMessage('');
      const logo = await createSquareProfileImage(file);
      updateAdminCompanyDraft(draftId, 'logo', logo);
    } catch (error) {
      setMessage(error.message || 'Could not prepare that company profile picture.');
    }
  };

  const hasPendingCompanyDraftForWorkNews = (workNewsDraft) => adminCompanyDrafts.some((companyDraft) => (
    draftsReferToSameCompany(companyDraft, workNewsDraft)
  ));

  const removeAdminCompanyDraft = async (draftId, skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = await confirmAction({
        title: 'Delete company draft?',
        message: 'Delete this unpublished company profile draft?'
      });
      if (!confirmed) return;
    }
    setAdminCompanyDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const createAdminCompanyFromDraft = async (draft) => {
    try {
      setMessage('');
      const data = await adminFetch('/companies', {
        method: 'POST',
        body: JSON.stringify(draft)
      });
      const createdCompany = data.item || {};
      setAdminWorkNewsDrafts((current) => current.map((postDraft) => {
        const matchesCompany = draftsReferToSameCompany(draft, postDraft);
        return matchesCompany ? {
          ...postDraft,
          companyId: createdCompany._id || createdCompany.id || postDraft.companyId,
          companyJumpTakeId: createdCompany.jumptakeId || draft.jumptakeId || postDraft.companyJumpTakeId,
          companyName: createdCompany.name || draft.name || postDraft.companyName,
          companyLogoUrl: createdCompany.logo || draft.logo || postDraft.companyLogoUrl,
          companyWebsite: createdCompany.website || draft.website || postDraft.companyWebsite
        } : postDraft;
      }));
      removeAdminCompanyDraft(draft.id, true);
      const stayInWorkNews = ['feedPosts', 'workNewsPosts'].includes(selectedCollection);
      setSelectedCollection(stayInWorkNews ? 'workNewsPosts' : 'companies');
      setPage(1);
      await Promise.all([
        loadSummary(),
        loadCollection({ collection: stayInWorkNews ? 'workNewsPosts' : 'companies', page: 1 })
      ]);
      setMessage(`Company created: ${data.item?.name || draft.name} (@${data.item?.jumptakeId || draft.jumptakeId})`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAdminAssistantSubmit = async (event) => {
    event.preventDefault();
    const submittedImages = adminAssistantImages;
    const prompt = adminAssistantInput.trim() || (submittedImages.length
      ? 'Create one candidate user draft for each attached profile picture, with a matching realistic profile and an achievement-based talent story.'
      : '');

    if ((!prompt && !submittedImages.length) || adminAssistantBusy) {
      return;
    }

    setAdminAssistantInput('');
    setAdminAssistantImages([]);
    setAdminAssistantBusy(true);
    setAdminAssistantMessages((current) => [...current, {
      role: 'user',
      text: prompt,
      attachments: submittedImages.map(({ id, name, dataUrl }) => ({ id, name, dataUrl }))
    }]);

    try {
      const data = await adminFetch('/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          companyForm,
          jobForm,
          jobDraftPreferences,
          profileImages: submittedImages.map(({ name, dataUrl }) => ({ name, dataUrl })),
          existingDrafts: {
            jobs: adminJobDrafts.map(({ company, companyName, title, location, source, applicationLink }) => ({
              company,
              companyName,
              title,
              location,
              source,
              applicationLink
            })),
            companies: adminCompanyDrafts.map(({ name, jumptakeId, website, logo }) => ({
              name,
              jumptakeId,
              website,
              logo: /^https?:\/\//i.test(String(logo || '')) ? logo : ''
            })),
            workNews: adminWorkNewsDrafts.map(({ companyName, body, source }) => ({
              companyName,
              body,
              source
            })),
            candidates: adminCandidateDrafts.map(({ name, email, jumptakeId, profileImage, talentStory }) => ({
              name,
              email,
              jumptakeId,
              profileImage: /^https?:\/\//i.test(String(profileImage || '')) ? profileImage : '',
              talentStory: { body: talentStory?.body || '' }
            }))
          }
        })
      });

      if (data.companyForm && Object.keys(data.companyForm).length) {
        setCompanyForm((current) => mergeFilledFields(current, data.companyForm));
      }

      if (data.jobForm && Object.keys(data.jobForm).length) {
        setJobForm((current) => mergeFilledFields(current, data.jobForm));
      }

      if (Array.isArray(data.jobDrafts) && data.jobDrafts.length) {
        setAdminJobDrafts((current) => [
          ...current,
          ...data.jobDrafts.map((draft, index) => normalizeJobDraft(draft, current.length + index))
]);
      }

      if (Array.isArray(data.workNewsDrafts) && data.workNewsDrafts.length) {
        setAdminWorkNewsDrafts((current) => [
          ...current,
          ...data.workNewsDrafts.map((draft, index) => normalizeWorkNewsDraft(draft, current.length + index))
        ]);
      }

      if (Array.isArray(data.userDrafts) && data.userDrafts.length) {
        setAdminCandidateDrafts((current) => [
          ...current,
          ...data.userDrafts.map((draft, index) => normalizeCandidateDraft(draft, current.length + index))
        ]);
      }

      if (Array.isArray(data.companyDrafts) && data.companyDrafts.length) {
        setAdminCompanyDrafts((current) => [
          ...current,
          ...data.companyDrafts.map((draft, index) => normalizeCompanyDraft(draft, current.length + index))
        ]);
      }

      const draftDestination = getAdminDraftDestination(data);
      if (draftDestination) {
        setSelectedCollection(draftDestination);
        setPage(1);
        setSearch('');
        setSelectedItemIds([]);
      }

      setAdminAssistantMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: data.reply || 'I filled the form fields I could infer. Review them before creating the record.'
        }
      ]);
    } catch (error) {
      setAdminAssistantImages((current) => current.length ? current : submittedImages);
      setAdminAssistantMessages((current) => [
        ...current,
        { role: 'assistant', text: error.message || 'Admin assistant failed.' }
      ]);
    } finally {
      setAdminAssistantBusy(false);
    }
  };

  const updateAdminJobDraft = (draftId, field, value) => {
    setAdminJobDrafts((current) => current.map((draft) => (
      draft.id === draftId ? {
        ...draft,
        [field]: value,
        ...(['applicationLink', 'applicationDeadline', 'source'].includes(field) ? {
          liveVerifiedAt: '',
          liveVerificationSourceUrl: '',
          liveVerificationUrl: '',
          liveVerificationNote: '',
          liveVerificationToken: ''
        } : {})
      } : draft
    )));
  };

  const removeAdminJobDraft = async (draftId, skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = await confirmAction({
        title: 'Delete job draft?',
        message: 'Delete this unpublished job draft?'
      });
      if (!confirmed) {
        return;
      }
    }
    setAdminJobDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const handleRestoreDeletedItem = async (id) => {
    const confirmed = await confirmAction({
      title: 'Restore item?',
      message: 'Restore this item to its original section?'
    });
    if (!confirmed) return;

    try {
      setMessage('');
      await adminFetch(`/deleted-items/${id}/restore`, { method: 'POST' });
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage('Item restored successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateAdminWorkNewsDraft = (draftId, field, value) => {
    setAdminWorkNewsDrafts((current) => current.map((draft) => (
      draft.id === draftId ? {
        ...draft,
        [field]: value,
        ...(field === 'companyWebsite' && !draft.companyLogoUrl
          ? { companyLogoUrl: getLogoFallbackFromWebsite(value) }
          : {})
      } : draft
    )));
  };

  const removeAdminWorkNewsDraft = async (draftId, skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = await confirmAction({
        title: 'Delete Work News draft?',
        message: 'Delete this unpublished Work News draft?'
      });
      if (!confirmed) {
        return;
      }
    }
    setAdminWorkNewsDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const handleAdminWorkNewsLogoUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const logo = await createSquareProfileImage(file);
      updateAdminWorkNewsDraft(draftId, 'companyLogoUrl', logo);
    } catch (error) {
      setMessage(error.message || 'Could not prepare that company profile picture.');
    }
  };

  const handleAdminWorkNewsMediaUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const dataUrl = await readAdminFileAsDataUrl(file);
      updateAdminWorkNewsDraft(draftId, 'mediaUrl', dataUrl);
      updateAdminWorkNewsDraft(draftId, 'mediaType', file.type.startsWith('video/') ? 'video' : 'image');
    } catch (error) {
      setMessage(error.message || 'Could not prepare that Work News media.');
    }
  };

  const postAdminJobDraft = async (draft) => {
    try {
      setMessage('');
      await adminFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...draft,
          applicationLink: draft.applicationLink || draft.source || ''
        })
      });
      removeAdminJobDraft(draft.id, true);
      setSelectedCollection('jobs');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'jobs', page: 1 })]);
      setMessage(`Job posted: ${draft.title || 'Untitled job'}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const postAdminWorkNewsDraft = async (draft) => {
    try {
      setMessage('');
      await adminFetch('/feed-posts', {
        method: 'POST',
        body: JSON.stringify({
          companyId: draft.companyId,
          companyJumpTakeId: draft.companyJumpTakeId,
          companyName: draft.companyName,
          companyWebsite: draft.companyWebsite,
          authorName: draft.companyName,
          companyLogoUrl: draft.companyLogoUrl,
          authorAvatar: draft.companyLogoUrl,
          body: draft.body,
          mediaUrl: draft.mediaUrl,
          mediaType: draft.mediaType,
          source: draft.source,
          sourceTitle: draft.sourceTitle,
          publishedAt: draft.publishedAt
        })
      });
      removeAdminWorkNewsDraft(draft.id, true);
      setSelectedCollection('workNewsPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'workNewsPosts', page: 1 })]);
      setMessage(`Work News posted: ${draft.companyName || 'Company update'}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDeletePostComment = async (postId, commentId) => {
    const confirmed = await confirmAction({
      title: 'Delete comment?',
      message: 'Delete this comment from the post permanently?'
    });

    if (!confirmed) {
      return;
    }

    try {
      setMessage('');
      await adminFetch(`/feed-posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage('Comment deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handlePermanentlyDeleteItem = async (id) => {
    const confirmed = await confirmAction({
      title: 'Delete forever?',
      message: 'Permanently delete this removed item? It can never be restored.',
      confirmLabel: 'Delete Forever'
    });

    if (!confirmed) {
      return;
    }

    try {
      setMessage('');
      await adminFetch(`/deleted-items/${id}/permanent`, {
        method: 'DELETE'
      });
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage('Item permanently deleted and can no longer be restored.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateAdminCandidateDraft = (draftId, field, value) => {
    setAdminCandidateDrafts((current) => current.map((draft) => (
      draft.id === draftId ? { ...draft, [field]: value } : draft
    )));
  };

  const removeAdminCandidateDraft = async (draftId, skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = await confirmAction({
        title: 'Remove draft?',
        message: 'Remove this candidate profile and talent story draft?'
      });
      if (!confirmed) {
        return;
      }
    }
    setAdminCandidateDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const handleDraftCoverUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const coverImage = await createSquareProfileImage(file);
      updateAdminCandidateDraft(draftId, 'coverImage', coverImage);
    } catch (error) {
      setMessage(error.message || 'Could not prepare that profile picture.');
    }
  };

  const handleDraftProfileUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setMessage('');
      const profileImage = await createSquareProfileImage(file);
      updateAdminCandidateDraft(draftId, 'profileImage', profileImage);
    } catch (error) {
      setMessage(error.message || 'Could not prepare that profile picture.');
    }
  };

  const handleDraftTalentStoryMediaUpload = async (draftId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setMessage('');
      const storyMediaUrl = await readAdminFileAsDataUrl(file);
      updateAdminCandidateDraft(draftId, 'storyMediaUrl', storyMediaUrl);
      updateAdminCandidateDraft(draftId, 'storyMediaType', file.type.startsWith('video/') ? 'video' : 'image');
    } catch (error) {
      setMessage(error.message || 'Could not prepare that Talent Story media.');
    }
  };

  const postAllAdminJobDrafts = async () => {
    if (!adminJobDrafts.length || isPostingAllJobs) return;
    const confirmed = await confirmAction({
      title: `Post all ${adminJobDrafts.length} job drafts?`,
      message: 'Each draft will be validated before it is published. Drafts that fail validation will remain here for review.'
    });
    if (!confirmed) return;

    setIsPostingAllJobs(true);
    setMessage('');
    try {
      const data = await adminFetch('/jobs/bulk', {
        method: 'POST',
        body: JSON.stringify({
          drafts: adminJobDrafts.map((draft) => ({
            ...draft,
            applicationLink: draft.applicationLink || draft.source || ''
          }))
        })
      });
      const postedIds = new Set((data.items || []).map((entry) => String(entry.draftId || '')).filter(Boolean));
      setAdminJobDrafts((current) => current.filter((draft) => !postedIds.has(String(draft.id))));
      setSelectedCollection('jobs');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'jobs', page: 1 })]);
      const failureNote = data.failedCount
        ? ` ${data.failedCount} draft${data.failedCount === 1 ? '' : 's'} stayed in review: ${data.failures?.[0]?.error || 'validation failed'}`
        : '';
      setMessage(`${data.postedCount || 0} job${data.postedCount === 1 ? '' : 's'} posted.${failureNote}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsPostingAllJobs(false);
    }
  };

  const createAdminCandidateFromDraft = async (draft) => {
    try {
      setMessage('');
      const data = await adminFetch('/candidates', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          jumptakeId: draft.jumptakeId,
          password: draft.password,
          profileImage: draft.profileImage,
          coverImage: draft.coverImage,
          about: draft.about,
          skills: draft.skills,
          education: draft.education,
          studies: draft.studies,
          experience: draft.experience,
          achievements: draft.achievements,
          jobInterests: draft.jobTitle
        })
      });
      const createdUserId = String(data.user?.id || data.user?._id || '');
      const createdJobSeekerId = String(data.jobSeeker?.id || data.jobSeeker?._id || '');
      if (!createdUserId) {
        throw new Error('The profile was created, but its user ID was not returned. Refresh the admin panel before posting the story.');
      }
      setAdminCandidateDrafts((current) => current.map((candidateDraft) => (
        candidateDraft.id === draft.id ? {
          ...candidateDraft,
          createdUserId,
          createdJobSeekerId,
          jumptakeId: data.user?.jumptakeId || candidateDraft.jumptakeId
        } : candidateDraft
      )));
      setSelectedCollection('talentStoryPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'talentStoryPosts', page: 1 })]);
      setMessage(data.generatedPassword
        ? `Profile created: ${data.user.email} / ${data.generatedPassword}. Review and post the Talent Story below.`
        : `Profile created: ${data.user.email || data.user.jumptakeId}. Review and post the Talent Story below.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const postAdminCandidateStory = async (draft) => {
    try {
      setMessage('');
      await adminFetch('/talent-stories', {
        method: 'POST',
        body: JSON.stringify({
          authorName: draft.name,
          authorAvatar: draft.profileImage || draft.coverImage,
          body: draft.storyBody,
          authorId: draft.createdUserId || '',
          media: draft.storyMediaUrl ? {
            dataUrl: draft.storyMediaUrl,
            type: draft.storyMediaType,
            name: `${draft.name || 'Candidate'} Talent Story media`
          } : null
        })
      });
      removeAdminCandidateDraft(draft.id, true);
      setSelectedCollection('talentStoryPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection({ collection: 'talentStoryPosts', page: 1 })]);
      setMessage(`Talent Story posted: ${draft.name || 'Candidate story'}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleUpdateJobApplicationLink = async (jobId, currentLink = '') => {
    const nextLink = window.prompt('Add or update the external application link:', currentLink || '');

    if (nextLink === null) {
      return;
    }

    try {
      setMessage('');
      await adminFetch(`/collections/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ applicationLink: nextLink.trim() })
      });
      await loadCollection();
      setMessage('Application link updated.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const selectedMeta = collections.find((collection) => collection.key === selectedCollection);

  if (!isAuthed) {
    return (
      <main className="admin-panel admin-panel-login">
        <section className="admin-login-card">
          <p className="admin-kicker">JumpTake Owner Console</p>
          <h1>Admin Access</h1>
          <p>Enter the server admin key to open the website control panel.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              validateKey(draftKey);
            }}
          >
            <input
              type="password"
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              placeholder="Admin access key"
              autoComplete="current-password"
            />
            <button type="submit">Open Admin Panel</button>
          </form>
          {message ? <div className="admin-message">{message}</div> : null}
          <button type="button" className="admin-ghost-button" onClick={() => navigate('/')}>
            Back to JumpTake
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-panel">
      <header className="admin-shell-header">
        <div>
          <p className="admin-kicker">JumpTake Owner Console</p>
          <h1>Admin Panel</h1>
          <p>Browse, search, create, and remove database records across both portals.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={() => navigate('/')}>Public Site</button>
          <button
            type="button"
            className="admin-danger-button"
            onClick={() => {
              sessionStorage.removeItem(ADMIN_KEY_STORAGE);
              setAdminKey('');
              setIsAuthed(false);
            }}
          >
            Lock Panel
          </button>
        </div>
      </header>

      {message ? <div className="admin-message">{message}</div> : null}

      <section className="admin-layout">
        <aside className="admin-sidebar">
          <h2>Collections</h2>
          {collections.map((collection) => (
            <button
              type="button"
              key={collection.key}
              className={collection.key === selectedCollection ? 'is-active' : ''}
              onClick={() => handleCollectionSelect(collection.key)}
            >
              <span>{collection.label}</span>
              <strong>{collection.count}</strong>
            </button>
          ))}
        </aside>

        <section className="admin-content">
          <div className="admin-content-header">
            <div>
              <h2>{selectedMeta?.label || selectedCollection}</h2>
              <p>{pagination.total} total records</p>
            </div>
            <form
              className="admin-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                loadCollection({ page: 1 });
              }}
            >
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this collection"
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <form className="admin-create-company" onSubmit={handleCreateCompany} hidden={selectedCollection !== 'companies'}>
            <div className="admin-form-heading-row">
              <div>
                <h3>Create Company</h3>
                <p>Creates a company record with a generated company ID. Upload a picture or leave it empty for the default icon.</p>
              </div>
              <button type="button" onClick={handleRandomizeCompany}>
                Random Company
              </button>
            </div>
            <div className="admin-company-create-layout">
              <div className="admin-company-logo-field">
                <ProfileAvatar
                  imageSrc={companyForm.logo}
                  name={companyForm.name || 'Company'}
                  className="admin-company-avatar"
                  imageClassName="admin-company-avatar-image"
                  useProfileIconFallback
                />
                <input
                  ref={companyLogoInputRef}
                  type="file"
                  className="profile-resume-input"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCompanyLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => companyLogoInputRef.current?.click()}
                  disabled={isProcessingCompanyLogo}
                >
                  {isProcessingCompanyLogo ? 'Preparing...' : 'Set Profile Picture'}
                </button>
                {companyForm.logo ? (
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={() => setCompanyForm((current) => ({ ...current, logo: '' }))}
                  >
                    Use Default Icon
                  </button>
                ) : null}
              </div>
              <div className="admin-company-fields">
                <div className="admin-form-grid">
                  <input
                    value={companyForm.name}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Company name"
                    required
                  />
                  <input
                    value={companyForm.adminCompanyId}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, adminCompanyId: event.target.value }))}
                    placeholder="Custom company ID"
                  />
                  <input
                    value={companyForm.jumptakeId}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, jumptakeId: event.target.value.toLowerCase().replace(/^@+/, '') }))}
                    placeholder="Company JumpTake ID (generated if empty)"
                  />
                  <input
                    value={companyForm.industry}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, industry: event.target.value }))}
                    placeholder="Industry"
                  />
                  <input
                    value={companyForm.headquarters}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, headquarters: event.target.value }))}
                    placeholder="Headquarters"
                  />
                  <input
                    value={companyForm.website}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, website: event.target.value }))}
                    placeholder="Website"
                  />
                  <input
                    value={companyForm.founded}
                    onChange={(event) => setCompanyForm((current) => ({ ...current, founded: event.target.value }))}
                    placeholder="Founded"
                  />
                </div>
                <textarea
                  value={companyForm.description}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Company description"
                />
                <button type="submit">Create Company</button>
              </div>
            </div>
          </form>

          {adminCompanyDrafts.length && ['companies', 'workNewsPosts'].includes(selectedCollection) ? (
            <section className="admin-ai-job-drafts admin-ai-company-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>{selectedCollection === 'workNewsPosts' ? 'AI Company & Work News Profile Drafts' : 'AI Company Profile Drafts'}</h3>
                  <p>{selectedCollection === 'workNewsPosts'
                    ? 'Create each company profile first; its logo, JumpTake ID, and database ID stay linked to the Work News draft below.'
                    : 'Review each company profile and its assigned JumpTake ID before creation.'}</p>
                </div>
                <button type="button" className="admin-ghost-button" onClick={() => setAdminCompanyDrafts([])}>
                  Clear Drafts
                </button>
              </div>
              <div className="admin-ai-job-draft-list">
                {adminCompanyDrafts.map((draft, index) => (
                  <article className="admin-ai-job-draft-card admin-ai-company-draft-card" key={draft.id}>
                    <div className="admin-record-card-header">
                      <div className="admin-work-news-draft-title">
                        <ProfileAvatar
                          imageSrc={draft.logo}
                          name={draft.name || 'Company'}
                          className="admin-work-news-draft-logo"
                          imageClassName="admin-work-news-draft-logo-image"
                          useProfileIconFallback
                        />
                        <div>
                          <h3>Draft {index + 1}: {draft.name || 'Unnamed company'}</h3>
                          <p>{draft.jumptakeId ? `@${draft.jumptakeId}` : 'JumpTake ID not set'}</p>
                        </div>
                      </div>
                      <div className="admin-draft-actions">
                        <button type="button" onClick={() => createAdminCompanyFromDraft(draft)} disabled={!draft.name || !draft.jumptakeId}>
                          Create Company
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminCompanyDraft(draft.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.name} onChange={(event) => updateAdminCompanyDraft(draft.id, 'name', event.target.value)} placeholder="Company name" />
                      <input value={draft.jumptakeId} onChange={(event) => updateAdminCompanyDraft(draft.id, 'jumptakeId', event.target.value.toLowerCase().replace(/^@+/, ''))} placeholder="Company JumpTake ID" />
                      <input value={draft.adminCompanyId} onChange={(event) => updateAdminCompanyDraft(draft.id, 'adminCompanyId', event.target.value)} placeholder="Admin company ID" />
                      <input value={draft.industry} onChange={(event) => updateAdminCompanyDraft(draft.id, 'industry', event.target.value)} placeholder="Industry" />
                      <input value={draft.headquarters} onChange={(event) => updateAdminCompanyDraft(draft.id, 'headquarters', event.target.value)} placeholder="Headquarters" />
                      <input value={draft.website} onChange={(event) => updateAdminCompanyDraft(draft.id, 'website', event.target.value)} placeholder="Website" />
                      <input value={draft.founded} onChange={(event) => updateAdminCompanyDraft(draft.id, 'founded', event.target.value)} placeholder="Founded" />
                      <input value={draft.logo} onChange={(event) => updateAdminCompanyDraft(draft.id, 'logo', event.target.value)} placeholder="Logo URL" />
                    </div>
                    <div className="admin-work-news-upload-row">
                      <label className="admin-work-news-file-button">
                        Upload company profile picture
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(event) => handleAdminCompanyDraftLogoUpload(draft.id, event)}
                        />
                      </label>
                      {draft.logo ? (
                        <button type="button" className="admin-ghost-button" onClick={() => updateAdminCompanyDraft(draft.id, 'logo', '')}>
                          Use Default Profile Icon
                        </button>
                      ) : null}
                    </div>
                    <textarea value={draft.description} onChange={(event) => updateAdminCompanyDraft(draft.id, 'description', event.target.value)} placeholder="Company description" />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <form className="admin-create-work-news" onSubmit={handleCreateWorkNewsPost} hidden={!['feedPosts', 'workNewsPosts'].includes(selectedCollection)}>
            <div className="admin-form-heading-row">
              <div>
                <h3>Create Work News Post</h3>
                <p>Post as a company. Upload a profile picture for the post and attach an image or video below the text.</p>
              </div>
              <button type="submit">
                Post Work News
              </button>
            </div>
            <div className="admin-work-news-create-layout">
              <div className="admin-company-logo-field">
                <ProfileAvatar
                  imageSrc={workNewsPostForm.companyLogoUrl}
                  name={workNewsPostForm.companyName || 'Company'}
                  className="admin-company-avatar"
                  imageClassName="admin-company-avatar-image"
                  useProfileIconFallback
                />
                <label className="admin-work-news-file-button">
                  Set Company Profile Picture
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleWorkNewsPostLogoUpload}
                  />
                </label>
                {workNewsPostForm.companyLogoUrl ? (
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={() => setWorkNewsPostForm((current) => ({ ...current, companyLogoUrl: '' }))}
                  >
                    Use Default Icon
                  </button>
                ) : null}
              </div>
              <div className="admin-company-fields">
                <div className="admin-form-grid">
                  <input
                    value={workNewsPostForm.companyName}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, companyName: event.target.value }))}
                    placeholder="Company name"
                    required
                  />
                  <input
                    value={workNewsPostForm.companyId}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, companyId: event.target.value }))}
                    placeholder="Existing company database ID"
                  />
                  <input
                    value={workNewsPostForm.companyJumpTakeId}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, companyJumpTakeId: event.target.value.toLowerCase().replace(/^@+/, '') }))}
                    placeholder="Company JumpTake ID"
                  />
                  <input
                    value={workNewsPostForm.sourceTitle}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, sourceTitle: event.target.value }))}
                    placeholder="Source title"
                  />
                  <input
                    type="url"
                    value={workNewsPostForm.companyWebsite}
                    onChange={(event) => {
                      const companyWebsite = event.target.value;
                      setWorkNewsPostForm((current) => ({
                        ...current,
                        companyWebsite,
                        companyLogoUrl: current.companyLogoUrl || getLogoFallbackFromWebsite(companyWebsite)
                      }));
                    }}
                    placeholder="Official company website"
                  />
                  <input
                    type="url"
                    value={workNewsPostForm.source}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, source: event.target.value }))}
                    placeholder="Source URL"
                  />
                  <select
                    value={workNewsPostForm.mediaType}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, mediaType: event.target.value }))}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <textarea
                  value={workNewsPostForm.body}
                  onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Work News post text"
                  required={!workNewsPostForm.mediaUrl}
                />
                <div className="admin-work-news-upload-row">
                  <label className="admin-work-news-file-button">
                    Upload post picture or video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleWorkNewsPostMediaUpload}
                    />
                  </label>
                  <input
                    type="url"
                    value={workNewsPostForm.mediaUrl.startsWith('data:') ? '' : workNewsPostForm.mediaUrl}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, mediaUrl: event.target.value }))}
                    placeholder="Or paste post image/video URL"
                  />
                  {workNewsPostForm.mediaUrl ? (
                    <button
                      type="button"
                      className="admin-ghost-button"
                      onClick={() => setWorkNewsPostForm((current) => ({ ...current, mediaUrl: '' }))}
                    >
                      Remove Post Media
                    </button>
                  ) : null}
                </div>
                {workNewsPostForm.mediaUrl ? (
                  <div className="admin-work-news-media-preview">
                    {workNewsPostForm.mediaType === 'video' ? (
                      <video src={workNewsPostForm.mediaUrl} controls muted />
                    ) : (
                      <img src={workNewsPostForm.mediaUrl} alt="" />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </form>

          <form className="admin-create-company admin-create-candidate" onSubmit={handleCreateCandidate} hidden={!['users', 'jobSeekers'].includes(selectedCollection)}>
            <div className="admin-form-heading-row">
              <div>
                <h3>Create Candidate User</h3>
                <p>Creates a candidate login and profile with a profile picture, cover photo, and about description. Leave email or password empty to generate them.</p>
              </div>
              <button type="submit">Create Candidate User</button>
            </div>
            <div className="admin-company-create-layout">
              <div className="admin-candidate-photos">
                <div className="admin-company-logo-field">
                  <ProfileAvatar
                    imageSrc={candidateForm.profileImage}
                    name={candidateForm.name || 'Candidate'}
                    className="admin-company-avatar"
                    imageClassName="admin-company-avatar-image"
                    useProfileIconFallback
                  />
                  <input
                    ref={candidateProfileInputRef}
                    type="file"
                    className="profile-resume-input"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCandidateProfileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => candidateProfileInputRef.current?.click()}
                  >
                    Set Profile Picture
                  </button>
                  {candidateForm.profileImage ? (
                    <button
                      type="button"
                      className="admin-ghost-button"
                      onClick={() => setCandidateForm((current) => ({ ...current, profileImage: '' }))}
                    >
                      Remove Profile Picture
                    </button>
                  ) : null}
                </div>
                <div className="admin-company-logo-field">
                  <ProfileAvatar
                    imageSrc={candidateForm.coverImage}
                    name={candidateForm.name || 'Candidate'}
                    className="admin-company-avatar"
                    imageClassName="admin-company-avatar-image"
                    useProfileIconFallback
                  />
                  <input
                    ref={candidateCoverInputRef}
                    type="file"
                    className="profile-resume-input"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCandidateCoverUpload}
                  />
                  <button
                    type="button"
                    onClick={() => candidateCoverInputRef.current?.click()}
                  >
                    Set Cover Photo
                  </button>
                  {candidateForm.coverImage ? (
                    <button
                      type="button"
                      className="admin-ghost-button"
                      onClick={() => setCandidateForm((current) => ({ ...current, coverImage: '' }))}
                    >
                      Remove Cover Photo
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="admin-company-fields">
                <div className="admin-form-grid">
                  <input
                    value={candidateForm.name}
                    onChange={(event) => setCandidateForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Full name"
                    required
                  />
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(event) => setCandidateForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email (generated if empty)"
                  />
                  <input
                    value={candidateForm.jumptakeId}
                    onChange={(event) => setCandidateForm((current) => ({ ...current, jumptakeId: event.target.value.toLowerCase().replace(/^@+/, '') }))}
                    placeholder="JumpTake ID (generated if empty)"
                  />
                  <input
                    value={candidateForm.password}
                    onChange={(event) => setCandidateForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Password (generated if empty)"
                  />
                  <input
                    value={candidateForm.skills}
                    onChange={(event) => setCandidateForm((current) => ({ ...current, skills: event.target.value }))}
                    placeholder="Skills, comma separated"
                  />
                </div>
                <textarea
                  value={candidateForm.about}
                  onChange={(event) => setCandidateForm((current) => ({ ...current, about: event.target.value }))}
                  placeholder="About description"
                />
                <button type="submit">Create Candidate User</button>
              </div>
            </div>
          </form>

          <form className="admin-create-work-news admin-create-talent-story" onSubmit={handleCreateTalentStory} hidden={selectedCollection !== 'talentStoryPosts'}>
            <div className="admin-form-heading-row">
              <div>
                <h3>Create Talent Story Post</h3>
                <p>Post a candidate talent story with their name and cover photo. Best used after creating the candidate user.</p>
              </div>
              <button type="submit">Post Talent Story</button>
            </div>
            <div className="admin-work-news-create-layout">
              <div className="admin-company-logo-field">
                <ProfileAvatar
                  imageSrc={talentStoryForm.authorAvatar}
                  name={talentStoryForm.authorName || 'Candidate'}
                  className="admin-company-avatar"
                  imageClassName="admin-company-avatar-image"
                  useProfileIconFallback
                />
                <input
                  ref={talentStoryCoverInputRef}
                  type="file"
                  className="profile-resume-input"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleTalentStoryCoverUpload}
                />
                <button
                  type="button"
                  onClick={() => talentStoryCoverInputRef.current?.click()}
                >
                  Set Cover Photo
                </button>
                {talentStoryForm.authorAvatar ? (
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={() => setTalentStoryForm((current) => ({ ...current, authorAvatar: '' }))}
                  >
                    Remove Cover Photo
                  </button>
                ) : null}
              </div>
              <div className="admin-company-fields">
                <div className="admin-form-grid">
                  <input
                    value={talentStoryForm.authorName}
                    onChange={(event) => setTalentStoryForm((current) => ({ ...current, authorName: event.target.value }))}
                    placeholder="Candidate name"
                    required
                  />
                </div>
                <textarea
                  value={talentStoryForm.body}
                  onChange={(event) => setTalentStoryForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Talent Story text / about description"
                  required
                />
                <div className="admin-work-news-upload-row">
                  <label className="admin-work-news-file-button">
                    Upload story picture or video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleTalentStoryMediaUpload}
                    />
                  </label>
                  <input
                    type="url"
                    value={talentStoryForm.mediaUrl.startsWith('data:') ? '' : talentStoryForm.mediaUrl}
                    onChange={(event) => setTalentStoryForm((current) => ({ ...current, mediaUrl: event.target.value }))}
                    placeholder="Or paste story image/video URL"
                  />
                  <select
                    value={talentStoryForm.mediaType}
                    onChange={(event) => setTalentStoryForm((current) => ({ ...current, mediaType: event.target.value }))}
                    aria-label="Talent Story media type"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  {talentStoryForm.mediaUrl ? (
                    <button
                      type="button"
                      className="admin-ghost-button"
                      onClick={() => setTalentStoryForm((current) => ({ ...current, mediaUrl: '' }))}
                    >
                      Remove Story Media
                    </button>
                  ) : null}
                </div>
                {talentStoryForm.mediaUrl ? (
                  <div className="admin-work-news-media-preview">
                    {talentStoryForm.mediaType === 'video' ? (
                      <video src={talentStoryForm.mediaUrl} controls muted />
                    ) : (
                      <img src={talentStoryForm.mediaUrl} alt="" />
                    )}
                  </div>
                ) : null}
                <button type="submit">Post Talent Story</button>
              </div>
            </div>
          </form>

          <form className="admin-create-job" onSubmit={handleCreateJob} hidden={selectedCollection !== 'jobs'}>
            <h3>Create Job Post As Company</h3>
            <div className="admin-form-grid">
              <input
                value={jobForm.company}
                onChange={(event) => setJobForm((current) => ({ ...current, company: event.target.value }))}
                placeholder="Company ID"
                required
              />
              <input
                value={jobForm.companyName}
                onChange={(event) => setJobForm((current) => ({ ...current, companyName: event.target.value }))}
                placeholder="Company name if ID is new"
              />
              <input
                value={jobForm.title}
                onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Job title"
                required
              />
              <input
                value={jobForm.location}
                onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Location"
                required
              />
              <input
                value={jobForm.sector}
                onChange={(event) => setJobForm((current) => ({ ...current, sector: event.target.value }))}
                placeholder="Sector or occupation"
                list="admin-job-sector-options"
              />
              <input
                value={jobForm.salary}
                onChange={(event) => setJobForm((current) => ({ ...current, salary: event.target.value }))}
                placeholder="Salary"
              />
              <input
                type="url"
                value={jobForm.applicationLink}
                onChange={(event) => setJobForm((current) => ({ ...current, applicationLink: event.target.value }))}
                placeholder="Application link"
              />
              <input
                type="date"
                value={jobForm.applicationDeadline}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setJobForm((current) => ({ ...current, applicationDeadline: event.target.value }))}
                aria-label="Application deadline"
              />
              <select
                value={jobForm.jobType}
                onChange={(event) => setJobForm((current) => ({ ...current, jobType: event.target.value }))}
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Remote</option>
              </select>
              <input
                value={jobForm.skills}
                onChange={(event) => setJobForm((current) => ({ ...current, skills: event.target.value }))}
                placeholder="Skills, comma separated"
              />
            </div>
            <textarea
              value={jobForm.description}
              onChange={(event) => setJobForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
              required
            />
            <textarea
              value={jobForm.requirements}
              onChange={(event) => setJobForm((current) => ({ ...current, requirements: event.target.value }))}
              placeholder="Requirements, one per line"
            />
            <textarea
              value={jobForm.responsibilities}
              onChange={(event) => setJobForm((current) => ({ ...current, responsibilities: event.target.value }))}
              placeholder="Responsibilities, one per line"
            />
            <button type="submit">Create Job</button>
          </form>

          {adminJobDrafts.length && selectedCollection === 'jobs' ? (
            <section className="admin-ai-job-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>AI Job Drafts</h3>
                  <p>Review each web-sourced job before posting it to JumpTake.</p>
                </div>
                <div className="admin-draft-actions">
                  <button type="button" onClick={postAllAdminJobDrafts} disabled={isPostingAllJobs}>
                    {isPostingAllJobs ? 'Posting...' : `Post All (${adminJobDrafts.length})`}
                  </button>
                  <button type="button" className="admin-ghost-button" onClick={() => setAdminJobDrafts([])} disabled={isPostingAllJobs}>
                    Clear Drafts
                  </button>
                </div>
              </div>
              <div className="admin-ai-job-draft-list">
                {adminJobDrafts.map((draft, index) => (
                  <article className="admin-ai-job-draft-card" key={draft.id}>
                    <div className="admin-record-card-header">
                      <div>
                        <h3>Draft {index + 1}: {draft.title || 'Untitled job'}</h3>
                        <p>{draft.companyName || draft.company || 'Company not set'}</p>
                      </div>
                      <div className="admin-draft-actions">
                        <button type="button" onClick={() => postAdminJobDraft(draft)} disabled={isPostingAllJobs}>
                          Post Job
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminJobDraft(draft.id)} disabled={isPostingAllJobs}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.company} onChange={(event) => updateAdminJobDraft(draft.id, 'company', event.target.value)} placeholder="Company ID" />
                      <input value={draft.companyName} onChange={(event) => updateAdminJobDraft(draft.id, 'companyName', event.target.value)} placeholder="Company name" />
                      <input value={draft.title} onChange={(event) => updateAdminJobDraft(draft.id, 'title', event.target.value)} placeholder="Job title" />
                      <input value={draft.location} onChange={(event) => updateAdminJobDraft(draft.id, 'location', event.target.value)} placeholder="Location" />
                      <input value={draft.sector} onChange={(event) => updateAdminJobDraft(draft.id, 'sector', event.target.value)} placeholder="Sector or occupation" list="admin-job-sector-options" />
                      <input value={draft.salary} onChange={(event) => updateAdminJobDraft(draft.id, 'salary', event.target.value)} placeholder="Salary" />
                      <input type="url" value={draft.applicationLink} onChange={(event) => updateAdminJobDraft(draft.id, 'applicationLink', event.target.value)} placeholder="Exact Apply button link" />
                      <input type="date" value={draft.applicationDeadline} min={new Date().toISOString().slice(0, 10)} onChange={(event) => updateAdminJobDraft(draft.id, 'applicationDeadline', event.target.value)} aria-label="Application deadline" />
                      <select value={draft.jobType} onChange={(event) => updateAdminJobDraft(draft.id, 'jobType', event.target.value)}>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Internship</option>
                        <option>Remote</option>
                      </select>
                      <input value={draft.skills} onChange={(event) => updateAdminJobDraft(draft.id, 'skills', event.target.value)} placeholder="Skills, comma separated" />
                      <input type="url" value={draft.source} onChange={(event) => updateAdminJobDraft(draft.id, 'source', event.target.value)} placeholder="Exact role page URL" />
                    </div>
                    {draft.liveVerifiedAt ? (
                      <p className="admin-candidate-draft-created">
                        Exact role and Apply link verified {new Date(draft.liveVerifiedAt).toLocaleString()}{draft.applicationDeadline ? ` - Deadline ${draft.applicationDeadline}` : ' - No deadline published'}
                      </p>
                    ) : null}
                    <textarea value={draft.description} onChange={(event) => updateAdminJobDraft(draft.id, 'description', event.target.value)} placeholder="Description" />
                    <textarea value={draft.requirements} onChange={(event) => updateAdminJobDraft(draft.id, 'requirements', event.target.value)} placeholder="Requirements, one per line" />
                    <textarea value={draft.responsibilities} onChange={(event) => updateAdminJobDraft(draft.id, 'responsibilities', event.target.value)} placeholder="Responsibilities, one per line" />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {adminWorkNewsDrafts.length && ['feedPosts', 'workNewsPosts'].includes(selectedCollection) ? (
            <section className="admin-ai-job-drafts admin-ai-work-news-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>AI Work News Drafts</h3>
                  <p>Review each linked company update before posting it to Work News.</p>
                </div>
                <button type="button" className="admin-ghost-button" onClick={() => setAdminWorkNewsDrafts([])}>
                  Clear Drafts
                </button>
              </div>
              <div className="admin-ai-job-draft-list">
                {adminWorkNewsDrafts.map((draft, index) => (
                  <article className="admin-ai-job-draft-card admin-ai-work-news-draft-card" key={draft.id}>
                    <div className="admin-record-card-header">
                      <div className="admin-work-news-draft-title">
                        <ProfileAvatar
                          imageSrc={draft.companyLogoUrl}
                          name={draft.companyName || 'Company'}
                          className="admin-work-news-draft-logo"
                          imageClassName="admin-work-news-draft-logo-image"
                          useProfileIconFallback
                        />
                        <div>
                          <h3>Draft {index + 1}: {draft.companyName || 'Company update'}</h3>
                          <p>{draft.sourceTitle || draft.source || 'Source not set'}</p>
                        </div>
                      </div>
                      <div className="admin-draft-actions">
                        <button
                          type="button"
                          onClick={() => postAdminWorkNewsDraft(draft)}
                          disabled={hasPendingCompanyDraftForWorkNews(draft)}
                          title={hasPendingCompanyDraftForWorkNews(draft) ? 'Create the linked company profile above before posting its Work News update' : 'Post Work News'}
                        >
                          Post Work News
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminWorkNewsDraft(draft.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.companyId} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyId', event.target.value)} placeholder="Company database ID" />
                      <input value={draft.companyJumpTakeId} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyJumpTakeId', event.target.value.toLowerCase().replace(/^@+/, ''))} placeholder="Company JumpTake ID" />
                      <input value={draft.companyName} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyName', event.target.value)} placeholder="Company name" />
                      <input type="url" value={draft.companyWebsite} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyWebsite', event.target.value)} placeholder="Official company website" />
                      <input type="url" value={draft.companyLogoUrl} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyLogoUrl', event.target.value)} placeholder="Company logo/profile picture URL" />
                      <input type="url" value={draft.mediaUrl} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'mediaUrl', event.target.value)} placeholder="Post image or video URL" />
                      <select value={draft.mediaType} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'mediaType', event.target.value)}>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <input value={draft.sourceTitle} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'sourceTitle', event.target.value)} placeholder="Source title" />
                      <input type="date" value={draft.publishedAt ? draft.publishedAt.slice(0, 10) : ''} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'publishedAt', event.target.value)} aria-label="Source publication date" />
                      <input type="url" value={draft.source} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'source', event.target.value)} placeholder="Source URL" />
                    </div>
                    <div className="admin-work-news-upload-row">
                      <label className="admin-work-news-file-button">
                        Upload company profile picture
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(event) => handleAdminWorkNewsLogoUpload(draft.id, event)}
                        />
                      </label>
                      <label className="admin-work-news-file-button">
                        Upload post picture or video
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(event) => handleAdminWorkNewsMediaUpload(draft.id, event)}
                        />
                      </label>
                      {draft.companyLogoUrl ? (
                        <button type="button" className="admin-ghost-button" onClick={() => updateAdminWorkNewsDraft(draft.id, 'companyLogoUrl', '')}>
                          Use Default Profile Icon
                        </button>
                      ) : null}
                      {draft.mediaUrl ? (
                        <button type="button" className="admin-ghost-button" onClick={() => updateAdminWorkNewsDraft(draft.id, 'mediaUrl', '')}>
                          Remove Post Media
                        </button>
                      ) : null}
                    </div>
                    <textarea value={draft.body} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'body', event.target.value)} placeholder="Work News post text" />
                    {draft.sourceVerifiedAt ? (
                      <p className="admin-candidate-draft-created">
                        Live source verified {new Date(draft.sourceVerifiedAt).toLocaleString()}{draft.publishedAt ? ` - Published ${new Date(draft.publishedAt).toLocaleDateString()}` : ''}
                      </p>
                    ) : null}
                    {hasPendingCompanyDraftForWorkNews(draft) ? (
                      <p className="admin-candidate-draft-created">Create the linked company profile above before posting this Work News update.</p>
                    ) : draft.companyId ? (
                      <p className="admin-candidate-draft-created">Company profile linked. This update is ready to post.</p>
                    ) : null}
                    {draft.mediaUrl ? (
                      <div className="admin-work-news-media-preview">
                        {draft.mediaType === 'video' ? (
                          <video src={draft.mediaUrl} controls muted />
                        ) : (
                          <img src={draft.mediaUrl} alt="" />
                        )}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {adminCandidateDrafts.length && ['users', 'jobSeekers', 'talentStoryPosts'].includes(selectedCollection) ? (
            <section className="admin-ai-job-drafts admin-ai-candidate-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>AI Candidate &amp; Talent Story Drafts</h3>
                  <p>Review each candidate profile and its talent story before creating them on JumpTake.</p>
                </div>
                <button type="button" className="admin-ghost-button" onClick={() => setAdminCandidateDrafts([])}>
                  Clear Drafts
                </button>
              </div>
              <div className="admin-ai-job-draft-list">
                {adminCandidateDrafts.map((draft, index) => (
                  <article className="admin-ai-job-draft-card admin-ai-candidate-draft-card" key={draft.id}>
                    <div className="admin-record-card-header">
                      <div className="admin-work-news-draft-title">
                        <ProfileAvatar
                          imageSrc={draft.profileImage || draft.coverImage}
                          name={draft.name || 'Candidate'}
                          className="admin-work-news-draft-logo"
                          imageClassName="admin-work-news-draft-logo-image"
                          useProfileIconFallback
                        />
                        <div>
                          <h3>Draft {index + 1}: {draft.name || 'Candidate profile'}</h3>
                          <p>{draft.jobTitle || draft.email || 'Profile not set'}</p>
                        </div>
                      </div>
                      <div className="admin-draft-actions">
                        <button
                          type="button"
                          onClick={() => createAdminCandidateFromDraft(draft)}
                          disabled={Boolean(draft.createdUserId)}
                        >
                          {draft.createdUserId ? 'Profile Created' : 'Create Profile'}
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminCandidateDraft(draft.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.name} onChange={(event) => updateAdminCandidateDraft(draft.id, 'name', event.target.value)} placeholder="Full name" />
                      <input value={draft.email} onChange={(event) => updateAdminCandidateDraft(draft.id, 'email', event.target.value)} placeholder="Email" />
                      <input value={draft.jumptakeId} onChange={(event) => updateAdminCandidateDraft(draft.id, 'jumptakeId', event.target.value.toLowerCase().replace(/^@+/, ''))} placeholder="JumpTake ID" />
                      <input value={draft.jobTitle} onChange={(event) => updateAdminCandidateDraft(draft.id, 'jobTitle', event.target.value)} placeholder="Job title" />
                      <input value={draft.skills} onChange={(event) => updateAdminCandidateDraft(draft.id, 'skills', event.target.value)} placeholder="Skills, comma separated" />
                      <input
                        type="url"
                        value={draft.profileImage.startsWith('data:') ? '' : draft.profileImage}
                        onChange={(event) => updateAdminCandidateDraft(draft.id, 'profileImage', event.target.value)}
                        placeholder="Or paste profile picture URL"
                      />
                      <input
                        type="url"
                        value={draft.coverImage.startsWith('data:') ? '' : draft.coverImage}
                        onChange={(event) => updateAdminCandidateDraft(draft.id, 'coverImage', event.target.value)}
                        placeholder="Or paste cover photo URL"
                      />
                      <input
                        type="url"
                        value={draft.storyMediaUrl.startsWith('data:') ? '' : draft.storyMediaUrl}
                        onChange={(event) => updateAdminCandidateDraft(draft.id, 'storyMediaUrl', event.target.value)}
                        placeholder="Story image or video URL"
                      />
                      <select value={draft.storyMediaType} onChange={(event) => updateAdminCandidateDraft(draft.id, 'storyMediaType', event.target.value)} aria-label="Draft story media type">
                        <option value="image">Story image</option>
                        <option value="video">Story video</option>
                      </select>
                    </div>
                    <div className="admin-candidate-background-grid">
                      <textarea value={draft.education} onChange={(event) => updateAdminCandidateDraft(draft.id, 'education', event.target.value)} placeholder="Education, one item per line" />
                      <textarea value={draft.studies} onChange={(event) => updateAdminCandidateDraft(draft.id, 'studies', event.target.value)} placeholder="Degrees and fields of study" />
                      <textarea value={draft.experience} onChange={(event) => updateAdminCandidateDraft(draft.id, 'experience', event.target.value)} placeholder="Experience and completed work" />
                      <textarea value={draft.achievements} onChange={(event) => updateAdminCandidateDraft(draft.id, 'achievements', event.target.value)} placeholder="Achievements and results" />
                    </div>
                    <div className="admin-work-news-upload-row">
                      <label className="admin-work-news-file-button">
                        Upload profile picture
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(event) => handleDraftProfileUpload(draft.id, event)}
                        />
                      </label>
                      <label className="admin-work-news-file-button">
                        Upload cover photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(event) => handleDraftCoverUpload(draft.id, event)}
                        />
                      </label>
                      <label className="admin-work-news-file-button">
                        Upload story picture or video
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(event) => handleDraftTalentStoryMediaUpload(draft.id, event)}
                        />
                      </label>
                      {draft.profileImage ? (
                        <button
                          type="button"
                          className="admin-ghost-button"
                          onClick={() => updateAdminCandidateDraft(draft.id, 'profileImage', '')}
                        >
                          Remove Profile Picture
                        </button>
                      ) : null}
                      {draft.coverImage ? (
                        <button
                          type="button"
                          className="admin-ghost-button"
                          onClick={() => updateAdminCandidateDraft(draft.id, 'coverImage', '')}
                        >
                          Remove Cover Photo
                        </button>
                      ) : null}
                      {draft.storyMediaUrl ? (
                        <button
                          type="button"
                          className="admin-ghost-button"
                          onClick={() => updateAdminCandidateDraft(draft.id, 'storyMediaUrl', '')}
                        >
                          Remove Story Media
                        </button>
                      ) : null}
                    </div>
                    <textarea value={draft.about} onChange={(event) => updateAdminCandidateDraft(draft.id, 'about', event.target.value)} placeholder="About description" />
                    {draft.profileImage ? (
                      <div className="admin-work-news-media-preview">
                        <img src={draft.profileImage} alt="" />
                      </div>
                    ) : null}
                    {draft.coverImage ? (
                      <div className="admin-work-news-media-preview">
                        <img src={draft.coverImage} alt="" />
                      </div>
                    ) : null}
                    <section className="admin-candidate-story-draft" aria-label={`Talent Story draft for ${draft.name || 'candidate'}`}>
                      <div className="admin-candidate-story-heading">
                        <div>
                          <p className="admin-kicker">Talent Story draft</p>
                          <h4>{draft.name ? `${draft.name}'s post` : 'Candidate post'}</h4>
                        </div>
                        <span>{draft.createdUserId ? 'Profile linked' : 'Create profile first'}</span>
                      </div>
                      <textarea
                        value={draft.storyBody}
                        onChange={(event) => updateAdminCandidateDraft(draft.id, 'storyBody', event.target.value)}
                        placeholder="Write the candidate's completed work, achievement, project, or progress update"
                      />
                      {draft.storyMediaUrl ? (
                        <div className="admin-work-news-media-preview">
                          {draft.storyMediaType === 'video' ? (
                            <video src={draft.storyMediaUrl} controls muted />
                          ) : (
                            <img src={draft.storyMediaUrl} alt="" />
                          )}
                        </div>
                      ) : null}
                      <div className="admin-candidate-story-actions">
                        <p>{draft.createdUserId
                          ? 'Review the story, then post it as this candidate.'
                          : 'Create the candidate profile above to enable posting.'}</p>
                        <button
                          type="button"
                          onClick={() => postAdminCandidateStory(draft)}
                          disabled={!draft.storyBody.trim() || !draft.createdUserId}
                          title={!draft.createdUserId ? 'Create the profile before posting its linked Talent Story' : 'Post Talent Story'}
                        >
                          Post Talent Story
                        </button>
                      </div>
                    </section>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="admin-bulk-actions" aria-label="Bulk record actions">
            <label className="admin-select-all-control">
              <input
                type="checkbox"
                checked={Boolean(items.length) && items.every((item) => selectedItemIds.includes(item._id))}
                onChange={(event) => setSelectedItemIds(event.target.checked ? items.map((item) => item._id) : [])}
                disabled={!items.length}
              />
              <span>Select this page</span>
            </label>
            <span>{selectedItemIds.length} selected</span>
            <button
              type="button"
              className="admin-danger-button"
              onClick={() => handleBulkDelete(false)}
              disabled={!selectedItemIds.length}
            >
              {selectedCollection === 'deletedItems' ? 'Delete Selected Forever' : 'Delete Selected'}
            </button>
            <button
              type="button"
              className="admin-danger-button"
              onClick={() => handleBulkDelete(true)}
              disabled={!pagination.total}
            >
              {selectedCollection === 'deletedItems' ? 'Delete All Forever' : 'Delete All'}
            </button>
          </div>

          <div className="admin-records">
            {isLoading ? <p className="admin-empty">Loading records...</p> : null}
            {!isLoading && !items.length ? <p className="admin-empty">No records found.</p> : null}
            {items.map((item) => (
              <article className="admin-record-card" key={item._id}>
                <div className="admin-record-card-header">
                  <div className="admin-record-identity">
                    <label className="admin-record-select" aria-label={`Select ${item.label || item.title || item.name || item._id}`}>
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item._id)}
                        onChange={() => toggleSelectedItem(item._id)}
                      />
                    </label>
                    <div>
                    <h3>{item.label || item.title || item.name || item.email || item.username || item.authorName || item.sourceTitle || item._id}</h3>
                    <p>{selectedCollection === 'deletedItems' ? `${item.collection} · ${item.itemType}` : item._id}</p>
                    </div>
                  </div>
{selectedCollection === 'deletedItems' ? (
                    <div className="admin-draft-actions">
                      <button type="button" onClick={() => handleRestoreDeletedItem(item._id)}>
                        Undo Delete
                      </button>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => handlePermanentlyDeleteItem(item._id)}
                      >
                        Delete Forever
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="admin-danger-button"
                      onClick={() => handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  )}
                  {selectedCollection === 'jobs' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateJobApplicationLink(item._id, item.applicationLink)}
                    >
                      Set Apply Link
                    </button>
                  ) : null}
                </div>
                {selectedCollection === 'companies' ? (
                  <section className="admin-existing-company-logo-editor" aria-label={`Profile picture for ${item.name || 'company'}`}>
                    <ProfileAvatar
                      imageSrc={getExistingCompanyLogo(item)}
                      name={item.name || 'Company'}
                      className="admin-company-avatar"
                      imageClassName="admin-company-avatar-image"
                      useProfileIconFallback
                    />
                    <div className="admin-existing-company-logo-fields">
                      <label>
                        <span>Company profile picture URL</span>
                        <input
                          type="url"
                          value={getExistingCompanyLogo(item).startsWith('data:') ? '' : getExistingCompanyLogo(item)}
                          placeholder="https://company.com/logo.png"
                          onChange={(event) => updateExistingCompanyLogoEdit(item._id, event.target.value)}
                          disabled={updatingCompanyLogoId === item._id}
                        />
                      </label>
                      <div className="admin-existing-company-logo-actions">
                        <label className="admin-work-news-file-button">
                          Upload Picture
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(event) => handleExistingCompanyLogoUpload(item._id, event)}
                            disabled={updatingCompanyLogoId === item._id}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => saveExistingCompanyLogo(item._id, getExistingCompanyLogo(item))}
                          disabled={updatingCompanyLogoId === item._id || getExistingCompanyLogo(item).startsWith('data:')}
                        >
                          {updatingCompanyLogoId === item._id ? 'Saving...' : 'Save URL'}
                        </button>
                        {getExistingCompanyLogo(item) ? (
                          <button
                            type="button"
                            className="admin-ghost-button"
                            onClick={() => saveExistingCompanyLogo(item._id, '')}
                            disabled={updatingCompanyLogoId === item._id}
                          >
                            Remove Picture
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}
                <dl>
                  {Object.entries(item)
                    .filter(([key]) => key !== '_id' && key !== 'logo')
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <React.Fragment key={key}>
                        <dt>{key}</dt>
                        <dd>{formatValue(value)}</dd>
                      </React.Fragment>
                    ))}
                </dl>
                {FEED_POST_COLLECTIONS.has(selectedCollection) && Array.isArray(item.comments) && item.comments.length ? (
                  <div className="admin-comment-tools">
                    <h4>Comments</h4>
                    {item.comments.map((comment, index) => {
                      const commentId = comment.id || comment._id || `comment-${index}`;
                      return (
                        <div className="admin-comment-tool" key={commentId}>
                          <span>{formatValue(comment.authorName)}: {formatValue(comment.text)}</span>
                          <button
                            type="button"
                            className="admin-danger-button"
                            onClick={() => handleDeletePostComment(item._id, commentId)}
                          >
                            Delete Comment
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <nav className="admin-pagination" aria-label="Admin records pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </button>
              <span>Page {page} of {pagination.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={page >= pagination.totalPages || isLoading}
              >
                Next
              </button>
            </nav>
          ) : null}

        </section>
      </section>

      <div className={`admin-floating-assistant ${adminAssistantOpen ? 'is-open' : ''}`}>
        {adminAssistantOpen ? (
          <section className="admin-assistant-panel" aria-label="Admin AI assistant">
            <div className="admin-assistant-header">
              <div>
                <h3>Admin AI</h3>
                <p>Fill company, job, Work News, candidate profile, and talent story drafts with action commands.</p>
              </div>
              <button type="button" onClick={() => setAdminAssistantOpen(false)} aria-label="Close admin AI">
                Close
              </button>
            </div>
            <div className="admin-assistant-messages">
              {adminAssistantMessages.map((chatMessage, index) => (
                <div className={`admin-assistant-message is-${chatMessage.role}`} key={`${chatMessage.role}-${index}`}>
                  <span>{chatMessage.text}</span>
                  {chatMessage.attachments?.length ? (
                    <div className="admin-assistant-message-images">
                      {chatMessage.attachments.map((attachment) => (
                        <img key={attachment.id} src={attachment.dataUrl} alt={attachment.name} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {adminAssistantBusy ? (
                <div className="admin-assistant-message is-assistant">Working on the forms...</div>
              ) : null}
            </div>
            <form className="admin-assistant-form" onSubmit={handleAdminAssistantSubmit}>
              <div className="admin-assistant-job-preferences">
                <label>
                  <span>Job location</span>
                  <input
                    value={jobDraftPreferences.location}
                    onChange={(event) => setJobDraftPreferences((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Any location, city, country, or remote"
                  />
                </label>
                <label>
                  <span>Job sectors or roles</span>
                  <input
                    value={jobDraftPreferences.sectors}
                    onChange={(event) => setJobDraftPreferences((current) => ({ ...current, sectors: event.target.value }))}
                    placeholder="All, or tech, health, barista..."
                    list="admin-job-sector-options"
                  />
                </label>
              </div>
              {adminAssistantImages.length ? (
                <div className="admin-assistant-pending-images" aria-label="Attached profile pictures">
                  {adminAssistantImages.map((image) => (
                    <div key={image.id} className="admin-assistant-pending-image">
                      <img src={image.dataUrl} alt={image.name} />
                      <button
                        type="button"
                        onClick={() => setAdminAssistantImages((current) => current.filter((item) => item.id !== image.id))}
                        aria-label={`Remove ${image.name}`}
                        title="Remove picture"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="admin-assistant-composer">
                <input
                  ref={adminAssistantImageInputRef}
                  type="file"
                  className="admin-assistant-image-input"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleAdminAssistantImageUpload}
                />
                <button
                  type="button"
                  className="admin-assistant-add-image"
                  onClick={() => adminAssistantImageInputRef.current?.click()}
                  disabled={adminAssistantBusy || adminAssistantImages.length >= ADMIN_ASSISTANT_MAX_IMAGES}
                  aria-label="Attach profile pictures"
                  title="Attach profile pictures"
                >
                  +
                </button>
                <textarea
                  value={adminAssistantInput}
                  onChange={(event) => setAdminAssistantInput(event.target.value)}
                  placeholder="Ask Admin AI to create candidate drafts, stories, jobs, or Work News"
                />
                <button type="submit" disabled={adminAssistantBusy || (!adminAssistantInput.trim() && !adminAssistantImages.length)}>
                  Send
                </button>
              </div>
            </form>
            <datalist id="admin-job-sector-options">
              <option value="All sectors" />
              <option value="Technology" />
              <option value="Health and Medical" />
              <option value="Business and Economics" />
              <option value="Supply Chain and Logistics" />
              <option value="Hospitality and Restaurant Work" />
              <option value="Barista and Coffee Making" />
              <option value="Pharmacy" />
              <option value="Computer Science" />
            </datalist>
          </section>
        ) : (
          <button type="button" className="admin-assistant-launcher" onClick={() => setAdminAssistantOpen(true)}>
            Admin AI
          </button>
        )}
      </div>
    </main>
  );
};

export default AdminPanel;
