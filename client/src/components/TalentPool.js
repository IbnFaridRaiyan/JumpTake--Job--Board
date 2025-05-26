import React, { useState, useEffect } from 'react';

const TalentPool = ({ onBack }) => {
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [filters, setFilters] = useState({
        skills: [],
        experience: ''
    });

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('employerToken');
            const response = await fetch('http://localhost:5000/api/job-seekers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch candidates');
            }

            const data = await response.json();
            setCandidates(data);
        } catch (err) {
            console.error('Error fetching candidates:', err);
            setError('Failed to load candidates. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewProfile = (candidate) => {
        setSelectedCandidate(candidate);
    };

    const handleCloseProfile = () => {
        setSelectedCandidate(null);
    };

    const filteredCandidates = candidates.filter(candidate => {
        const searchLower = searchTerm.toLowerCase();
        
       
        const matchesSearch = 
            (candidate.name && candidate.name.toLowerCase().includes(searchLower)) ||
            (candidate.email && candidate.email.toLowerCase().includes(searchLower)) ||
            (Array.isArray(candidate.skills) && candidate.skills.some(skill => 
                skill.toLowerCase().includes(searchLower)
            ));
            
        return matchesSearch;
    });

    const formatSkills = (skills) => {
        if (Array.isArray(skills)) {
            return skills.join(', ');
        } else if (typeof skills === 'string') {
            return skills;
        }
        return 'Not specified';
    };

    const formatDataForDisplay = (data) => {
        if (Array.isArray(data)) {
            return data.join(', ');
        } else if (typeof data === 'string') {
            return data;
        } else if (data === null || data === undefined) {
            return 'Not specified';
        }
        return JSON.stringify(data);
    };

    const renderList = (items, defaultMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{defaultMessage}</p>;
        }

        if (Array.isArray(items)) {
            return (
                <ul className="profile-list">
                    {items.map((item, index) => (
                        <li key={index}>
                            {typeof item === 'object' 
                                ? `${item.company || item.institution || ''} - ${item.role || item.degree || ''} (${item.dates || ''})`
                                : item}
                        </li>
                    ))}
                </ul>
            );
        }

        return <p>{items}</p>;
    };

    return (
        <div className="talent-pool-container">
            <div className="talent-pool-header">
                <h2>Talent Pool</h2>
                <button 
                    className="back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="talent-pool-controls">
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder="Search candidates by name, email or skills..." 
                        className="candidate-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading candidates...</p>
                </div>
            ) : selectedCandidate ? (
                <div className="candidate-profile">
                    <div className="candidate-profile-header">
                        <div className="candidate-profile-back">
                            <button onClick={handleCloseProfile} className="back-button">
                                Back to Candidates
                            </button>
                        </div>
                        <div className="candidate-header-info">
                            <div className="candidate-initial">
                                {selectedCandidate.name ? selectedCandidate.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="candidate-header-text">
                                <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                                <p>{selectedCandidate.email || 'Email not available'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="candidate-profile-body">
                        <div className="profile-section">
                            <h3>Skills</h3>
                            <div className="skills-container">
                                {Array.isArray(selectedCandidate.skills) && selectedCandidate.skills.length > 0 ? (
                                    selectedCandidate.skills.map((skill, index) => (
                                        <span key={index} className="skill-tag">{skill}</span>
                                    ))
                                ) : (
                                    <p>No skills listed</p>
                                )}
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Education</h3>
                            {renderList(selectedCandidate.education, "No education information available")}
                        </div>

                        <div className="profile-section">
                            <h3>Experience</h3>
                            {renderList(selectedCandidate.experience, "No experience information available")}
                        </div>

                        {selectedCandidate.achievements && (
                            <div className="profile-section">
                                <h3>Achievements</h3>
                                {renderList(selectedCandidate.achievements, "No achievements listed")}
                            </div>
                        )}

                        {(selectedCandidate.interests || selectedCandidate.hobbies) && (
                            <div className="profile-section">
                                <h3>Interests & Hobbies</h3>
                                {selectedCandidate.interests && (
                                    <div className="profile-subsection">
                                        <h4>Interests</h4>
                                        <p>{formatDataForDisplay(selectedCandidate.interests)}</p>
                                    </div>
                                )}
                                {selectedCandidate.hobbies && (
                                    <div className="profile-subsection">
                                        <h4>Hobbies</h4>
                                        <p>{formatDataForDisplay(selectedCandidate.hobbies)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {filteredCandidates.length === 0 ? (
                        <div className="no-candidates">
                            <div className="empty-state-image">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <h3>No candidates found</h3>
                            <p>{searchTerm ? 'Try adjusting your search criteria' : 'No candidates are available in the talent pool yet'}</p>
                        </div>
                    ) : (
                        <div className="candidates-grid">
                            {filteredCandidates.map(candidate => (
                                <div key={candidate._id} className="candidate-card" onClick={() => handleViewProfile(candidate)}>
                                    <div className="candidate-avatar">
                                        {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <div className="candidate-info">
                                        <h3 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h3>
                                        <p className="candidate-email">{candidate.email || 'Email not available'}</p>
                                        
                                        <div className="candidate-skills">
                                            {Array.isArray(candidate.skills) && candidate.skills.slice(0, 3).map((skill, index) => (
                                                <span key={index} className="candidate-skill-tag">{skill}</span>
                                            ))}
                                            {Array.isArray(candidate.skills) && candidate.skills.length > 3 && (
                                                <span className="candidate-skill-tag more">+{candidate.skills.length - 3}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="candidate-view-profile">View Profile</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TalentPool;