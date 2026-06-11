import React, { useEffect, useMemo, useState } from 'react';

const toDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
};

const inLastDays = (dateValue, days = 7) => {
    const date = toDate(dateValue);
    if (!date) return false;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return date >= start;
};

const percent = (value) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;

const BarChart = ({ metrics }) => (
    <div className="analytics-detail-chart">
        {metrics.map((metric) => (
            <div className="analytics-detail-row" key={metric.label}>
                <span>{metric.label}</span>
                <div className="analytics-detail-track">
                    <div className="analytics-detail-fill" style={{ width: percent(metric.score) }}></div>
                </div>
                <strong>{metric.display}</strong>
            </div>
        ))}
    </div>
);

const PerformanceAnalytics = ({ mode = 'candidate', jobs = [], jobSeekerData, userId, employer, applicationCount = 0 }) => {
    const [applications, setApplications] = useState([]);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const token = mode === 'candidate'
                    ? localStorage.getItem('token')
                    : localStorage.getItem('employerToken');
                const id = mode === 'candidate' ? userId : employer?.companyId;

                if (!id || !token) {
                    setApplications([]);
                    return;
                }

                const endpoint = mode === 'candidate'
                    ? `/api/applications/user/${id}`
                    : `/api/applications/company/${id}`;

                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) {
                    setApplications([]);
                    return;
                }

                const data = await response.json();
                setApplications(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Unable to load analytics applications:', error);
                setApplications([]);
            }
        };

        fetchApplications();
    }, [mode, userId, employer?.companyId]);

    const metrics = useMemo(() => {
        if (mode === 'employer') {
            const activeJobs = jobs.filter((job) => job.active !== false).length;
            const jobsLast7 = jobs.filter((job) => inLastDays(job.createdAt)).length;
            const applicationsLast7 = applications.filter((application) => inLastDays(application.createdAt || application.appliedAt)).length;
            const hiredCount = applications.filter((application) => {
                const status = String(application.status || '').toLowerCase();
                return status.includes('hired') || status.includes('accepted');
            }).length;
            const assessmentCount = applications.filter((application) => {
                const status = String(application.status || '').toLowerCase();
                return status.includes('assessment');
            }).length;
            const totalApplications = applications.length || applicationCount || 0;

            return [
                {
                    label: 'Hiring Rate',
                    value: hiredCount,
                    display: totalApplications ? `${Math.round((hiredCount / totalApplications) * 100)}%` : '0%',
                    score: totalApplications ? (hiredCount / totalApplications) * 100 : 0
                },
                {
                    label: 'Job Posting Rate',
                    value: jobsLast7,
                    display: `${jobsLast7} this week`,
                    score: Math.min(100, jobsLast7 * 20)
                },
                {
                    label: 'Candidate Applications',
                    value: applicationsLast7,
                    display: `${applicationsLast7} this week`,
                    score: Math.min(100, applicationsLast7 * 20)
                },
                {
                    label: 'Assessment Making Rate',
                    value: assessmentCount,
                    display: String(assessmentCount),
                    score: Math.min(100, assessmentCount * 20)
                },
                {
                    label: 'Active Job Listings',
                    value: activeJobs,
                    display: String(activeJobs),
                    score: Math.min(100, activeJobs * 20)
                }
            ];
        }

        const candidateSkills = Array.isArray(jobSeekerData?.skills) ? jobSeekerData.skills.map((skill) => String(skill).toLowerCase()) : [];
        const applicationsLast7 = applications.filter((application) => inLastDays(application.createdAt || application.appliedAt)).length;
        const skillMatches = jobs.filter((job) => (
            Array.isArray(job.skills)
            && job.skills.some((skill) => candidateSkills.includes(String(skill).toLowerCase()))
        )).length;
        const responses = applications.filter((application) => {
            const status = String(application.status || '').toLowerCase();
            return status && !['submitted', 'under review', 'review'].includes(status);
        }).length;
        const totalViews = Number(jobSeekerData?.profileViews || jobSeekerData?.employerViews || 0);

        return [
            {
                label: 'Application Rate',
                value: applicationsLast7,
                display: `${applicationsLast7} this week`,
                score: Math.min(100, applicationsLast7 * 20)
            },
            {
                label: 'Job Searching Rate',
                value: jobs.length,
                display: `${jobs.length} jobs`,
                score: Math.min(100, jobs.length * 5)
            },
            {
                label: 'Skill Matching Rate',
                value: skillMatches,
                display: jobs.length ? `${Math.round((skillMatches / jobs.length) * 100)}%` : '0%',
                score: jobs.length ? (skillMatches / jobs.length) * 100 : 0
            },
            {
                label: 'Employer Views',
                value: totalViews,
                display: String(totalViews),
                score: Math.min(100, totalViews * 10)
            },
            {
                label: 'Response Rate',
                value: responses,
                display: applications.length ? `${Math.round((responses / applications.length) * 100)}%` : '0%',
                score: applications.length ? (responses / applications.length) * 100 : 0
            }
        ];
    }, [mode, jobs, applications, applicationCount, jobSeekerData]);

    const primary = metrics[0] || { label: 'Performance', display: '0', score: 0 };
    const secondary = metrics[1] || { label: 'Activity', display: '0', score: 0 };
    const bars = metrics.slice(0, 7);
    const title = mode === 'employer' ? 'Application Tracking System' : 'Progress Check';

    return (
        <div className="analytics-page">
            <div className="analytics-card group">
                <div className="analytics-card-glow"></div>
                <div className="analytics-card-inner"></div>

                <div className="analytics-card-content">
                    <div className="analytics-card-top">
                        <div className="analytics-card-title-row">
                            <div className="analytics-icon">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                </svg>
                            </div>
                            <h3>{title}</h3>
                        </div>
                        <span className="analytics-live"><span></span>Live</span>
                    </div>

                    <div className="analytics-summary-grid">
                        <div className="analytics-summary-box">
                            <p>{primary.label}</p>
                            <strong>{primary.display}</strong>
                            <span>+{Math.max(1, Math.round(primary.score / 10))}%</span>
                        </div>
                        <div className="analytics-summary-box">
                            <p>{secondary.label}</p>
                            <strong>{secondary.display}</strong>
                            <span>+{Math.max(1, Math.round(secondary.score / 10))}%</span>
                        </div>
                    </div>

                    <div className="analytics-mini-chart">
                        <div className="analytics-bars">
                            {bars.map((metric) => (
                                <div className="analytics-bar-shell" style={{ height: `${Math.max(35, metric.score)}%` }} key={metric.label}>
                                    <div className="analytics-bar-fill" style={{ height: percent(metric.score) }}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="analytics-card-footer">
                        <span>Last 7 days</span>
                        <button type="button" onClick={() => setDetailsOpen(true)}>
                            View Details
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {detailsOpen && (
                <div className="analytics-detail-overlay" onClick={() => setDetailsOpen(false)}>
                    <div className="analytics-detail-modal" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="preview-close-btn" onClick={() => setDetailsOpen(false)}>×</button>
                        <h2>{title} Details</h2>
                        <p>Performance signals based on the current dashboard data.</p>
                        <BarChart metrics={metrics} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceAnalytics;
