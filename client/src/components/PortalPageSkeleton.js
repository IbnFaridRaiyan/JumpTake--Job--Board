import React from 'react';

const PortalPageSkeleton = ({ className = '', compact = false, label = 'Loading page' }) => (
    <div
        className={`portal-page-skeleton ${compact ? 'is-compact' : ''} ${className}`.trim()}
        role="status"
        aria-live="polite"
        aria-label={label}
    >
        <span className="portal-page-skeleton-title" aria-hidden="true" />
        <div className="portal-page-skeleton-tabs" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
        </div>
        <div className="portal-page-skeleton-card" aria-hidden="true">
            <span className="portal-page-skeleton-avatar" />
            <span className="portal-page-skeleton-line is-wide" />
            <span className="portal-page-skeleton-line is-medium" />
        </div>
        <div className="portal-page-skeleton-card" aria-hidden="true">
            <span className="portal-page-skeleton-avatar" />
            <span className="portal-page-skeleton-line is-wide" />
            <span className="portal-page-skeleton-line is-short" />
        </div>
        <span className="portal-page-skeleton-accessible-text">{label}</span>
    </div>
);

export default PortalPageSkeleton;
