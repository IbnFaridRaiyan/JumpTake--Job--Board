import React, { useEffect, useState } from 'react';

const JOB_INTEREST_OPTIONS = [
    'Software Engineering',
    'Frontend Development',
    'Backend Development',
    'Data Analysis',
    'Artificial Intelligence',
    'Cybersecurity',
    'Product Management',
    'Project Management',
    'Marketing',
    'Sales',
    'Finance',
    'Human Resources',
    'Healthcare',
    'Education',
    'Customer Support',
    'Design',
    'Operations',
    'Business Analysis',
    'Cloud Engineering',
    'Quality Assurance'
];

const InterestedJobSuggestion = ({ user, onInterestsSaved }) => {
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setSelectedInterests(Array.isArray(user?.jobInterests) ? user.jobInterests : []);
    }, [user]);

    const toggleInterest = (interest) => {
        setSelectedInterests((prevInterests) => (
            prevInterests.includes(interest)
                ? prevInterests.filter((item) => item !== interest)
                : [...prevInterests, interest]
        ));
        setError('');
        setMessage('');
    };

    const saveInterests = async () => {
        if (selectedInterests.length < 4) {
            setError('Please select at least 4 job types.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/users/${user.id}/job-interests`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobInterests: selectedInterests
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save job interests');
            }

            const nextUser = {
                ...user,
                jobInterests: data.jobInterests || selectedInterests
            };

            onInterestsSaved(nextUser);
            setMessage('Job preferences saved. Recommended jobs will use these interests.');
        } catch (saveError) {
            console.error('Error saving job interests:', saveError);
            setError(saveError.message || 'Failed to save job interests.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="interested-job-suggestion-section">
            <div className="section-header">
                <h2>Job Preferences</h2>
            </div>

            <div className="settings-card interested-job-card">
                <h3>Which jobs are you interested in?</h3>
                <p>Select at least 4 job types. These preferences help tune your recommended jobs.</p>

                {message && <div className="notification-message success">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="job-interest-grid">
                    {JOB_INTEREST_OPTIONS.map((interest) => (
                        <button
                            key={interest}
                            type="button"
                            className={selectedInterests.includes(interest) ? 'selected' : ''}
                            onClick={() => toggleInterest(interest)}
                        >
                            {interest}
                        </button>
                    ))}
                </div>

                <div className="assessment-footer-actions">
                    <button className="settings-button primary" onClick={saveInterests} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Interests'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default InterestedJobSuggestion;
