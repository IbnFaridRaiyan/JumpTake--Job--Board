import React, { useEffect, useState } from 'react';
import ContactCandidate from './ContactCandidate';

const BookmarkedTalents = ({ companyId, onBack, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
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
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/talent-bookmarks/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked talents');
            }

            const data = await response.json();
            setBookmarks(Array.isArray(data) ? data.filter((bookmark) => bookmark.candidate) : []);
            setError('');
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked talents:', bookmarkError);
            setError('Failed to load bookmarked talents. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (candidateId) => {
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/talent-bookmarks/company/${companyId}/candidate/${candidateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove bookmarked talent');
            }

            setBookmarks((prevState) => prevState.filter((bookmark) => String(bookmark.candidate?._id) !== String(candidateId)));
            setMessage('Bookmarked talent removed successfully.');
            setTimeout(() => setMessage(''), 2500);
        } catch (removeError) {
            console.error('Error removing bookmarked talent:', removeError);
            setMessage(`Error: ${removeError.message}`);
        }
    };

    const renderList = (items, emptyMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{emptyMessage}</p>;
        }

        return (
            <ul className="profile-list">
                {items.map((item, index) => <li key={index}>{typeof item === 'object' ? Object.values(item).filter(Boolean).join(' - ') : item}</li>)}
            </ul>
        );
    };

    if (selectedCandidate) {
        return (
            <div className="candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedCandidate(null)} className="back-button">Back to Bookmarked Talents</button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">{selectedCandidate.name ? selectedCandidate.name.charAt(0).toUpperCase() : 'C'}</div>
                        <div className="candidate-header-text">
                            <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                            <p>{selectedCandidate.email || 'Email not available'}</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    <ContactCandidate companyId={companyId} candidate={selectedCandidate} />

                    <div className="profile-section"><h3>Skills</h3><div className="skills-container">{Array.isArray(selectedCandidate.skills) && selectedCandidate.skills.length > 0 ? selectedCandidate.skills.map((skill, index) => <span key={index} className="skill-tag">{skill}</span>) : <p>No skills listed</p>}</div></div>
                    <div className="profile-section"><h3>Education</h3>{renderList(selectedCandidate.education, 'No education information available')}</div>
                    <div className="profile-section"><h3>Experience</h3>{renderList(selectedCandidate.experience, 'No experience information available')}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedCandidate(null)}>Back</button></div>
                </div>
            </div>
        );
    }

    return (
        <div className="talent-pool-container">
            <div className="talent-pool-header">
                <h2>Bookmarked Talents</h2>
            </div>

            {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container"><div className="loading-spinner"></div><p>Loading bookmarked talents...</p></div>
            ) : bookmarks.length === 0 ? (
                <div className="no-candidates"><h3>No bookmarked talents yet</h3><p>Star candidate cards in Talent Pool to keep them here.</p></div>
            ) : (
                <div className="candidates-grid">
                    {bookmarks.map((bookmark) => {
                        const candidate = bookmark.candidate;
                        return (
                            <div key={bookmark._id} className="candidate-card" onClick={() => setSelectedCandidate(candidate)}>
                                <button type="button" className="bookmark-star-button active talent-bookmark-button" onClick={(event) => { event.stopPropagation(); removeBookmark(candidate._id); }}>★</button>
                                <div className="candidate-avatar">{candidate.name ? candidate.name.charAt(0).toUpperCase() : 'C'}</div>
                                <div className="candidate-info">
                                    <h3 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h3>
                                    <p className="candidate-email">{candidate.email || 'Email not available'}</p>
                                </div>
                                <div className="candidate-view-profile">View Profile</div>
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

export default BookmarkedTalents;
