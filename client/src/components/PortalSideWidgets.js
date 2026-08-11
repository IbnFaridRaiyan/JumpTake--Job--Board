import React, { useEffect, useMemo, useState } from 'react';
import AssistantChat from './AssistantChat';
import defaultTailorCoverDarkImage from './media/default-tailor-cover-dark.png';
import defaultTailorCoverLightImage from './media/default-tailor-cover-light.png';

const toDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
};

const inLastDays = (value, days) => {
    const date = toDate(value);
    if (!date) return false;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return date >= start;
};

const numberFrom = (...values) => {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const listFrom = (...values) => values.find(Array.isArray) || [];

const formatNumber = (value) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

const includesWord = (value, words) => words.some((word) => String(value || '').toLowerCase().includes(word));

const ProgressRing = ({ value }) => (
    <div className="progress-ring" style={{ '--ring-progress': `${Math.max(0, Math.min(100, value))}%` }}>
        <div className="progress-ring-center">{Math.round(value)}%</div>
    </div>
);

const PerformanceWidget = ({ mode = 'candidate', jobs = [], jobSeekerData, userId, employer, applicationCount = 0 }) => {
    const [applications, setApplications] = useState([]);
    const safeJobs = useMemo(() => (Array.isArray(jobs) ? jobs : []), [jobs]);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const token = mode === 'candidate' ? localStorage.getItem('token') : localStorage.getItem('employerToken');
                const id = mode === 'candidate' ? userId : employer?.companyId;
                if (!id || !token) return;

                const endpoint = mode === 'candidate' ? `/api/applications/user/${id}` : `/api/applications/company/${id}`;
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) return;
                const data = await response.json();
                setApplications(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Unable to load widget progress data:', error);
            }
        };

        fetchApplications();
    }, [mode, userId, employer?.companyId]);

    const metrics = useMemo(() => {
        const applicationTotal = applications.length || numberFrom(applicationCount);
        const interviews = applications.filter((item) => includesWord(`${item.status} ${item.type} ${item.interviewStatus}`, ['interview'])).length;
        const assessments = applications.filter((item) => includesWord(`${item.status} ${item.type} ${item.assessmentStatus}`, ['assessment', 'test'])).length;
        const posts = mode === 'employer'
            ? safeJobs.length
            : numberFrom(jobSeekerData?.postsCount, jobSeekerData?.postCount, jobSeekerData?.posts?.length);
        const trendValues = [180, 120, 90, 60, 30, 14].map((days) => applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, days)).length);
        const totalActivity = Math.max(1, applicationTotal + interviews + assessments);
        const applicationShare = (applicationTotal / totalActivity) * 100;
        const interviewShare = (interviews / totalActivity) * 100;
        const donutStyle = {
            background: `conic-gradient(var(--progress-accent) 0 ${applicationShare}%, var(--progress-blue) ${applicationShare}% ${applicationShare + interviewShare}%, var(--progress-purple) ${applicationShare + interviewShare}% 100%)`
        };

        const responseCount = applications.filter((item) => !includesWord(item.status, ['submitted', 'under review', 'review'])).length;
        const responseRate = applicationTotal ? Math.round((responseCount / applicationTotal) * 100) : 0;
        const jobLikes = safeJobs.reduce((sum, job) => sum + numberFrom(job.likes, job.likeCount, job.reactionsCount), 0);
        const likes = numberFrom(jobSeekerData?.likes, jobSeekerData?.likesCount, employer?.likes, jobLikes);
        const connections = numberFrom(jobSeekerData?.connections, jobSeekerData?.connectionCount, jobSeekerData?.friendsCount, jobSeekerData?.friendCount, employer?.connections);
        const views = numberFrom(jobSeekerData?.profileViews, employer?.profileViews);
        const feedbackItems = listFrom(jobSeekerData?.feedback, jobSeekerData?.feedbacks, jobSeekerData?.reviews);
        const feedback = numberFrom(jobSeekerData?.feedbackCount, jobSeekerData?.feedbacksCount, feedbackItems.length);
        const overall = Math.max(0, Math.min(100, Math.round(
            (numberFrom(applicationTotal) ? 1 : 0) * 22
            + (interviews ? 1 : 0) * 16
            + (assessments ? 1 : 0) * 14
            + (posts ? 1 : 0) * 12
            + (connections ? 1 : 0) * 12
            + (feedback ? 1 : 0) * 10
            + (responseRate >= 40 ? 1 : 0) * 14
        )));

        return {
            applications: applicationTotal,
            interviews,
            assessments,
            posts,
            trendValues,
            donutStyle,
            totalActivity: applicationTotal + interviews + assessments,
            feedback,
            likes,
            connections,
            views,
            responseRate,
            overall
        };
    }, [applications, applicationCount, jobSeekerData, mode, safeJobs, employer]);

    const maxTrend = Math.max(...metrics.trendValues, 1);
    const points = metrics.trendValues.map((value, index) => `${index * 20},${42 - ((value / maxTrend) * 32)}`).join(' ');
    const area = `0,46 ${points} 100,46`;

    const statItems = [
        { label: 'Posts', value: metrics.posts, tone: 'var(--progress-orange, #e8873a)' },
        { label: 'Interviews', value: metrics.interviews, tone: 'var(--progress-blue)' },
        { label: 'Applications', value: metrics.applications, tone: 'var(--progress-accent)' },
        { label: 'Assessments', value: metrics.assessments, tone: 'var(--progress-purple)' }
    ];

    const extraMetrics = [
        { label: 'Feedback', value: metrics.feedback },
        { label: 'Likes', value: metrics.likes },
        { label: 'Connections', value: metrics.connections },
        { label: 'Profile views', value: metrics.views },
        { label: 'Response rate', value: `${metrics.responseRate}%` }
    ];

    return (
        <div className="portal-widget-performance-body">
            <div className="pw-metrics-row">
                {statItems.map((item) => (
                    <div className="pw-metric" key={item.label} style={{ '--pw-tone': item.tone }}>
                        <strong>{formatNumber(item.value)}</strong>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="pw-overall-card">
                <div className="pw-panel-heading"><span>Overall progress</span><strong>Portfolio health</strong></div>
                <div className="pw-overall-layout">
                    <ProgressRing value={metrics.overall} />
                    <div className="pw-overall-copy">
                        <span>Keep building signals to push your score higher.</span>
                    </div>
                </div>
            </div>

            <div className="pw-donut-card">
                <div className="pw-panel-heading"><span>Progress mix</span><strong>Where your time lands</strong></div>
                <div className="pw-donut-layout">
                    <div className="progress-donut" style={metrics.donutStyle}>
                        <div><strong>{formatNumber(metrics.totalActivity)}</strong><span>signals</span></div>
                    </div>
                    <div className="progress-legend">
                        <span className="pw-legend-chip"><i className="legend-teal" />Applications</span>
                        <span className="pw-legend-chip"><i className="legend-blue" />Interviews</span>
                        <span className="pw-legend-chip"><i className="legend-purple" />Assessments</span>
                    </div>
                </div>
            </div>

            <div className="pw-trend-card">
                <div className="pw-panel-heading"><span>Momentum</span><strong>Activity trend</strong></div>
                <svg className="progress-trend-chart" viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="Activity trend">
                    <defs>
                        <linearGradient id="pwTrendFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor="var(--progress-accent)" stopOpacity="0.38" />
                            <stop offset="1" stopColor="var(--progress-accent)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <polygon points={area} fill="url(#pwTrendFill)" />
                    <polyline points={points} fill="none" stroke="var(--progress-accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>

            <div className="pw-extra-card">
                <div className="pw-panel-heading"><span>All signals</span><strong>Performance breakdown</strong></div>
                {extraMetrics.map((metric) => (
                    <div className="pw-extra-row" key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LastUsedPageWidget = ({ renderSection, previousSection, previousSectionTitle }) => {
    if (!previousSection || typeof renderSection !== 'function') {
        return (
            <div className="portal-widget-empty">
                <strong>No page pinned yet</strong>
                <span>Open any portal page and it will appear here as a live window.</span>
            </div>
        );
    }

    return (
        <div className="portal-widget-last-used-body" key={previousSection} data-last-used-section={previousSection}>
            <div className="portal-widget-last-used-scroll">
                <div className="portal-widget-last-used-zoom">
                    {renderSection(previousSection)}
                </div>
            </div>
        </div>
    );
};

const ProfileWidget = ({ profile = {}, onOpenProfile }) => {
    const name = profile.name || 'JumpTake User';
    const likes = numberFrom(profile.likes, profile.likesCount, profile.reactionsCount);
    const rating = profile.rating || profile.averageRating || 0;
    const jumptakeId = profile.jumptakeId || '';

    return (
        <button
            type="button"
            className="portal-widget portal-widget-profile"
            onClick={onOpenProfile}
            aria-label={`Open ${name}'s profile`}
        >
            {profile.coverImage ? (
                <img className="portal-widget-profile-cover" src={profile.coverImage} alt="" />
            ) : (
                <span
                    className="portal-widget-profile-cover"
                    style={{
                        '--pw-cover-light': `url("${defaultTailorCoverLightImage}")`,
                        '--pw-cover-dark': `url("${defaultTailorCoverDarkImage}")`
                    }}
                />
            )}
            <div className="portal-widget-profile-body">
                {profile.profileImage ? (
                    <img className="portal-widget-profile-avatar" src={profile.profileImage} alt="" />
                ) : (
                    <span className="portal-widget-profile-avatar">{name.charAt(0).toUpperCase()}</span>
                )}
                <strong className="portal-widget-profile-name">{name}</strong>
                <span className="portal-widget-profile-id">{jumptakeId ? `@${jumptakeId}` : 'JumpTake member'}</span>
                <div className="portal-widget-profile-stats">
                    <span className="portal-widget-profile-stat"><strong>{formatNumber(likes)}</strong><span>Likes</span></span>
                    <span className="portal-widget-profile-stat"><strong>{rating ? `${Number(rating).toFixed(1)}/5` : '0.0/5'}</strong><span>Rating</span></span>
                </div>
            </div>
        </button>
    );
};

const PortalSideWidgets = ({
    mode = 'candidate',
    renderSection,
    previousSection,
    previousSectionTitle,
    chatStorageKey,
    chatContext,
    performanceProps = {},
    profile = {},
    onOpenProfile
}) => (
    <>
        <aside className="portal-side-widgets portal-side-widgets-left">
            <section className="portal-widget portal-widget-last-used">
                <header className="portal-widget-header">
                    <span>Last used page</span>
                    <strong>{previousSectionTitle || 'JumpTake'}</strong>
                </header>
                <LastUsedPageWidget
                    renderSection={renderSection}
                    previousSection={previousSection}
                    previousSectionTitle={previousSectionTitle}
                />
            </section>
            <section className="portal-widget portal-widget-performance">
                <header className="portal-widget-header"><span>Performance</span><strong>Progress Check</strong></header>
                <PerformanceWidget {...performanceProps} mode={mode} />
            </section>
            <ProfileWidget profile={profile} onOpenProfile={onOpenProfile} />
        </aside>
        <aside className="portal-side-widgets portal-side-widgets-right">
            <section className="portal-widget portal-widget-chat">
                <header className="portal-widget-header"><span>JumpTake AI</span><strong>Ask anything</strong></header>
                <div className="portal-widget-chat-body">
                    <AssistantChat storageKey={chatStorageKey} context={chatContext} />
                </div>
            </section>
        </aside>
    </>
);

export default PortalSideWidgets;
