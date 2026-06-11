import React, { useEffect, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';

const BookmarkedApplications = ({ companyId, onBack, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedView, setSelectedView] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBookmarks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/application-bookmarks/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked applications');
            }

            const data = await response.json();
            setBookmarks(Array.isArray(data) ? data.filter((bookmark) => bookmark.application) : []);
            setError('');
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked applications:', bookmarkError);
            setError('Failed to load bookmarked applications. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getCandidateProfile = (application) => ({
        ...(application?.user?.jobSeekerId || {}),
        ...(application?.profileSnapshot || {}),
        email: application?.profileSnapshot?.email || application?.user?.jobSeekerId?.email || application?.user?.email || ''
    });

    const removeBookmark = async (applicationId) => {
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/application-bookmarks/company/${companyId}/application/${applicationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove bookmarked application');
            }

            setBookmarks((prevState) => prevState.filter((bookmark) => String(bookmark.application?._id) !== String(applicationId)));
            setMessage('Bookmarked application removed successfully.');
            setTimeout(() => setMessage(''), 2500);
        } catch (removeError) {
            console.error('Error removing bookmarked application:', removeError);
            setMessage(`Error: ${removeError.message}`);
        }
    };

    const renderCoverLetter = (html) => {
        if (!html) {
            return <p className="empty-info">No cover letter included.</p>;
        }

        return <div className="cover-letter-preview" dangerouslySetInnerHTML={{ __html: html }} />;
    };

    if (selectedApplication && selectedView === 'profile') {
        const candidate = getCandidateProfile(selectedApplication);

        return (
            <div className="candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedApplication(null)} className="back-button">Back to Bookmarked Applications</button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">{candidate?.name ? candidate.name.charAt(0).toUpperCase() : 'C'}</div>
                        <div className="candidate-header-text">
                            <h2>{candidate?.name || 'Unnamed Candidate'}</h2>
                            <p>{candidate?.email || 'Email not available'}</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    <div className="profile-section"><h3>Submitted Cover Letter</h3>{renderCoverLetter(selectedApplication.coverLetterHtml)}</div>
                    <div className="profile-section"><h3>Message</h3><p>{selectedApplication.message || 'No message included.'}</p></div>
                    <div className="profile-section"><h3>Skills</h3><div className="skills-container">{Array.isArray(candidate.skills) && candidate.skills.length > 0 ? candidate.skills.map((skill, index) => <span key={index} className="skill-tag">{skill}</span>) : <p>No skills listed</p>}</div></div>
                    <div className="profile-section"><h3>Education</h3>{Array.isArray(candidate.education) && candidate.education.length > 0 ? <ul className="profile-list">{candidate.education.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>No education information available</p>}</div>
                    <div className="profile-section"><h3>Experience</h3>{Array.isArray(candidate.experience) && candidate.experience.length > 0 ? <ul className="profile-list">{candidate.experience.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>No experience information available</p>}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedApplication(null)}>Back</button></div>
                </div>
            </div>
        );
    }

    if (selectedApplication && selectedView === 'application') {
        const candidate = getCandidateProfile(selectedApplication);

        return (
            <div className="application-detail-view">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedApplication(null)} className="back-button">Back to Bookmarked Applications</button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">{candidate?.name ? candidate.name.charAt(0).toUpperCase() : 'A'}</div>
                        <div className="candidate-header-text">
                            <h2>{selectedApplication.job?.title || 'Application Details'}</h2>
                            <p>{candidate?.name || selectedApplication.user?.email || 'Candidate not available'}</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    <div className="profile-section"><h3>Status</h3><span className={`status-badge ${(selectedApplication.status || 'Submitted').toLowerCase().replace(/\s+/g, '-')}`}>{selectedApplication.status || 'Submitted'}</span></div>
                    <div className="profile-section">
                        <h3>Application Details</h3>
                        <p><strong>Candidate:</strong> {candidate?.name || 'Unnamed Candidate'}</p>
                        <p><strong>Email:</strong> {candidate?.email || selectedApplication.user?.email || 'Email not available'}</p>
                        <p><strong>Company:</strong> {selectedApplication.job?.company?.name || 'Not specified'}</p>
                        <p><strong>Location:</strong> {selectedApplication.job?.location || 'Not specified'}</p>
                        <p><strong>Job Type:</strong> {selectedApplication.job?.jobType || 'Not specified'}</p>
                        <p><strong>Applied On:</strong> {new Date(selectedApplication.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="profile-section"><h3>Candidate Message</h3><div className="application-message-preview"><p>{selectedApplication.message || 'No message included.'}</p></div></div>
                    <div className="profile-section"><h3>Submitted Cover Letter</h3>{renderCoverLetter(selectedApplication.coverLetterHtml)}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedApplication(null)}>Back</button></div>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-applications-container">
            <div className="manage-jobs-header">
                <h2>Bookmarked Applications</h2>
            </div>

            {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="job-list-loading"><div className="loading-spinner"></div><p>Loading bookmarked applications...</p></div>
            ) : bookmarks.length === 0 ? (
                <div className="no-jobs-message"><h3>No bookmarked applications yet</h3><p>Star candidate applications in Manage Applications to keep them here.</p></div>
            ) : (
                <div className="applications-list">
                    {bookmarks.map((bookmark) => {
                        const application = bookmark.application;
                        const candidate = getCandidateProfile(application);
                        return (
                            <div className="application-card" key={bookmark._id}>
                                <div className="application-card-header">
                                    <div>
                                        <h3>{candidate?.name || 'Unnamed Candidate'}</h3>
                                        <p>{candidate?.email || application?.user?.email || 'Email not available'}</p>
                                    </div>
                                    <span className="status-badge accepted">Bookmarked</span>
                                </div>
                                <div className="application-job-summary">
                                    <strong>{application?.job?.title || 'Unknown job'}</strong>
                                    <span>{application?.job?.location || 'Location not specified'}</span>
                                    <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="application-card-actions">
                                    <AnimatedDeleteButton
                                        onClick={() => removeBookmark(application?._id)}
                                        title="Remove bookmark"
                                    />
                                    <button className="view-profile-btn secondary-action" onClick={() => { setSelectedApplication(application); setSelectedView('application'); }}>Open Application</button>
                                    <button className="view-profile-btn" onClick={() => { setSelectedApplication(application); setSelectedView('profile'); }}>View Candidate Profile</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onBack}>Back to Dashboard</button>
                <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
            </div>
        </div>
    );
};

export default BookmarkedApplications;
