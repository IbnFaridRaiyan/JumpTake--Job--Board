import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AssistantChat from './AssistantChat';
import defaultTailorCoverDarkImage from './media/default-tailor-cover-dark.png';
import defaultTailorCoverLightImage from './media/default-tailor-cover-light.png';
import {
    PORTAL_REMINDER_ALERT_EVENT,
    isPortalReminderDueForAlert,
    readPortalReminders,
    writePortalReminders
} from '../utils/portalReminders';

const DESKTOP_SIDE_WIDGETS_QUERY = '(min-width: 1900px)';
const RESUME_WORKSPACE_SNAPSHOT_KEY = 'jumptakeResumePlaygroundSnapshot';

const readWidgetWorkspaceSnapshot = () => {
    if (typeof window === 'undefined') return null;

    try {
        return JSON.parse(sessionStorage.getItem(RESUME_WORKSPACE_SNAPSHOT_KEY) || 'null');
    } catch (error) {
        return null;
    }
};

const readWidgetNotepad = (storageKey) => {
    if (typeof window === 'undefined' || !storageKey) return '';

    try {
        const legacyNote = window.localStorage.getItem(`${storageKey}:notepad`) || '';
        const savedNotes = JSON.parse(window.localStorage.getItem(`${storageKey}:notepad:saved-notes`) || '[]');
        const reminders = readPortalReminders(storageKey);
        return [
            legacyNote,
            ...(Array.isArray(savedNotes) ? savedNotes.map((note) => note?.text || '') : []),
            ...reminders.map((reminder) => (
                `${reminder.text}${reminder.dueAt ? ` (${new Date(reminder.dueAt).toLocaleString()})` : ''}`
            ))
        ].filter(Boolean).join('\n');
    } catch (error) {
        return '';
    }
};

const useDesktopSideWidgets = () => {
    const [isDesktop, setIsDesktop] = useState(() => (
        typeof window !== 'undefined'
        && window.matchMedia(DESKTOP_SIDE_WIDGETS_QUERY).matches
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia(DESKTOP_SIDE_WIDGETS_QUERY);
        const syncViewport = (event) => setIsDesktop(event.matches);
        setIsDesktop(mediaQuery.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncViewport);
            return () => mediaQuery.removeEventListener('change', syncViewport);
        }

        mediaQuery.addListener(syncViewport);
        return () => mediaQuery.removeListener(syncViewport);
    }, []);

    return isDesktop;
};

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

const ProgressRing = ({ value }) => {
    const normalizedValue = Math.max(0, Math.min(100, Number(value) || 0));

    return (
        <div
            className="progress-ring"
            style={{ '--ring-offset': 100 - normalizedValue }}
            role="img"
            aria-label={`Portfolio health ${Math.round(normalizedValue)} percent`}
        >
            <svg className="progress-ring-svg" viewBox="0 0 48 48" aria-hidden="true">
                <circle className="progress-ring-track" cx="24" cy="24" r="18" pathLength="100" />
                <circle className="progress-ring-value" cx="24" cy="24" r="18" pathLength="100" />
            </svg>
            <div className="progress-ring-center">{Math.round(normalizedValue)}%</div>
        </div>
    );
};

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
                <div className="portal-widget-profile-details-card">
                    <strong className="portal-widget-profile-name">{name}</strong>
                    <span className="portal-widget-profile-id">{jumptakeId ? `@${jumptakeId}` : 'JumpTake member'}</span>
                    <div className="portal-widget-profile-stats">
                        <span className="portal-widget-profile-stat"><strong>{formatNumber(likes)}</strong><span>Likes</span></span>
                        <span className="portal-widget-profile-stat"><strong>{rating ? `${Number(rating).toFixed(1)}/5` : '0.0/5'}</strong><span>Rating</span></span>
                    </div>
                </div>
            </div>
        </button>
    );
};

const createWidgetRecordId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readWidgetSavedNotes = (storageKey) => {
    if (typeof window === 'undefined' || !storageKey) return [];
    try {
        const savedNotes = JSON.parse(window.localStorage.getItem(`${storageKey}:notepad:saved-notes`) || '[]');
        return Array.isArray(savedNotes) ? savedNotes.filter((note) => note?.text) : [];
    } catch (error) {
        return [];
    }
};

const formatWidgetReminderTime = (value) => {
    if (!value) return 'Add a reminder time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Add a reminder time';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const toDateTimeLocalValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
};

const NotepadWidget = ({ mode, storageKey }) => {
    const resolvedAssistantStorageKey = storageKey || `jumptakeAssistantChat:${mode || 'candidate'}:guest`;
    const legacyStorageKey = `${resolvedAssistantStorageKey}:notepad`;
    const savedNotesStorageKey = `${resolvedAssistantStorageKey}:notepad:saved-notes`;
    const [activeSection, setActiveSection] = useState('new');
    const [noteDraft, setNoteDraft] = useState('');
    const [savedNotes, setSavedNotes] = useState([]);
    const [reminderDraft, setReminderDraft] = useState('');
    const [reminderDueAt, setReminderDueAt] = useState('');
    const [reminders, setReminders] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');
    const emittedReminderIdsRef = useRef(new Set());

    useEffect(() => {
        try {
            setNoteDraft(window.localStorage.getItem(legacyStorageKey) || '');
        } catch (error) {
            setNoteDraft('');
        }
        setSavedNotes(readWidgetSavedNotes(resolvedAssistantStorageKey));
        setReminders(readPortalReminders(resolvedAssistantStorageKey));
        setStatusMessage('');
        emittedReminderIdsRef.current = new Set();
    }, [legacyStorageKey, resolvedAssistantStorageKey]);

    const persistSavedNotes = useCallback((nextNotes) => {
        setSavedNotes(nextNotes);
        try {
            window.localStorage.setItem(savedNotesStorageKey, JSON.stringify(nextNotes));
        } catch (error) {
            setStatusMessage('Could not save this note.');
        }
    }, [savedNotesStorageKey]);

    const persistReminders = useCallback((nextReminders) => {
        setReminders(writePortalReminders(resolvedAssistantStorageKey, nextReminders));
    }, [resolvedAssistantStorageKey]);

    const saveNewNote = () => {
        const text = noteDraft.trim();
        if (!text) {
            setStatusMessage('Write a note first.');
            return;
        }

        persistSavedNotes([{
            id: createWidgetRecordId('note'),
            text,
            createdAt: new Date().toISOString()
        }, ...savedNotes]);
        setNoteDraft('');
        try {
            window.localStorage.removeItem(legacyStorageKey);
        } catch (error) {
            // The saved-note record is already kept in component state.
        }
        setStatusMessage('Note saved.');
        setActiveSection('saved');
    };

    const saveReminder = () => {
        const text = reminderDraft.trim();
        const dueDate = reminderDueAt ? new Date(reminderDueAt) : null;
        if (!text || !dueDate || Number.isNaN(dueDate.getTime())) {
            setStatusMessage('Add reminder text and a date/time.');
            return;
        }

        persistReminders([{
            id: createWidgetRecordId('reminder'),
            text,
            dueAt: dueDate.toISOString(),
            createdAt: new Date().toISOString(),
            alertedAt: '',
            notificationRead: false,
            completed: false
        }, ...reminders]);
        setReminderDraft('');
        setReminderDueAt('');
        setStatusMessage('Reminder saved. You will be notified one hour before it is due.');
    };

    const removeSavedNote = (noteId) => {
        persistSavedNotes(savedNotes.filter((note) => note.id !== noteId));
    };

    const updateReminderTime = (reminderId, nextValue) => {
        const parsedDate = nextValue ? new Date(nextValue) : null;
        persistReminders(reminders.map((reminder) => (
            reminder.id === reminderId
                ? {
                    ...reminder,
                    dueAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : '',
                    alertedAt: '',
                    notificationRead: false
                }
                : reminder
        )));
        emittedReminderIdsRef.current.delete(reminderId);
    };

    const removeReminder = (reminderId) => {
        persistReminders(reminders.filter((reminder) => reminder.id !== reminderId));
        emittedReminderIdsRef.current.delete(reminderId);
    };

    useEffect(() => {
        const handleNotepadAdd = (event) => {
            const detail = event?.detail || {};
            if (detail.mode && detail.mode !== mode) return;
            if (detail.storageKey && detail.storageKey !== resolvedAssistantStorageKey) return;

            const text = String(detail.text || '').trim();
            if (!text) return;

            if (detail.kind === 'note') {
                const nextNotes = [{
                    id: createWidgetRecordId('note'),
                    text,
                    createdAt: new Date().toISOString()
                }, ...readWidgetSavedNotes(resolvedAssistantStorageKey)];
                persistSavedNotes(nextNotes);
                setActiveSection('saved');
                setStatusMessage('JumpTake AI saved the note.');
                return;
            }

            const dueDate = detail.dueAt ? new Date(detail.dueAt) : null;
            const nextReminder = {
                id: createWidgetRecordId('reminder'),
                text,
                dueAt: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : '',
                createdAt: new Date().toISOString(),
                alertedAt: '',
                notificationRead: false,
                completed: false
            };
            persistReminders([nextReminder, ...readPortalReminders(resolvedAssistantStorageKey)]);
            setActiveSection('reminders');
            setStatusMessage(nextReminder.dueAt
                ? 'JumpTake AI saved the reminder.'
                : 'Reminder saved. Add a date/time to activate its alert.');
        };

        const openReminders = (event) => {
            if (event?.detail?.storageKey && event.detail.storageKey !== resolvedAssistantStorageKey) return;
            setActiveSection('reminders');
        };

        window.addEventListener('jumptake-widget-notepad-add', handleNotepadAdd);
        window.addEventListener('jumptake-widget-notepad-open-reminders', openReminders);
        return () => {
            window.removeEventListener('jumptake-widget-notepad-add', handleNotepadAdd);
            window.removeEventListener('jumptake-widget-notepad-open-reminders', openReminders);
        };
    }, [mode, persistReminders, persistSavedNotes, resolvedAssistantStorageKey]);

    useEffect(() => {
        const checkReminderAlerts = () => {
            const now = Date.now();
            const dueReminders = reminders.filter((reminder) => (
                isPortalReminderDueForAlert(reminder, now)
                && !reminder.alertedAt
                && !emittedReminderIdsRef.current.has(reminder.id)
            ));
            if (!dueReminders.length) return;

            dueReminders.forEach((reminder) => emittedReminderIdsRef.current.add(reminder.id));
            const alertedIds = new Set(dueReminders.map((reminder) => reminder.id));
            const alertedAt = new Date().toISOString();
            persistReminders(reminders.map((reminder) => (
                alertedIds.has(reminder.id) ? { ...reminder, alertedAt, notificationRead: false } : reminder
            )));

            dueReminders.forEach((reminder) => {
                window.dispatchEvent(new CustomEvent(PORTAL_REMINDER_ALERT_EVENT, {
                    detail: { mode, storageKey: resolvedAssistantStorageKey, reminder }
                }));
                if ('Notification' in window && window.Notification.permission === 'granted') {
                    new window.Notification('JumpTake reminder', {
                        body: reminder.text,
                        tag: `jumptake-${reminder.id}`
                    });
                }
            });
        };

        checkReminderAlerts();
        const intervalId = window.setInterval(checkReminderAlerts, 30000);
        return () => window.clearInterval(intervalId);
    }, [mode, persistReminders, reminders, resolvedAssistantStorageKey]);

    const sections = [
        { id: 'new', label: 'New Notes' },
        { id: 'reminders', label: 'Reminders', count: reminders.length },
        { id: 'saved', label: 'Saved Notes', count: savedNotes.length }
    ];

    return (
        <section className="portal-widget portal-widget-notepad" aria-label="Notepad and reminders">
            <header className="portal-widget-header">
                <span>Notepad</span>
                <strong>Notes & reminders</strong>
            </header>
            <div className="portal-widget-notepad-body">
                <nav className="portal-widget-notepad-tabs" aria-label="Notepad sections">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={activeSection === section.id ? 'is-active' : ''}
                            onClick={() => {
                                setActiveSection(section.id);
                                setStatusMessage('');
                            }}
                        >
                            <span>{section.label}</span>
                            {Number(section.count) > 0 && <strong>{section.count}</strong>}
                        </button>
                    ))}
                </nav>

                <div className="portal-widget-notepad-panel">
                    {activeSection === 'new' && (
                        <div className="portal-widget-note-composer">
                            <textarea
                                value={noteDraft}
                                onChange={(event) => setNoteDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                                        event.preventDefault();
                                        saveNewNote();
                                    }
                                }}
                                placeholder="Write a new note..."
                                aria-label="New note"
                            />
                            <button type="button" onClick={saveNewNote}>Save note</button>
                        </div>
                    )}

                    {activeSection === 'reminders' && (
                        <div className="portal-widget-reminders-section">
                            <div className="portal-widget-reminder-composer">
                                <input type="text" value={reminderDraft} onChange={(event) => setReminderDraft(event.target.value)} placeholder="What should I remind you about?" aria-label="Reminder text" />
                                <input type="datetime-local" value={reminderDueAt} min={toDateTimeLocalValue(new Date())} onChange={(event) => setReminderDueAt(event.target.value)} aria-label="Reminder date and time" />
                                <button type="button" onClick={saveReminder}>Save reminder</button>
                            </div>
                            <div className="portal-widget-reminder-list">
                                {reminders.length === 0 ? (
                                    <p className="portal-widget-notepad-empty">No reminders saved.</p>
                                ) : reminders.map((reminder) => (
                                    <article key={reminder.id} className="portal-widget-reminder-item">
                                        <div><strong>{reminder.text}</strong><span>{formatWidgetReminderTime(reminder.dueAt)}</span></div>
                                        <input type="datetime-local" value={toDateTimeLocalValue(reminder.dueAt)} onChange={(event) => updateReminderTime(reminder.id, event.target.value)} aria-label={`Change reminder time for ${reminder.text}`} />
                                        <button type="button" onClick={() => removeReminder(reminder.id)} aria-label={`Delete ${reminder.text}`}>×</button>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === 'saved' && (
                        <div className="portal-widget-saved-note-list">
                            {savedNotes.length === 0 ? (
                                <p className="portal-widget-notepad-empty">No saved notes yet.</p>
                            ) : savedNotes.map((note) => (
                                <article key={note.id} className="portal-widget-saved-note-item">
                                    <div><p>{note.text}</p><time>{new Date(note.createdAt).toLocaleString()}</time></div>
                                    <button type="button" onClick={() => removeSavedNote(note.id)} aria-label="Delete saved note">×</button>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                {statusMessage && <p className="portal-widget-notepad-status" aria-live="polite">{statusMessage}</p>}
            </div>
        </section>
    );
};

const PortalSideWidgets = ({
    mode = 'candidate',
    theme = 'light',
    renderSection,
    previousSection,
    previousSectionTitle,
    chatStorageKey,
    chatContext,
    performanceProps = {},
    profile = {},
    onOpenProfile
}) => {
    const isDesktop = useDesktopSideWidgets();
    const widgetTheme = theme === 'dark' ? 'dark' : 'light';
    const resolvedChatStorageKey = chatStorageKey || `jumptakeAssistantChat:${mode || 'candidate'}:guest`;
    const lastUsedPinStorageKey = `jumptakeSideWidgetPinnedPage:${mode || 'candidate'}`;
    const [reminderPopup, setReminderPopup] = useState(null);
    const [pinnedLastUsedPage, setPinnedLastUsedPage] = useState(() => {
        if (typeof window === 'undefined') return null;

        try {
            const storedPin = JSON.parse(window.localStorage.getItem(lastUsedPinStorageKey) || 'null');
            return storedPin && typeof storedPin.section === 'string' ? storedPin : null;
        } catch (error) {
            return null;
        }
    });
    const displayedLastUsedSection = pinnedLastUsedPage?.section || previousSection;
    const displayedLastUsedTitle = pinnedLastUsedPage?.title || previousSectionTitle || 'JumpTake';
    const isLastUsedPagePinned = Boolean(pinnedLastUsedPage);
    const resolveChatContext = () => {
        const resolvedContext = typeof chatContext === 'function' ? chatContext() : chatContext;
        return {
            ...(resolvedContext && typeof resolvedContext === 'object' ? resolvedContext : {}),
            workspace: resolvedContext?.workspace || readWidgetWorkspaceSnapshot(),
            notepad: {
                ...(resolvedContext?.notepad && typeof resolvedContext.notepad === 'object' ? resolvedContext.notepad : {}),
                content: readWidgetNotepad(resolvedChatStorageKey)
            }
        };
    };

    useEffect(() => {
        const handleReminderAlert = (event) => {
            const detail = event?.detail || {};
            if (detail.mode && detail.mode !== mode) return;
            if (detail.storageKey && detail.storageKey !== resolvedChatStorageKey) return;
            if (!detail.reminder?.text) return;
            setReminderPopup(detail.reminder);
        };

        window.addEventListener(PORTAL_REMINDER_ALERT_EVENT, handleReminderAlert);
        return () => window.removeEventListener(PORTAL_REMINDER_ALERT_EVENT, handleReminderAlert);
    }, [mode, resolvedChatStorageKey]);

    useEffect(() => {
        if (!reminderPopup) return undefined;
        const timeoutId = window.setTimeout(() => setReminderPopup(null), 15000);
        return () => window.clearTimeout(timeoutId);
    }, [reminderPopup]);
    const handleWidgetAssistantAction = (action, payload = {}) => {
        if (typeof window === 'undefined') return;

        window.dispatchEvent(new CustomEvent('jumptake-widget-assistant-action', {
            detail: { mode, action, payload }
        }));
    };
    const toggleLastUsedPagePin = () => {
        setPinnedLastUsedPage((currentPin) => {
            const nextPin = currentPin ? null : (previousSection ? {
                section: previousSection,
                title: previousSectionTitle || 'JumpTake'
            } : currentPin);

            try {
                if (nextPin) {
                    window.localStorage.setItem(lastUsedPinStorageKey, JSON.stringify(nextPin));
                } else {
                    window.localStorage.removeItem(lastUsedPinStorageKey);
                }
            } catch (error) {
                // The in-memory pin still works when browser storage is unavailable.
            }

            return nextPin;
        });
    };

    if (!isDesktop) {
        return null;
    }

    return (
        <>
            <aside className={`portal-side-widgets portal-side-widgets-left portal-side-widgets-theme-${widgetTheme}`}>
                <ProfileWidget profile={profile} onOpenProfile={onOpenProfile} />
                <section className="portal-widget portal-widget-last-used">
                    <header className="portal-widget-header">
                        <span>Last used page</span>
                        <div className="portal-widget-last-used-header-actions">
                            <strong>{displayedLastUsedTitle}</strong>
                            <button
                                type="button"
                                className={`portal-widget-pin-button ${isLastUsedPagePinned ? 'is-pinned' : ''}`}
                                onClick={toggleLastUsedPagePin}
                                disabled={!isLastUsedPagePinned && !previousSection}
                                aria-pressed={isLastUsedPagePinned}
                                aria-label={isLastUsedPagePinned ? 'Unpin last used page' : 'Pin last used page'}
                                title={isLastUsedPagePinned ? 'Unpin page' : 'Pin page'}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9 3h6l-1 5 3 3v2h-4v7l-1 1-1-1v-7H7v-2l3-3-1-5Z" />
                                </svg>
                                <span>{isLastUsedPagePinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                        </div>
                    </header>
                    <LastUsedPageWidget
                        renderSection={renderSection}
                        previousSection={displayedLastUsedSection}
                        previousSectionTitle={displayedLastUsedTitle}
                    />
                </section>
                <section className="portal-widget portal-widget-performance">
                    <header className="portal-widget-header"><span>Performance</span><strong>Progress Check</strong></header>
                    <PerformanceWidget {...performanceProps} mode={mode} />
                </section>
            </aside>
            <aside className={`portal-side-widgets portal-side-widgets-right portal-side-widgets-theme-${widgetTheme}`}>
                <NotepadWidget mode={mode} storageKey={chatStorageKey} />
                <section className="portal-widget portal-widget-chat">
                    <header className="portal-widget-header"><span>JumpTake AI</span><strong>Ask anything</strong></header>
                    <div className="portal-widget-chat-body">
                        <AssistantChat
                            className="portal-widget-assistant-chat"
                            storageKey={chatStorageKey}
                            context={resolveChatContext}
                            onAction={handleWidgetAssistantAction}
                        />
                    </div>
                </section>
            </aside>
            {reminderPopup && (
                <div className="portal-reminder-popup" role="alert" aria-live="assertive">
                    <div>
                        <span>Reminder due within one hour</span>
                        <strong>{reminderPopup.text}</strong>
                        <time>{formatWidgetReminderTime(reminderPopup.dueAt)}</time>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('jumptake-widget-notepad-open-reminders', {
                                detail: { storageKey: resolvedChatStorageKey }
                            }));
                            setReminderPopup(null);
                        }}
                    >
                        View
                    </button>
                    <button type="button" className="portal-reminder-popup-close" onClick={() => setReminderPopup(null)} aria-label="Dismiss reminder">×</button>
                </div>
            )}
        </>
    );
};

export default PortalSideWidgets;
