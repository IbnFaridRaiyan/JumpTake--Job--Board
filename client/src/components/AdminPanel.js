import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from './ProfileAvatar';
import { createSquareProfileImage } from '../utils/profileImages';
import confirmAction from '../utils/confirmAction';

const API_BASE = process.env.REACT_APP_API_URL || '';
const ADMIN_KEY_STORAGE = 'jumptakeAdminKey';

const emptyCompanyForm = {
  name: '',
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
  salary: '',
  applicationLink: '',
  jobType: 'Full-time',
  description: '',
  requirements: '',
  responsibilities: '',
  skills: '',
  source: ''
};

const emptyWorkNewsDraft = {
  companyName: '',
  companyLogoUrl: '',
  body: '',
  mediaUrl: '',
  mediaType: 'image',
  source: '',
  sourceTitle: ''
};

const emptyWorkNewsPostForm = {
  companyName: '',
  companyLogoUrl: '',
  body: '',
  mediaUrl: '',
  mediaType: 'image',
  source: '',
  sourceTitle: ''
};

const getLogoFallbackFromSource = (source = '') => {
  try {
    const url = new URL(source);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`;
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
  companyLogoUrl: draft.companyLogoUrl || getLogoFallbackFromSource(draft.source),
  mediaType: draft.mediaType === 'video' ? 'video' : 'image',
  id: draft.id || `work-news-draft-${Date.now()}-${index}`
});

const readAdminFileAsDataUrl = (file) => new Promise((resolve, reject) => {
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
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const companyLogoInputRef = useRef(null);
  const [isProcessingCompanyLogo, setIsProcessingCompanyLogo] = useState(false);
  const [companyForm, setCompanyForm] = useState({ ...emptyCompanyForm });
  const [adminAssistantOpen, setAdminAssistantOpen] = useState(false);
  const [adminAssistantInput, setAdminAssistantInput] = useState('');
  const [adminAssistantBusy, setAdminAssistantBusy] = useState(false);
  const [adminAssistantMessages, setAdminAssistantMessages] = useState([
    {
      role: 'assistant',
      text: 'Tell me what company, job, or Work News drafts to create and I will fill the admin forms.'
    }
  ]);
  const [jobForm, setJobForm] = useState({ ...emptyJobForm });
  const [adminJobDrafts, setAdminJobDrafts] = useState([]);
  const [adminWorkNewsDrafts, setAdminWorkNewsDrafts] = useState([]);
  const [workNewsPostForm, setWorkNewsPostForm] = useState({ ...emptyWorkNewsPostForm });

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

  const loadCollection = useCallback(async () => {
    if (!selectedCollection || !isAuthed) {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '5000'
      });

      if (search.trim()) {
        params.set('q', search.trim());
      }

      const data = await adminFetch(`/collections/${selectedCollection}?${params.toString()}`);
      setItems(data.items || []);
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
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmAction({
      title: 'Delete record?',
      message: 'Delete this record and its related data permanently?'
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
      setMessage('Record deleted.');
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
      await Promise.all([loadSummary(), loadCollection()]);
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
          companyName: workNewsPostForm.companyName,
          authorName: workNewsPostForm.companyName,
          companyLogoUrl: workNewsPostForm.companyLogoUrl,
          authorAvatar: workNewsPostForm.companyLogoUrl,
          body: workNewsPostForm.body,
          mediaUrl: workNewsPostForm.mediaUrl,
          mediaType: workNewsPostForm.mediaType,
          source: workNewsPostForm.source,
          sourceTitle: workNewsPostForm.sourceTitle
        })
      });
      setWorkNewsPostForm({ ...emptyWorkNewsPostForm });
      setSelectedCollection('feedPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage('Work News post created.');
    } catch (error) {
      setMessage(error.message);
    }
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
        ? `Company created. Company ID: ${createdCompanyId}`
        : 'Company created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAdminAssistantSubmit = async (event) => {
    event.preventDefault();
    const prompt = adminAssistantInput.trim();

    if (!prompt || adminAssistantBusy) {
      return;
    }

    setAdminAssistantInput('');
    setAdminAssistantBusy(true);
    setAdminAssistantMessages((current) => [...current, { role: 'user', text: prompt }]);

    try {
      const data = await adminFetch('/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          companyForm,
          jobForm
        })
      });

      if (data.companyForm && Object.keys(data.companyForm).length) {
        setCompanyForm((current) => mergeFilledFields(current, data.companyForm));
      }

      if (data.jobForm && Object.keys(data.jobForm).length) {
        setJobForm((current) => mergeFilledFields(current, data.jobForm));
      }

      if (Array.isArray(data.jobDrafts) && data.jobDrafts.length) {
        setAdminJobDrafts(data.jobDrafts.map((draft, index) => normalizeJobDraft(draft, index)));
      }

      if (Array.isArray(data.workNewsDrafts) && data.workNewsDrafts.length) {
        setAdminWorkNewsDrafts(data.workNewsDrafts.map((draft, index) => normalizeWorkNewsDraft(draft, index)));
      }

      setAdminAssistantMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: data.reply || 'I filled the form fields I could infer. Review them before creating the record.'
        }
      ]);
    } catch (error) {
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
      draft.id === draftId ? { ...draft, [field]: value } : draft
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

  const updateAdminWorkNewsDraft = (draftId, field, value) => {
    setAdminWorkNewsDrafts((current) => current.map((draft) => (
      draft.id === draftId ? {
        ...draft,
        [field]: value,
        ...(field === 'source' && !draft.companyLogoUrl ? { companyLogoUrl: getLogoFallbackFromSource(value) } : {})
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
      await Promise.all([loadSummary(), loadCollection()]);
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
          companyName: draft.companyName,
          authorName: draft.companyName,
          companyLogoUrl: draft.companyLogoUrl,
          authorAvatar: draft.companyLogoUrl,
          body: draft.body,
          mediaUrl: draft.mediaUrl,
          mediaType: draft.mediaType,
          source: draft.source,
          sourceTitle: draft.sourceTitle
        })
      });
      removeAdminWorkNewsDraft(draft.id, true);
      setSelectedCollection('feedPosts');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection()]);
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
      await loadCollection();
      setMessage('Comment deleted.');
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
                loadCollection();
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

          <form className="admin-create-company" onSubmit={handleCreateCompany}>
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

          <form className="admin-create-work-news" onSubmit={handleCreateWorkNewsPost}>
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
                    value={workNewsPostForm.sourceTitle}
                    onChange={(event) => setWorkNewsPostForm((current) => ({ ...current, sourceTitle: event.target.value }))}
                    placeholder="Source title"
                  />
                  <input
                    type="url"
                    value={workNewsPostForm.source}
                    onChange={(event) => {
                      const source = event.target.value;
                      setWorkNewsPostForm((current) => ({
                        ...current,
                        source,
                        companyLogoUrl: current.companyLogoUrl || getLogoFallbackFromSource(source)
                      }));
                    }}
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

          <form className="admin-create-job" onSubmit={handleCreateJob}>
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

          {adminJobDrafts.length ? (
            <section className="admin-ai-job-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>AI Job Drafts</h3>
                  <p>Review each web-sourced job before posting it to JumpTake.</p>
                </div>
                <button type="button" className="admin-ghost-button" onClick={() => setAdminJobDrafts([])}>
                  Clear Drafts
                </button>
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
                        <button type="button" onClick={() => postAdminJobDraft(draft)}>
                          Post Job
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminJobDraft(draft.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.company} onChange={(event) => updateAdminJobDraft(draft.id, 'company', event.target.value)} placeholder="Company ID" />
                      <input value={draft.companyName} onChange={(event) => updateAdminJobDraft(draft.id, 'companyName', event.target.value)} placeholder="Company name" />
                      <input value={draft.title} onChange={(event) => updateAdminJobDraft(draft.id, 'title', event.target.value)} placeholder="Job title" />
                      <input value={draft.location} onChange={(event) => updateAdminJobDraft(draft.id, 'location', event.target.value)} placeholder="Location" />
                      <input value={draft.salary} onChange={(event) => updateAdminJobDraft(draft.id, 'salary', event.target.value)} placeholder="Salary" />
                      <input type="url" value={draft.applicationLink} onChange={(event) => updateAdminJobDraft(draft.id, 'applicationLink', event.target.value)} placeholder="Application link" />
                      <select value={draft.jobType} onChange={(event) => updateAdminJobDraft(draft.id, 'jobType', event.target.value)}>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Internship</option>
                        <option>Remote</option>
                      </select>
                      <input value={draft.skills} onChange={(event) => updateAdminJobDraft(draft.id, 'skills', event.target.value)} placeholder="Skills, comma separated" />
                      <input type="url" value={draft.source} onChange={(event) => updateAdminJobDraft(draft.id, 'source', event.target.value)} placeholder="Source URL" />
                    </div>
                    <textarea value={draft.description} onChange={(event) => updateAdminJobDraft(draft.id, 'description', event.target.value)} placeholder="Description" />
                    <textarea value={draft.requirements} onChange={(event) => updateAdminJobDraft(draft.id, 'requirements', event.target.value)} placeholder="Requirements, one per line" />
                    <textarea value={draft.responsibilities} onChange={(event) => updateAdminJobDraft(draft.id, 'responsibilities', event.target.value)} placeholder="Responsibilities, one per line" />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {adminWorkNewsDrafts.length ? (
            <section className="admin-ai-job-drafts admin-ai-work-news-drafts">
              <div className="admin-form-heading-row">
                <div>
                  <h3>AI Work News Drafts</h3>
                  <p>Review each live-web company update before posting it to Work News.</p>
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
                        <button type="button" onClick={() => postAdminWorkNewsDraft(draft)}>
                          Post Work News
                        </button>
                        <button type="button" className="admin-danger-button" onClick={() => removeAdminWorkNewsDraft(draft.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <input value={draft.companyName} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyName', event.target.value)} placeholder="Company name" />
                      <input type="url" value={draft.companyLogoUrl} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'companyLogoUrl', event.target.value)} placeholder="Company logo/profile picture URL" />
                      <input type="url" value={draft.mediaUrl} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'mediaUrl', event.target.value)} placeholder="Post image or video URL" />
                      <select value={draft.mediaType} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'mediaType', event.target.value)}>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <input value={draft.sourceTitle} onChange={(event) => updateAdminWorkNewsDraft(draft.id, 'sourceTitle', event.target.value)} placeholder="Source title" />
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

          <div className="admin-records">
            {isLoading ? <p className="admin-empty">Loading records...</p> : null}
            {!isLoading && !items.length ? <p className="admin-empty">No records found.</p> : null}
            {items.map((item) => (
              <article className="admin-record-card" key={item._id}>
                <div className="admin-record-card-header">
                  <div>
                    <h3>{item.title || item.name || item.email || item.username || item._id}</h3>
                    <p>{item._id}</p>
                  </div>
                  <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </button>
                  {selectedCollection === 'jobs' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateJobApplicationLink(item._id, item.applicationLink)}
                    >
                      Set Apply Link
                    </button>
                  ) : null}
                </div>
                <dl>
                  {Object.entries(item)
                    .filter(([key]) => key !== '_id')
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <React.Fragment key={key}>
                        <dt>{key}</dt>
                        <dd>{formatValue(value)}</dd>
                      </React.Fragment>
                    ))}
                </dl>
                {selectedCollection === 'feedPosts' && Array.isArray(item.comments) && item.comments.length ? (
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

        </section>
      </section>

      <div className={`admin-floating-assistant ${adminAssistantOpen ? 'is-open' : ''}`}>
        {adminAssistantOpen ? (
          <section className="admin-assistant-panel" aria-label="Admin AI assistant">
            <div className="admin-assistant-header">
              <div>
                <h3>Admin AI</h3>
                <p>Fill company, job, and Work News drafts with action commands.</p>
              </div>
              <button type="button" onClick={() => setAdminAssistantOpen(false)} aria-label="Close admin AI">
                Close
              </button>
            </div>
            <div className="admin-assistant-messages">
              {adminAssistantMessages.map((chatMessage, index) => (
                <div className={`admin-assistant-message is-${chatMessage.role}`} key={`${chatMessage.role}-${index}`}>
                  {chatMessage.text}
                </div>
              ))}
              {adminAssistantBusy ? (
                <div className="admin-assistant-message is-assistant">Working on the forms...</div>
              ) : null}
            </div>
            <form className="admin-assistant-form" onSubmit={handleAdminAssistantSubmit}>
              <textarea
                value={adminAssistantInput}
                onChange={(event) => setAdminAssistantInput(event.target.value)}
                placeholder="Example: make 10 Work News drafts from live web company updates"
              />
              <button type="submit" disabled={adminAssistantBusy || !adminAssistantInput.trim()}>
                Send
              </button>
            </form>
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
