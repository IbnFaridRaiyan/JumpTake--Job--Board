import React from 'react';

const QUICK_ACTION_ICONS = {
    home: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708z" />
            <path d="m8 3.293 6 6V13.5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5V9.293z" />
        </svg>
    ),
    applications: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5" />
            <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
        </svg>
    ),
    resume: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001m-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708z" />
        </svg>
    ),
    profile: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
            <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z" />
        </svg>
    ),
    postJob: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0q-.264 0-.523.017l.064.998a7 7 0 0 1 .918 0l.064-.998A8 8 0 0 0 8 0M6.44.152q-.52.104-1.012.27l.321.948q.43-.147.884-.237zm4.132.271a8 8 0 0 0-1.011-.27l-.194.98q.453.09.884.237zm1.873.925a8 8 0 0 0-.906-.524l-.443.896q.413.205.793.459zM4.46.824q-.471.233-.905.524l.556.83a7 7 0 0 1 .793-.458zM2.725 1.985q-.394.346-.74.74l.752.66q.303-.345.648-.648zm11.29.74a8 8 0 0 0-.74-.74l-.66.752q.346.303.648.648zm1.161 1.735a8 8 0 0 0-.524-.905l-.83.556q.254.38.458.793zM1.348 3.555q-.292.433-.524.906l.896.443q.205-.413.459-.793zM.423 5.428a8 8 0 0 0-.27 1.011l.98.194q.09-.453.237-.884zM15.848 6.44a8 8 0 0 0-.27-1.012l-.948.321q.147.43.237.884zM.017 7.477a8 8 0 0 0 0 1.046l.998-.064a7 7 0 0 1 0-.918zM16 8a8 8 0 0 0-.017-.523l-.998.064a7 7 0 0 1 0 .918l.998.064A8 8 0 0 0 16 8M.152 9.56q.104.52.27 1.012l.948-.321a7 7 0 0 1-.237-.884l-.98.194zm15.425 1.012q.168-.493.27-1.011l-.98-.194q-.09.453-.237.884zM.824 11.54a8 8 0 0 0 .524.905l.83-.556a7 7 0 0 1-.458-.793zm13.828.905q.292-.434.524-.906l-.896-.443q-.205.413-.459.793zm-12.667.83q.346.394.74.74l.66-.752a7 7 0 0 1-.648-.648zm11.29.74q.394-.346.74-.74l-.752-.66q-.302.346-.648.648zm-1.735 1.161q.471-.233.905-.524l-.556-.83a7 7 0 0 1-.793.458zm-7.985-.524q.434.292.906.524l.443-.896a7 7 0 0 1-.793-.459zm1.873.925q.493.168 1.011.27l.194-.98a7 7 0 0 1-.884-.237zm4.132.271a8 8 0 0 0 1.012-.27l-.321-.948a7 7 0 0 1-.884.237l.194.98zm-2.083.135a8 8 0 0 0 1.046 0l-.064-.998a7 7 0 0 1-.918 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z" />
        </svg>
    ),
    manageJobs: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path fillRule="evenodd" d="M10.646.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-1.902 1.902-.829 3.313a1.5 1.5 0 0 1-1.024 1.073L1.254 14.746 4.358 4.4A1.5 1.5 0 0 1 5.43 3.377l3.313-.828zm-1.8 2.908-3.173.793a.5.5 0 0 0-.358.342l-2.57 8.565 8.567-2.57a.5.5 0 0 0 .34-.357l.794-3.174-3.6-3.6z" />
            <path fillRule="evenodd" d="M2.832 13.228 8 9a1 1 0 1 0-1-1l-4.228 5.168-.026.086z" />
        </svg>
    ),
    talentPool: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5" />
        </svg>
    )
};

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
            { label: 'Dashboard Feed', section: 'home-feed', icon: 'home', tone: 'primary' },
            { label: 'Post a Job', section: 'post-job', icon: 'postJob' },
            { label: 'Manage Jobs', section: 'manage-jobs', icon: 'manageJobs' },
            { label: 'Talent Pool', section: 'talent-pool', icon: 'talentPool' }
        ]
        : [
            { label: 'Dashboard Feed', section: 'job-feed', icon: 'home', tone: 'primary' },
            { label: 'My Applications', section: 'applications', icon: 'applications' },
            { label: 'Resume Playground', section: 'resume-playground', icon: 'resume' },
            { label: 'My Profile', section: 'profile', icon: 'profile' }
        ];

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
                        className={`portal-default-action portal-default-action-${action.icon} ${action.tone === 'primary' ? 'is-primary' : ''}`}
                        onClick={() => switchSection?.(action.section)}
                    >
                        <span className="portal-default-action-icon">
                            {QUICK_ACTION_ICONS[action.icon]}
                        </span>
                        <span className="portal-default-action-label">{action.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default PortalDefaultLanding;
