import React from 'react';

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

    const stats = isEmployer
        ? [
            { label: 'Active jobs', value: jobs.length },
            { label: 'Applications', value: applicationCount },
            { label: 'Notifications', value: notificationCount },
            { label: 'Inbox', value: inboxCount }
        ]
        : [
            { label: 'Available jobs', value: jobs.length },
            { label: 'Assessments', value: assessmentCount },
            { label: 'Video interviews', value: videoInterviewCount },
            { label: 'Notifications', value: notificationCount }
        ];

    const actions = isEmployer
        ? [
            { label: 'Open Talent Stories', section: 'home-feed', tone: 'primary' },
            { label: 'Post a Job', section: 'post-job' },
            { label: 'Manage Jobs', section: 'manage-jobs' },
            { label: 'Talent Pool', section: 'talent-pool' }
        ]
        : [
            { label: 'Open Job Feed', section: 'job-feed', tone: 'primary' },
            { label: 'My Applications', section: 'applications' },
            { label: 'Resume Playground', section: 'resume-playground' },
            { label: 'Job Preferences', section: 'interested-jobs' }
        ];
    const oldHomeAction = isEmployer
        ? { label: 'Home', section: 'home-feed' }
        : { label: 'Home', section: 'job-feed' };

    return (
        <section className={`portal-default-landing ${isEmployer ? 'is-employer' : 'is-candidate'}`}>
            <div className="portal-default-hero">
                <p className="portal-default-kicker">{isEmployer ? 'Employer workspace' : 'Candidate workspace'}</p>
                <h3>{isEmployer ? 'Start hiring with JumpTake' : 'Start your JumpTake day'}</h3>
                <p>
                    {isEmployer
                        ? `Welcome back, ${name}. Jump into hiring, talent discovery, and application tracking from one clean starting point.`
                        : `Welcome back, ${name}. Continue your job search, manage applications, and keep your profile ready from one clean starting point.`}
                </p>
            </div>

            <div className="portal-default-stats" aria-label="Portal summary">
                {stats.map((stat) => (
                    <div className="portal-default-stat" key={stat.label}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="portal-default-actions" aria-label="Quick actions">
                {actions.map((action) => (
                    <button
                        type="button"
                        key={action.label}
                        className={`portal-default-action ${action.tone === 'primary' ? 'is-primary' : ''}`}
                        onClick={() => switchSection?.(action.section)}
                    >
                        {action.label}
                    </button>
                ))}
                <button
                    type="button"
                    className="portal-default-action portal-default-home-action"
                    onClick={() => switchSection?.(oldHomeAction.section)}
                >
                    {oldHomeAction.label}
                </button>
            </div>
        </section>
    );
};

export default PortalDefaultLanding;
