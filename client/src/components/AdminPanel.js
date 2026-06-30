import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';
const ADMIN_KEY_STORAGE = 'jumptakeAdminKey';

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
  const [jobForm, setJobForm] = useState({
    company: '',
    title: '',
    location: '',
    salary: '',
    applicationLink: '',
    jobType: 'Full-time',
    description: '',
    requirements: '',
    responsibilities: '',
    skills: ''
  });

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
        limit: '20'
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
    const confirmed = window.confirm('Delete this record and related data where supported? This cannot be undone.');

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
      setJobForm({
        company: '',
        title: '',
        location: '',
        salary: '',
        applicationLink: '',
        jobType: 'Full-time',
        description: '',
        requirements: '',
        responsibilities: '',
        skills: ''
      });
      setSelectedCollection('jobs');
      setPage(1);
      await Promise.all([loadSummary(), loadCollection()]);
      setMessage('Job post created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDeletePostComment = async (postId, commentId) => {
    const confirmed = window.confirm('Delete this comment from the post? This cannot be undone.');

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

          <div className="admin-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </section>
    </main>
  );
};

export default AdminPanel;
