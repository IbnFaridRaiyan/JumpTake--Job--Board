import React from 'react';
import { createPortal } from 'react-dom';
import ProfileAvatar from './ProfileAvatar';

const formatFounded = (value) => {
    if (!value) return 'Not specified';
    return /^\d{4}$/.test(String(value)) ? `Founded in ${value}` : String(value);
};

const MessageCompanyProfileModal = ({ company, onClose }) => {
    if (!company) return null;

    const modal = (
        <div className="job-preview-overlay message-company-profile-overlay" onClick={onClose}>
            <article className="job-preview-modal message-company-profile-modal" onClick={(event) => event.stopPropagation()}>
                <header className="job-preview-header">
                    <button type="button" className="preview-close-btn" onClick={onClose} aria-label="Close company profile">×</button>
                    <ProfileAvatar
                        imageSrc={company.logo || ''}
                        name={company.name || 'Company'}
                        className="preview-company-logo"
                        imageClassName="profile-avatar-image"
                    />
                    <h2>{company.name || 'Company'}</h2>
                    <div className="preview-company-info">
                        <span className="preview-company-name">{company.industry || 'Industry not specified'}</span>
                    </div>
                </header>
                <div className="job-preview-content">
                    <section className="preview-section">
                        <h3>Company Details</h3>
                        <p><strong>Founded:</strong> {formatFounded(company.founded)}</p>
                        <p><strong>Headquarters:</strong> {company.headquarters || 'Not specified'}</p>
                        <p>
                            <strong>Website:</strong>{' '}
                            {company.website ? (
                                <a
                                    href={String(company.website).startsWith('http') ? company.website : `https://${company.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="company-website-link"
                                >
                                    {company.website}
                                </a>
                            ) : 'Not specified'}
                        </p>
                    </section>
                    <section className="preview-section">
                        <h3>About the Company</h3>
                        <p>{company.description || 'No company description available.'}</p>
                    </section>
                </div>
            </article>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};

export default MessageCompanyProfileModal;
