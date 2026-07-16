import React, { useEffect, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';

const DraftApplications = ({ userId, switchSection, onFooterBack, embedded = false }) => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDrafts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const fetchDrafts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/draft-applications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch draft applications');
            }

            const data = await response.json();
            setDrafts(Array.isArray(data) ? data : []);
            setError('');
        } catch (draftError) {
            console.error('Error fetching draft applications:', draftError);
            setError('Failed to load draft applications. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleContinueDraft = (draft) => {
        localStorage.setItem('jumptakeActiveDraftId', draft._id);
        localStorage.setItem('jumptakeActiveJobReturnSection', 'draft-applications');
        if (switchSection) {
            switchSection('job-feed');
        }
    };

    const handleDeleteDraft = async (draftId) => {
        if (!window.confirm('Delete this saved draft?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/draft-applications/${draftId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete draft application');
            }

            setDrafts((prevState) => prevState.filter((draft) => draft._id !== draftId));
            setMessage('Draft application deleted successfully.');
            setTimeout(() => setMessage(''), 2500);
        } catch (deleteError) {
            console.error('Error deleting draft application:', deleteError);
            setMessage(`Error: ${deleteError.message}`);
        }
    };

    return (
        <div className="applications-container">
            {!embedded && (
                <div className="section-header">
                    <h2>Draft Applications</h2>
                    <div className="section-actions">
                        <button className="refresh-button" onClick={fetchDrafts}>Refresh</button>
                    </div>
                </div>
            )}

            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading draft applications...</p>
                </div>
            ) : drafts.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No saved drafts yet</h3>
                    <p>Save a job application draft from the apply workspace and it will appear here.</p>
                </div>
            ) : (
                <div className="applications-list">
                    {drafts.map((draft) => (
                        <div className="application-card" key={draft._id}>
                            <div className="application-card-header">
                                <div>
                                    <h3>{draft.job?.title || 'Draft Job'}</h3>
                                    <p>{draft.job?.company?.name || 'Company unavailable'}</p>
                                </div>
                                <span className="status-badge submitted">Draft</span>
                            </div>
                            <div className="application-job-summary">
                                <strong>{draft.job?.location || 'Location not specified'}</strong>
                                <span>{draft.job?.jobType || 'Type not specified'}</span>
                                <span>Saved {new Date(draft.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="application-card-actions">
                                <AnimatedDeleteButton
                                    onClick={() => handleDeleteDraft(draft._id)}
                                    title="Delete draft"
                                />
                                <button className="view-profile-btn sky-apply-button" onClick={() => handleContinueDraft(draft)}>
                                    Continue Draft
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onFooterBack || (() => switchSection && switchSection('job-feed'))}>
                    Back
                </button>
            </div>
        </div>
    );
};

export default DraftApplications;
