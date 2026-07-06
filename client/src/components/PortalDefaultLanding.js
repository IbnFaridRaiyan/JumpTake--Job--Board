import React from 'react';

const ACTION_ICON_PATHS = {
    home: 'M12 3.1 3 10.3V21h6v-6h6v6h6V10.3l-9-7.2Zm0 2.56 7 5.6V19h-2v-6H7v6H5v-7.74l7-5.6Z',
    applications: 'M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h8v2H8V8Zm0 3h8v2H8v-2Zm0 3h5v2H8v-2Z',
    resume: 'M4 3h12l4 4v14H4V3Zm11 1.7V8h3.3L15 4.7ZM6 5v14h12V10h-5V5H6Zm2 8h8v2H8v-2Zm0 3h6v2H8v-2Z',
    profile: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z',
    postJob: 'M10 6V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5Zm2 0h4V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1Zm1 5h-2v3H8v2h3v3h2v-3h3v-2h-3v-3Z',
    manageJobs: 'M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 3h8v2H8V9Zm0 4h5v2H8v-2Z',
    document: 'M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM7 5v14h10v-8h-5V5H7Zm2 8h6v2H9v-2Zm0 3h6v2H9v-2Z',
    company: 'M4 3h10v18H4V3Zm2 2v14h6V5H6Zm10 5h4v11h-6v-2h4v-7h-2v-2ZM8 7h2v2H8V7Zm0 4h2v2H8v-2Zm0 4h2v2H8v-2Z'
};

const ActionIcon = ({ name }) => (
    <svg className="portal-default-action-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d={ACTION_ICON_PATHS[name] || ACTION_ICON_PATHS.home} />
    </svg>
);

const PortalDefaultLanding = ({
    mode = 'candidate',
    displayName = '',
    jobs = [],
    applicationCount = 0,
    notificationCount = 0,
    inboxCount = 0,
    assessmentCount = 0,
    videoInterviewCount = 0,
    switchSection
}) => {
    const isEmployer = mode === 'employer';
    const name = displayName || (isEmployer ? 'Employer' : 'Candidate');
    const safeJobs = Array.isArray(jobs) ? jobs : [];

    const stats = isEmployer
        ? [
            { label: 'Active jobs', value: safeJobs.length, section: 'manage-jobs' },
            { label: 'Applications', value: applicationCount, section: 'application-tracking' },
            { label: 'Notifications', value: notificationCount, section: 'notifications' },
            { label: 'Inbox', value: inboxCount, action: 'messages' }
        ]
        : [
            { label: 'Available jobs', value: safeJobs.length, section: 'job-feed', tab: 'job-posts' },
            { label: 'Assessments', value: assessmentCount, section: 'assessments' },
            { label: 'Video interviews', value: videoInterviewCount, section: 'video-interviews' },
            { label: 'Notifications', value: notificationCount, section: 'notifications' }
        ];

    const actions = isEmployer
        ? [
            { label: 'Home', section: 'home-feed', icon: 'home' },
            { label: 'Post a Job', section: 'post-job', icon: 'postJob' },
            { label: 'Manage Jobs', section: 'manage-jobs', icon: 'manageJobs' },
            { label: 'Create Document', section: 'create-document', icon: 'document' },
            { label: 'Company Profile', section: 'company-profile', icon: 'company' }
        ]
        : [
            { label: 'Home', section: 'job-feed', icon: 'home' },
            { label: 'My Applications', section: 'applications', icon: 'applications' },
            { label: 'Resume Playground', section: 'resume-playground', icon: 'resume' },
            { label: 'My Profile', section: 'profile', icon: 'profile' }
        ];

    const handleStatClick = (stat) => {
        if (stat.action === 'messages' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(isEmployer ? 'jumptake-open-employer-messenger' : 'jumptake-open-candidate-messenger'));
            return;
        }

        if (stat.tab && typeof window !== 'undefined') {
            sessionStorage.setItem('jumptakeHomeFeedRequest', JSON.stringify({
                mode: isEmployer ? 'employer' : 'candidate',
                tab: stat.tab
            }));
        }

        switchSection?.(stat.section);
    };

    return (
        <section className={`portal-default-landing ${isEmployer ? 'is-employer' : 'is-candidate'}`}>
            <div className="portal-default-hero">
                <p className="portal-default-kicker">{isEmployer ? 'Employer workspace' : 'Candidate workspace'}</p>
                <h3 className="portal-default-title-animated">
                    {isEmployer ? (
                        <>
                            <span>Start hiring with </span>
                            <span className="portal-default-title-brand">JumpTake</span>
                        </>
                    ) : (
                        <>
                            <span className="portal-default-title-line">Start your</span>
                            <span className="portal-default-title-line portal-default-title-line-brand">
                                <span className="portal-default-title-brand">JumpTake</span>
                                <span>day</span>
                            </span>
                        </>
                    )}
                </h3>
                <p>
                    {isEmployer
                        ? `Welcome back, ${name}. Jump into hiring, talent discovery, and application tracking from one clean starting point.`
                        : `Welcome back, ${name}. Explore your career in a structured way!`}
                </p>
            </div>

            <div className={`portal-default-actions ${isEmployer ? 'is-employer' : 'is-candidate'}`} aria-label="Quick actions">
                {actions.map((action) => (
                    <button
                        type="button"
                        key={action.label}
                        className="portal-default-action"
                        onClick={() => switchSection?.(action.section)}
                        aria-label={action.label}
                        title={action.label}
                    >
                        <ActionIcon name={action.icon} />
                    </button>
                ))}
            </div>

            <div className="portal-default-stats" aria-label="Portal summary">
                {stats.map((stat) => (
                    <button
                        type="button"
                        className="portal-default-stat"
                        key={stat.label}
                        onClick={() => handleStatClick(stat)}
                    >
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default PortalDefaultLanding;
