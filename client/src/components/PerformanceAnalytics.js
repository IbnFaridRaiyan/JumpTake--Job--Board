import React, { useEffect, useMemo, useState } from 'react';
import '../styles/performance-analytics.css';
import '../styles/performance-analytics-light.css';
import '../styles/performance-analytics-dark.css';

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

const includesWord = (value, words) => words.some((word) => String(value || '').toLowerCase().includes(word));

const countMatching = (items, resolver, words) => items.filter((item) => includesWord(resolver(item), words)).length;

const average = (values) => {
    const numbers = values.map(Number).filter(Number.isFinite).filter((value) => value > 0);
    return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : 0;
};

const formatNumber = (value) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

const MetricIcon = ({ type }) => {
    const paths = {
        applications: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
        interviews: 'M4 6h16v11H4zM8 6V4h8v2M8 11h8M8 14h5',
        assessments: 'M7 3h10v18H7zM10 7h4M10 11h4M10 15h4',
        posts: 'M4 5h16v12H4zM8 19h8M9 9h6M8 12h8',
        feedback: 'M5 5h14v11H9l-4 3zM8 9h8M8 12h5',
        ratings: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3.2 1.1-6.2L3 9.6l6.2-.9z',
        likes: 'M20 8.5c0 5-8 9.5-8 9.5S4 13.5 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z',
        connections: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 0 0 0-6',
        views: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
        saved: 'M6 4h12v17l-6-3-6 3z'
    };

    return (
        <svg className="progress-metric-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d={paths[type] || paths.applications} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const ProgressRing = ({ value }) => (
    <div className="progress-ring" style={{ '--ring-progress': `${Math.max(0, Math.min(100, value))}%` }}>
        <div className="progress-ring-center">{Math.round(value)}%</div>
    </div>
);

const TrendChart = ({ values }) => {
    const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0];
    const maximum = Math.max(...safeValues, 1);
    const points = safeValues.map((value, index) => `${index * 20},${42 - ((value / maximum) * 32)}`).join(' ');
    const area = `0,46 ${points} 100,46`;

    return (
        <svg className="progress-trend-chart" viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="Activity trend">
            <defs>
                <linearGradient id="progressTrendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--progress-accent)" stopOpacity="0.38" />
                    <stop offset="1" stopColor="var(--progress-accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={area} fill="url(#progressTrendFill)" />
            <polyline points={points} fill="none" stroke="var(--progress-accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

const PerformanceAnalytics = ({ mode = 'candidate', jobs = [], jobSeekerData, userId, employer, applicationCount = 0 }) => {
    const [applications, setApplications] = useState([]);
    const [period, setPeriod] = useState('30');
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
                console.error('Unable to load progress data:', error);
            }
        };

        fetchApplications();
    }, [mode, userId, employer?.companyId]);

    const metrics = useMemo(() => {
        const applicationTotal = applications.length || numberFrom(applicationCount);
        const interviews = countMatching(applications, (item) => `${item.status} ${item.type} ${item.interviewStatus}`, ['interview']);
        const assessments = countMatching(applications, (item) => `${item.status} ${item.type} ${item.assessmentStatus}`, ['assessment', 'test']);
        const recentApplications = applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, Number(period))).length;
        const posts = mode === 'employer'
            ? safeJobs.length
            : numberFrom(jobSeekerData?.postsCount, jobSeekerData?.postCount, jobSeekerData?.posts?.length);
        const feedbackItems = listFrom(jobSeekerData?.feedback, jobSeekerData?.feedbacks, jobSeekerData?.reviews);
        const feedback = numberFrom(jobSeekerData?.feedbackCount, jobSeekerData?.feedbacksCount, feedbackItems.length, applications.filter((item) => item.feedback || item.review).length);
        const ratingValues = [
            ...feedbackItems.map((item) => numberFrom(item?.rating, item?.score)),
            ...applications.map((item) => numberFrom(item?.rating, item?.employerRating)),
            numberFrom(jobSeekerData?.rating, jobSeekerData?.averageRating, employer?.rating)
        ];
        const rating = average(ratingValues);
        const jobLikes = safeJobs.reduce((sum, job) => sum + numberFrom(job.likes, job.likeCount, job.reactionsCount), 0);
        const likes = numberFrom(jobSeekerData?.likes, jobSeekerData?.likesCount, employer?.likes, jobLikes);
        const connections = numberFrom(
            jobSeekerData?.connections,
            jobSeekerData?.connectionCount,
            jobSeekerData?.friendsCount,
            jobSeekerData?.friendCount,
            employer?.connections,
            employer?.connectionCount
        );
        const views = numberFrom(jobSeekerData?.profileViews, jobSeekerData?.employerViews, employer?.profileViews);
        const saved = numberFrom(jobSeekerData?.savedJobs, jobSeekerData?.bookmarkedJobs, jobSeekerData?.bookmarks);
        const responseCount = applications.filter((item) => !includesWord(item.status, ['submitted', 'under review', 'review'])).length;
        const responseRate = applicationTotal ? Math.round((responseCount / applicationTotal) * 100) : 0;

        const raw = [
            { key: 'applications', label: 'Applications', value: applicationTotal, display: formatNumber(applicationTotal), caption: `${recentApplications} in selected period`, tone: 'teal' },
            { key: 'interviews', label: 'Interviews', value: interviews, display: formatNumber(interviews), caption: 'Interview milestones', tone: 'blue' },
            { key: 'assessments', label: 'Assessments', value: assessments, display: formatNumber(assessments), caption: 'Tests and evaluations', tone: 'purple' },
            { key: 'posts', label: 'Posts', value: posts, display: formatNumber(posts), caption: mode === 'employer' ? 'Published job posts' : 'Profile and feed posts', tone: 'orange' },
            { key: 'feedback', label: 'Feedback', value: feedback, display: formatNumber(feedback), caption: 'Reviews and responses', tone: 'pink' },
            { key: 'ratings', label: 'Ratings', value: rating, display: rating ? `${rating.toFixed(1)}/5` : '0.0/5', caption: 'Average rating', tone: 'yellow' },
            { key: 'likes', label: 'Likes', value: likes, display: formatNumber(likes), caption: 'Post appreciation', tone: 'red' },
            { key: 'connections', label: 'Connections', value: connections, display: formatNumber(connections), caption: 'Network connections', tone: 'green' },
            { key: 'views', label: 'Profile views', value: views, display: formatNumber(views), caption: 'People reached', tone: 'cyan' },
            { key: 'saved', label: 'Saved jobs', value: saved, display: formatNumber(saved), caption: 'Roles kept for later', tone: 'indigo' },
            { key: 'response', label: 'Response rate', value: responseRate, display: `${responseRate}%`, caption: 'Applications with movement', tone: 'violet' }
        ];
        const maximum = Math.max(...raw.map((metric) => metric.key === 'ratings' ? 5 : metric.value), 1);
        return raw.map((metric) => ({
            ...metric,
            progress: metric.key === 'ratings' ? (metric.value / 5) * 100 : (metric.value / maximum) * 100
        }));
    }, [applications, applicationCount, employer, jobSeekerData, mode, period, safeJobs]);

    const summary = metrics.slice(0, 4);
    const totalActivity = Math.max(1, metrics.slice(0, 3).reduce((total, metric) => total + metric.value, 0));
    const applicationShare = (metrics[0]?.value / totalActivity) * 100;
    const interviewShare = (metrics[1]?.value / totalActivity) * 100;
    const donutStyle = {
        background: `conic-gradient(var(--progress-accent) 0 ${applicationShare}%, var(--progress-blue) ${applicationShare}% ${applicationShare + interviewShare}%, var(--progress-purple) ${applicationShare + interviewShare}% 100%)`
    };
    const trendValues = [
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, 180)).length,
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, 120)).length,
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, 90)).length,
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, 60)).length,
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, 30)).length,
        applications.filter((item) => inLastDays(item.createdAt || item.appliedAt, Number(period))).length
    ];

    return (
        <section className="progress-dashboard" aria-label="Progress analytics">
            <header className="progress-dashboard-header">
                <div>
                    <span className="progress-kicker">{mode === 'employer' ? 'Hiring intelligence' : 'Career intelligence'}</span>
                    <h2><span className="progress-title-animated">Progress Check</span></h2>
                    <p>One clear view of the activity moving your JumpTake journey forward.</p>
                </div>
                <div className="progress-periods" role="group" aria-label="Analytics period">
                    {['7', '30', '90'].map((value) => (
                        <button type="button" key={value} className={period === value ? 'is-active' : ''} onClick={() => setPeriod(value)}>
                            {value}d
                        </button>
                    ))}
                </div>
            </header>

            <div className="progress-summary-grid">
                {summary.map((metric) => (
                    <article className={`progress-summary-card tone-${metric.tone}`} key={metric.key}>
                        <div className="progress-summary-icon"><MetricIcon type={metric.key} /></div>
                        <div><span>{metric.label}</span><strong>{metric.display}</strong><small>{metric.caption}</small></div>
                    </article>
                ))}
            </div>

            <div className="progress-visual-grid">
                <article className="progress-panel progress-trend-panel">
                    <div className="progress-panel-heading"><div><span>Momentum</span><h3>Activity trend</h3></div><strong>{metrics[0]?.display || '0'} total</strong></div>
                    <TrendChart values={trendValues} />
                    <div className="progress-chart-axis"><span>180 days ago</span><span>Today</span></div>
                </article>
                <article className="progress-panel progress-donut-panel">
                    <div className="progress-panel-heading"><div><span>Progress mix</span><h3>Where your time lands</h3></div></div>
                    <div className="progress-donut-layout"><div className="progress-donut" style={donutStyle}><div><strong>{formatNumber(totalActivity)}</strong><span>signals</span></div></div><div className="progress-legend"><span><i className="legend-teal" />Applications</span><span><i className="legend-blue" />Interviews</span><span><i className="legend-purple" />Assessments</span></div></div>
                </article>
            </div>

            <div className="progress-lower-grid">
                <article className="progress-panel progress-metrics-panel">
                    <div className="progress-panel-heading"><div><span>All signals</span><h3>Performance breakdown</h3></div><ProgressRing value={metrics.reduce((sum, metric) => sum + metric.progress, 0) / Math.max(metrics.length, 1)} /></div>
                    <div className="progress-metric-list">
                        {metrics.map((metric) => (
                            <div className="progress-metric-row" key={metric.key}>
                                <div className={`progress-metric-icon-wrap tone-${metric.tone}`}><MetricIcon type={metric.key} /></div>
                                <div className="progress-metric-copy"><div><strong>{metric.label}</strong><span>{metric.display}</span></div><div className="progress-track"><i style={{ width: `${metric.progress}%` }} /></div><small>{metric.caption}</small></div>
                            </div>
                        ))}
                    </div>
                </article>
                <article className="progress-panel progress-insight-panel">
                    <div className="progress-panel-heading"><div><span>Next best action</span><h3>Keep the momentum visible</h3></div></div>
                    <div className="progress-insight-ring"><ProgressRing value={metrics[10]?.value || 0} /></div>
                    <p>{metrics[10]?.value ? `Your response rate is ${metrics[10].display}. Keep applications moving with a quick follow-up.` : 'Complete your first application or update your profile to start building meaningful progress signals.'}</p>
                    <div className="progress-insight-list"><span><i />Track activity weekly</span><span><i />Refresh your skills and interests</span><span><i />Build connections after every milestone</span></div>
                </article>
            </div>
        </section>
    );
};

export default PerformanceAnalytics;
