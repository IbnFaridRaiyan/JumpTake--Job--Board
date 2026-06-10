import React, { useEffect, useState } from 'react';

const CompanyProfile = ({ company, jobStats, onBack, onCompanyUpdated, onFooterBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        founded: '',
        headquarters: '',
        website: '',
        description: ''
    });

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || '',
                industry: company.industry || '',
                founded: company.founded || '',
                headquarters: company.headquarters || '',
                website: company.website || '',
                description: company.description || ''
            });
        }
    }, [company]);

    if (!company) {
        return (
            <div className="company-profile-container">
                <div className="company-profile-header">
                    <h2>Company Profile</h2>
                    <button
                        className="back-button"
                        onClick={onBack}
                    >
                        Back to Dashboard
                    </button>
                </div>
                <div className="loading-message">
                    Loading company profile...
                </div>
                <div className="section-footer-nav">
                    <button
                        className="back-button"
                        onClick={onFooterBack || onBack}
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const formatFoundedDate = (founded) => {
        if (!founded) return 'Not specified';

        if (/^\d{4}$/.test(founded)) {
            return `Founded in ${founded}`;
        }

        return founded;
    };

    const normalizeWebsite = (website) => {
        if (!website) {
            return '';
        }

        return website.startsWith('http') ? website : `https://${website}`;
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCancelEdit = () => {
        setFormData({
            name: company.name || '',
            industry: company.industry || '',
            founded: company.founded || '',
            headquarters: company.headquarters || '',
            website: company.website || '',
            description: company.description || ''
        });
        setError('');
        setSuccessMessage('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('Company name is required.');
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${company._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(formData)
            });
            const responseText = await response.text();
            let data = null;

            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch (parseError) {
                if (!response.ok) {
                    throw new Error('Company update endpoint is unavailable right now. Please refresh the backend and try again.');
                }

                throw new Error('Received an unexpected response while saving company details.');
            }

            if (!response.ok) {
                throw new Error(data?.error || 'Failed to update company profile');
            }

            if (onCompanyUpdated) {
                onCompanyUpdated(data);
            }

            setSuccessMessage('Company details updated successfully.');
            setIsEditing(false);
        } catch (saveError) {
            console.error('Error updating company profile:', saveError);
            setError(saveError.message || 'Failed to update company profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const currentCompany = isEditing ? formData : company;
    const stats = jobStats || {
        activeJobs: 0,
        totalJobs: 0,
        applicationsReceived: 0
    };

    return (
        <div className="company-profile-container">
            <div className="company-profile-header">
                <h2>Company Profile</h2>
                <button
                    className="back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>

            <div className="company-profile-content">
                <div className="company-profile-card">
                    <div className="company-header">
                        <div className="company-avatar">
                            {(currentCompany.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="company-title">
                            <h3>{currentCompany.name || 'Company name'}</h3>
                            <span className="company-industry">
                                {currentCompany.industry || 'Industry not specified'}
                            </span>
                        </div>
                    </div>

                    <div className="company-profile-actions">
                        {!isEditing ? (
                            <button
                                className="edit-profile-button"
                                onClick={() => {
                                    setIsEditing(true);
                                    setError('');
                                    setSuccessMessage('');
                                }}
                            >
                                Edit Company Details
                            </button>
                        ) : (
                            <div className="company-edit-actions">
                                <button
                                    className="save-profile-button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Company Details'}
                                </button>
                                <button
                                    className="cancel-edit-button"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {error && <div className="error-message company-profile-message">{error}</div>}
                    {successMessage && <div className="success-message company-profile-message">{successMessage}</div>}

                    {isEditing ? (
                        <div className="company-details company-edit-grid">
                            <div className="form-group">
                                <label htmlFor="company-name">Company Name</label>
                                <input
                                    id="company-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="company-industry">Industry</label>
                                <input
                                    id="company-industry"
                                    type="text"
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="company-founded">Founded</label>
                                <input
                                    id="company-founded"
                                    type="text"
                                    name="founded"
                                    value={formData.founded}
                                    onChange={handleChange}
                                    placeholder="e.g. 2018"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="company-headquarters">Headquarters</label>
                                <input
                                    id="company-headquarters"
                                    type="text"
                                    name="headquarters"
                                    value={formData.headquarters}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="company-website">Website</label>
                                <input
                                    id="company-website"
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="example.com"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="company-description">About</label>
                                <textarea
                                    id="company-description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="6"
                                    className="company-description-field"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="company-details">
                            <div className="detail-item">
                                <span className="detail-label founded">Founded</span>
                                <span className="detail-value">{formatFoundedDate(company.founded)}</span>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label headquarters">Headquarters</span>
                                <span className="detail-value">{company.headquarters || 'Not specified'}</span>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label website">Website</span>
                                <span className="detail-value">
                                    {company.website ? (
                                        <a href={normalizeWebsite(company.website)} target="_blank" rel="noopener noreferrer">
                                            {company.website}
                                        </a>
                                    ) : 'Not specified'}
                                </span>
                            </div>

                            <div className="detail-item full-width">
                                <span className="detail-label about">About</span>
                                <div className="company-description">
                                    {company.description || 'No company description available.'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="company-stats">
                        <div className="stat-box">
                            <div className="stat-number">{stats.activeJobs}</div>
                            <div className="stat-label">Active Jobs</div>
                        </div>

                        <div className="stat-box">
                            <div className="stat-number">{stats.totalJobs}</div>
                            <div className="stat-label">Total Job Posts</div>
                        </div>

                        <div className="stat-box">
                            <div className="stat-number">{stats.applicationsReceived}</div>
                            <div className="stat-label">Applications</div>
                        </div>
                    </div>

                    <div className="section-footer-nav">
                        <button
                            className="back-button"
                            onClick={onFooterBack || onBack}
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfile;
