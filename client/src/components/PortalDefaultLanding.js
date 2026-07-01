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
            { label: 'Active jobs', value: jobs.length, section: 'manage-jobs' },
            { label: 'Applications', value: applicationCount, section: 'application-tracking' },
            { label: 'Notifications', value: notificationCount, section: 'notifications' },
            { label: 'Inbox', value: inboxCount, action: 'messages' }
        ]
        : [
            { label: 'Available jobs', value: jobs.length, section: 'job-feed', tab: 'job-posts' },
            { label: 'Assessments', value: assessmentCount, section: 'assessments' },
            { label: 'Video interviews', value: videoInterviewCount, section: 'video-interviews' },
            { label: 'Notifications', value: notificationCount, section: 'notifications' }
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
                            <span>Start your </span>
                            <span className="portal-default-title-brand">JumpTake</span>
                            <span> day</span>
                        </>
                    )}
                </h3>
                <p>
                    {isEmployer
                        ? `Welcome back, ${name}. Jump into hiring, talent discovery, and application tracking from one clean starting point.`
                        : `Welcome back, ${name}. Explore your career in a structured way!`}
                </p>
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
