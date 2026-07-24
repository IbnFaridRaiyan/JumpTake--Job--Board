import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicLandingNav from './PublicLandingNav';
import ProfileAvatar from './ProfileAvatar';
import defaultJobPostAvatar from './media/default-job-post-avatar.png';
import logo from './media/logo4.png';
import lightThemeLogo from './media/jumptake-logo-main-light.png';
import { apiUrl } from '../utils/apiUrl';
import '../styles/public-home.css';
import '../styles/public-home-light.css';

const PUBLIC_HOME_THEME_KEY = 'jumptakePublicHomeTheme';

const getInitialPublicHomeTheme = () => {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    const previewTheme = new URLSearchParams(window.location.search).get('theme');
    if (previewTheme === 'light' || previewTheme === 'dark') {
        return previewTheme;
    }

    try {
        return localStorage.getItem(PUBLIC_HOME_THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch (error) {
        return 'dark';
    }
};

const EDITOR_TEMPLATES = {
    resume: `YOUR NAME
City, Country · email@example.com · +00 000 000 000

PROFESSIONAL SUMMARY
Write a focused two-to-three sentence summary of your experience, strengths, and the value you bring.

EXPERIENCE
Role Title — Company
Month Year – Present
• Describe a measurable result you delivered.
• Show the skill you used and the outcome it created.

EDUCATION
Qualification — Institution

SKILLS
Add your most relevant technical and professional skills.`,
    cover: `Dear Hiring Team,

I am writing to apply for the role at your organisation. My experience in [your field] and strength in [relevant skill] would allow me to contribute quickly and thoughtfully.

In my recent work, I [describe a relevant achievement]. This experience strengthened my ability to [relevant capability], while delivering [result].

I would welcome the opportunity to discuss how my background can support your team.

Kind regards,
Your Name`,
    description: `ROLE TITLE

About the opportunity
Introduce the team, mission, and impact of this role.

What you will do
• Own meaningful work from idea to delivery.
• Collaborate with colleagues across the organisation.
• Improve outcomes for customers and the wider team.

What you will bring
• Relevant experience and practical judgement.
• Clear communication and a collaborative mindset.
• Curiosity, ownership, and care for quality.

What we offer
Add salary, location, flexibility, and benefits.`
};

const Icon = ({ name, className = '' }) => {
    const paths = {
        search: (
            <>
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.25 4.25" />
            </>
        ),
        arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
        spark: (
            <>
                <path d="M12 2.5c.7 4.1 2.9 6.3 7 7-4.1.7-6.3 2.9-7 7-.7-4.1-2.9-6.3-7-7 4.1-.7 6.3-2.9 7-7Z" />
                <path d="M19 15.5c.25 1.45 1.05 2.25 2.5 2.5-1.45.25-2.25 1.05-2.5 2.5-.25-1.45-1.05-2.25-2.5-2.5 1.45-.25 2.25-1.05 2.5-2.5Z" />
            </>
        ),
        document: (
            <>
                <path d="M6.5 3.5h7l4 4v13h-11z" />
                <path d="M13.5 3.5v4h4M9.5 12h5M9.5 16h5" />
            </>
        ),
        people: (
            <>
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.25" />
                <path d="M3.5 20c.35-4 2.25-6 5.5-6s5.15 2 5.5 6M14.5 15c3-.4 5 .95 6 4" />
            </>
        ),
        briefcase: (
            <>
                <rect x="3" y="7" width="18" height="13" rx="3" />
                <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12h18M10 12v2h4v-2" />
            </>
        ),
        news: (
            <>
                <path d="M4 4h14v16H6a2 2 0 0 1-2-2z" />
                <path d="M18 8h2v10a2 2 0 0 1-2 2M7.5 8h7M7.5 12h7M7.5 16h4" />
            </>
        ),
        message: (
            <>
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.7A2.5 2.5 0 0 1 4 13.8Z" />
                <path d="M8 8h8M8 12h5" />
            </>
        ),
        heart: <path d="M20.8 5.8c-1.9-2-5.2-1.4-6.8.8C12.4 4.4 9.1 3.8 7.2 5.8c-2.2 2.3-1.5 6 1 8.2l5.8 5 5.8-5c2.5-2.2 3.2-5.9 1-8.2Z" />,
        comment: (
            <>
                <path d="M4 5h16v11H9l-5 4z" />
                <path d="M8 9h8M8 12h5" />
            </>
        ),
        share: (
            <>
                <circle cx="18" cy="5" r="2.5" />
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="19" r="2.5" />
                <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
            </>
        ),
        check: <path d="m5 12 4 4L19 6" />,
        copy: (
            <>
                <rect x="8" y="8" width="11" height="12" rx="2" />
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
            </>
        ),
        download: (
            <>
                <path d="M12 3v12m-4-4 4 4 4-4" />
                <path d="M5 19h14" />
            </>
        ),
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
            </>
        ),
        moon: (
            <path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z" />
        )
    };

    return (
        <svg className={`jt-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            {paths[name] || paths.spark}
        </svg>
    );
};

const formatDate = (value) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime())
        ? 'Recently'
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const reactionCount = (reactions) => {
    if (!reactions || typeof reactions !== 'object') {
        return 0;
    }

    return Object.values(reactions).reduce((total, value) => {
        if (Array.isArray(value)) {
            return total + value.length;
        }
        const numericValue = Number(value);
        return total + (Number.isFinite(numericValue) ? numericValue : 0);
    }, 0);
};

const openAuth = (mode = 'login') => {
    if (typeof window === 'undefined') {
        return;
    }

    const nextHash = `#${mode}`;
    if (window.location.hash === nextHash) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
    }
    window.location.hash = nextHash;
};

const Landing = () => {
    const [homeTheme, setHomeTheme] = useState(getInitialPublicHomeTheme);
    const [jobs, setJobs] = useState([]);
    const [workNews, setWorkNews] = useState([]);
    const [contentLoading, setContentLoading] = useState(true);
    const [contentError, setContentError] = useState('');
    const [jobSearch, setJobSearch] = useState('');
    const [jobType, setJobType] = useState('All roles');
    const [selectedJob, setSelectedJob] = useState(null);
    const [gateMessage, setGateMessage] = useState('');
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantMessages, setAssistantMessages] = useState([
        {
            role: 'assistant',
            text: 'Hi — I’m JumpTake AI. Ask me to find your next direction, improve a resume, or explain how the platform works.'
        }
    ]);
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantPopupOpen, setAssistantPopupOpen] = useState(false);
    const [editorMode, setEditorMode] = useState('resume');
    const [editorText, setEditorText] = useState(EDITOR_TEMPLATES.resume);
    const [editorLoading, setEditorLoading] = useState(false);
    const [editorTyping, setEditorTyping] = useState(false);
    const [editorTypingProgress, setEditorTypingProgress] = useState(0);
    const [editorPopupOpen, setEditorPopupOpen] = useState(false);
    const [editorNotice, setEditorNotice] = useState('Your draft stays editable in this browser.');
    const assistantInputRef = useRef(null);
    const assistantMessagesRef = useRef(null);
    const editorTypingTimerRef = useRef(null);
    const activeLogo = homeTheme === 'light' ? lightThemeLogo : logo;
    const editorDocumentLabel = editorMode === 'cover'
        ? 'Cover letter'
        : editorMode === 'description'
            ? 'Job description'
            : 'Resume';

    useEffect(() => {
        try {
            localStorage.setItem(PUBLIC_HOME_THEME_KEY, homeTheme);
        } catch (error) {
            // The selected theme still applies for this visit when storage is unavailable.
        }

        document.documentElement.setAttribute('data-public-home-theme', homeTheme);
        document.body.setAttribute('data-public-home-theme', homeTheme);

        return () => {
            document.documentElement.removeAttribute('data-public-home-theme');
            document.body.removeAttribute('data-public-home-theme');
        };
    }, [homeTheme]);

    useEffect(() => {
        let cancelled = false;

        const fetchJson = async (path) => {
            const response = await fetch(apiUrl(path));
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                throw new Error('Live content is warming up.');
            }
            return response.json();
        };

        const loadPublicContent = async () => {
            setContentLoading(true);
            setContentError('');

            const [jobResult, newsResult] = await Promise.allSettled([
                fetchJson('/api/jobs'),
                fetchJson('/api/feed-posts?type=work-news')
            ]);

            if (cancelled) {
                return;
            }

            const nextJobs = jobResult.status === 'fulfilled' && Array.isArray(jobResult.value)
                ? jobResult.value.filter((job) => job.active !== false)
                : [];
            const nextNews = newsResult.status === 'fulfilled' && Array.isArray(newsResult.value)
                ? newsResult.value.filter((post) => !['friends', 'only-me'].includes(post.audience))
                : [];

            setJobs(nextJobs);
            setWorkNews(nextNews);
            if (jobResult.status === 'rejected' && newsResult.status === 'rejected') {
                setContentError('Live jobs and Work News are reconnecting. Please check again shortly.');
            }
            setContentLoading(false);
        };

        loadPublicContent();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const revealItems = document.querySelectorAll('.jt-reveal');
        if (!('IntersectionObserver' in window)) {
            revealItems.forEach((item) => item.classList.add('is-visible'));
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealItems.forEach((item) => observer.observe(item));
        return () => observer.disconnect();
    }, [jobs.length, workNews.length]);

    useEffect(() => {
        if (!selectedJob) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setSelectedJob(null);
            }
        };
        window.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [selectedJob]);

    useEffect(() => {
        const messages = assistantMessagesRef.current;
        if (!messages) {
            return undefined;
        }

        const frame = window.requestAnimationFrame(() => {
            messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [assistantMessages, assistantLoading, assistantPopupOpen]);

    useEffect(() => {
        if (!assistantPopupOpen && !editorPopupOpen) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('jt-public-ai-modal-open');

        const closeOnEscape = (event) => {
            if (event.key !== 'Escape') {
                return;
            }
            if (editorPopupOpen) {
                setEditorPopupOpen(false);
                return;
            }
            setAssistantPopupOpen(false);
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.classList.remove('jt-public-ai-modal-open');
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [assistantPopupOpen, editorPopupOpen]);

    useEffect(() => () => {
        if (editorTypingTimerRef.current) {
            window.clearInterval(editorTypingTimerRef.current);
        }
    }, []);

    const jobTypes = useMemo(() => (
        ['All roles', ...new Set(jobs.map((job) => job.jobType).filter(Boolean))]
    ), [jobs]);

    const visibleJobs = useMemo(() => {
        const normalizedSearch = jobSearch.trim().toLowerCase();
        return jobs.filter((job) => {
            const matchesType = jobType === 'All roles' || job.jobType === jobType;
            const haystack = [
                job.title,
                job.company?.name,
                job.location,
                job.description,
                ...(Array.isArray(job.skills) ? job.skills : [])
            ].join(' ').toLowerCase();
            return matchesType && (!normalizedSearch || haystack.includes(normalizedSearch));
        }).slice(0, 8);
    }, [jobSearch, jobType, jobs]);

    const requireAccount = (message) => {
        setGateMessage(message);
        openAuth('login');
    };

    const askAssistant = async (questionOverride) => {
        const question = String(questionOverride || assistantInput).trim();
        if (!question || assistantLoading) {
            return;
        }

        const history = assistantMessages.slice(-8);
        setAssistantPopupOpen(true);
        setAssistantMessages((messages) => [...messages, { role: 'user', text: question }]);
        setAssistantInput('');
        setAssistantLoading(true);

        try {
            const response = await fetch(apiUrl('/api/public-assistant'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    history,
                    context: { surface: 'public-homepage' }
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'JumpTake AI is unavailable right now.');
            }
            setAssistantMessages((messages) => [
                ...messages,
                { role: 'assistant', text: data.answer || 'Let’s try that another way.' }
            ]);
        } catch (error) {
            setAssistantMessages((messages) => [
                ...messages,
                { role: 'assistant', text: error.message || 'JumpTake AI is reconnecting.' }
            ]);
        } finally {
            setAssistantLoading(false);
        }
    };

    const handleAssistantSubmit = (event) => {
        event.preventDefault();
        askAssistant();
    };

    const changeEditorMode = (nextMode) => {
        setEditorMode(nextMode);
        setEditorText(EDITOR_TEMPLATES[nextMode]);
        setEditorTypingProgress(0);
        setEditorNotice('Starter template loaded. Make it yours or ask AI to improve it.');
    };

    const typeDocumentDraft = (nextDraft) => new Promise((resolve) => {
        const draft = String(nextDraft || '');
        if (editorTypingTimerRef.current) {
            window.clearInterval(editorTypingTimerRef.current);
        }

        if (!draft) {
            setEditorTyping(false);
            setEditorTypingProgress(100);
            resolve();
            return;
        }

        const chunkSize = Math.max(1, Math.ceil(draft.length / 150));
        let cursor = 0;
        setEditorText('');
        setEditorTyping(true);
        setEditorTypingProgress(0);

        const writeNextChunk = () => {
            cursor = Math.min(draft.length, cursor + chunkSize);
            setEditorText(draft.slice(0, cursor));
            setEditorTypingProgress(Math.round((cursor / draft.length) * 100));

            if (cursor >= draft.length) {
                window.clearInterval(editorTypingTimerRef.current);
                editorTypingTimerRef.current = null;
                setEditorTyping(false);
                resolve();
            }
        };

        editorTypingTimerRef.current = window.setInterval(writeNextChunk, 18);
        writeNextChunk();
    });

    const improveDocument = async () => {
        if (editorLoading) {
            return;
        }

        setEditorPopupOpen(true);
        setEditorLoading(true);
        setEditorTyping(false);
        setEditorTypingProgress(0);
        setEditorNotice('JumpTake AI is shaping your draft…');
        const prompt = `Rewrite the following ${editorDocumentLabel.toLowerCase()} into a polished, modern, editable draft. Keep factual placeholders when facts are missing and return only the finished document.\n\n${editorText}`;

        try {
            const response = await fetch(apiUrl('/api/public-assistant'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    context: {
                        assistantTask: 'polish-document',
                        documentType: editorMode,
                        portalMode: editorMode === 'description' ? 'employer' : 'candidate',
                        activeSection: editorMode === 'resume' ? 'resume-playground' : 'create-document',
                        workspace: {
                            mode: editorMode,
                            title: editorDocumentLabel,
                            currentText: editorText
                        }
                    }
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'AI editing is unavailable right now.');
            }
            await typeDocumentDraft(data.answer || editorText);
            setEditorNotice('AI polish complete. Review the details before using your draft.');
        } catch (error) {
            setEditorNotice(error.message || 'AI editing is reconnecting. Your draft is safe.');
        } finally {
            setEditorLoading(false);
        }
    };

    const copyDocument = async () => {
        try {
            await navigator.clipboard.writeText(editorText);
            setEditorNotice('Copied to your clipboard.');
        } catch (error) {
            setEditorNotice('Select the text and copy it from the editor.');
        }
    };

    const downloadDocument = () => {
        const blob = new Blob([editorText], { type: 'text/plain;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `jumptake-${editorMode}-draft.txt`;
        anchor.click();
        URL.revokeObjectURL(href);
        setEditorNotice('Draft downloaded.');
    };

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className={`jt-public-home is-${homeTheme}`} data-public-theme={homeTheme}>
            <PublicLandingNav />

            <header className="jt-home-header">
                <a className="jt-brand" href="#top" aria-label="JumpTake home">
                    <img src={activeLogo} alt="JumpTake" />
                </a>
                <nav className="jt-header-links" aria-label="Homepage sections">
                    <button type="button" onClick={() => scrollTo('jobs')}>Jobs</button>
                    <button type="button" onClick={() => scrollTo('work-news')}>Work News</button>
                    <button type="button" onClick={() => scrollTo('ai-guide')}>Ask AI</button>
                    <button type="button" onClick={() => scrollTo('documents')}>Create</button>
                </nav>
                <div className="jt-header-actions">
                    <button
                        type="button"
                        className="jt-theme-toggle"
                        onClick={() => setHomeTheme((theme) => theme === 'dark' ? 'light' : 'dark')}
                        aria-label={`Switch to ${homeTheme === 'dark' ? 'light' : 'dark'} mode`}
                        title={`Switch to ${homeTheme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        <Icon name={homeTheme === 'dark' ? 'sun' : 'moon'} />
                    </button>
                    <button type="button" className="jt-text-button" onClick={() => openAuth('login')}>Log in</button>
                    <button type="button" className="jt-pill-button" onClick={() => openAuth('register')}>
                        Join JumpTake
                        <Icon name="arrow" />
                    </button>
                </div>
            </header>

            <main id="top">
                <section className="jt-hero">
                    <div className="jt-hero-orb jt-hero-orb-one" />
                    <div className="jt-hero-orb jt-hero-orb-two" />
                    <div className="jt-hero-grid" aria-hidden="true" />

                    <div className="jt-hero-copy jt-reveal">
                        <div className="jt-eyebrow">
                            <span className="jt-live-dot" />
                            The connected career platform
                        </div>
                        <h1>
                            Work moves fast.
                            <span>Take your next jump.</span>
                        </h1>
                        <p>
                            Discover live roles, build stronger applications with AI, follow what companies are doing,
                            and connect with people who can move your career forward.
                        </p>
                        <div className="jt-hero-actions">
                            <button type="button" className="jt-primary-button" onClick={() => scrollTo('jobs')}>
                                Explore live jobs
                                <Icon name="arrow" />
                            </button>
                            <button type="button" className="jt-secondary-button" onClick={() => scrollTo('documents')}>
                                <Icon name="spark" />
                                Build with AI
                            </button>
                        </div>
                        <div className="jt-hero-proof">
                            <div className="jt-avatar-stack" aria-hidden="true">
                                <span>RM</span>
                                <span>AK</span>
                                <span>JS</span>
                                <span>+</span>
                            </div>
                            <p><strong>One growing network.</strong> Candidates, teams, opportunities, and conversations together.</p>
                        </div>
                    </div>

                    <div className="jt-hero-visual jt-reveal">
                        <div className="jt-visual-radar">
                            <span />
                            <span />
                            <span />
                            <div className="jt-radar-core"><Icon name="briefcase" /></div>
                        </div>

                        <article className="jt-floating-card jt-floating-job">
                            <div className="jt-mini-logo"><Icon name="briefcase" /></div>
                            <div>
                                <span>Role matched</span>
                                <strong>{jobs[0]?.title || 'Product Designer'}</strong>
                                <small>{jobs[0]?.company?.name || 'A growing team'} · {jobs[0]?.location || 'Flexible'}</small>
                            </div>
                            <b>92%</b>
                        </article>

                        <article className="jt-floating-card jt-floating-resume">
                            <div className="jt-mini-logo is-purple"><Icon name="spark" /></div>
                            <div>
                                <span>Resume AI</span>
                                <strong>Sharper story. Clearer impact.</strong>
                                <div className="jt-progress"><i /></div>
                            </div>
                        </article>

                        <article className="jt-floating-card jt-floating-connect">
                            <div className="jt-mini-logo is-orange"><Icon name="people" /></div>
                            <div>
                                <span>New connection</span>
                                <strong>People in your field</strong>
                                <small>Message, learn, grow</small>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="jt-signal-strip" aria-label="JumpTake platform features">
                    <div className="jt-signal-track">
                        {['Resume AI', 'Live Job Feed', 'Work News', 'Talent Network', 'Smart Assessments', 'Direct Messages', 'Document Studio', 'Career Analytics'].map((item, index) => (
                            <span key={`${item}-${index}`}>
                                <Icon name={index % 3 === 0 ? 'spark' : index % 3 === 1 ? 'briefcase' : 'people'} />
                                {item}
                            </span>
                        ))}
                        {['Resume AI', 'Live Job Feed', 'Work News', 'Talent Network', 'Smart Assessments', 'Direct Messages', 'Document Studio', 'Career Analytics'].map((item, index) => (
                            <span key={`${item}-repeat-${index}`} aria-hidden="true">
                                <Icon name={index % 3 === 0 ? 'spark' : index % 3 === 1 ? 'briefcase' : 'people'} />
                                {item}
                            </span>
                        ))}
                    </div>
                </section>

                <section className="jt-section jt-platform-section">
                    <div className="jt-section-heading jt-reveal">
                        <div>
                            <span className="jt-kicker">More than a job board</span>
                            <h2>Everything around the opportunity, in one place.</h2>
                        </div>
                        <p>JumpTake combines discovery, creation, networking, and hiring tools so every next step feels connected.</p>
                    </div>

                    <div className="jt-feature-grid">
                        <article className="jt-feature-card is-large jt-reveal">
                            <div className="jt-feature-icon"><Icon name="spark" /></div>
                            <span>AI career toolkit</span>
                            <h3>Turn rough ideas into application-ready work.</h3>
                            <p>Create resumes, cover letters, professional documents, stories, and assessments with an AI guide built into the workflow.</p>
                            <button type="button" onClick={() => scrollTo('documents')}>Try the document studio <Icon name="arrow" /></button>
                            <div className="jt-feature-art jt-feature-art-document">
                                <i />
                                <i />
                                <i />
                                <b>AI</b>
                            </div>
                        </article>

                        <article className="jt-feature-card jt-reveal">
                            <div className="jt-feature-icon is-blue"><Icon name="briefcase" /></div>
                            <span>Fresh opportunities</span>
                            <h3>{jobs.length ? `${jobs.length}+ live roles to explore now.` : 'Live roles from growing teams.'}</h3>
                            <p>Search by role, skill, company, type, or location before you create an account.</p>
                        </article>

                        <article className="jt-feature-card jt-reveal">
                            <div className="jt-feature-icon is-orange"><Icon name="people" /></div>
                            <span>People, not profiles</span>
                            <h3>Connect around shared work and interests.</h3>
                            <p>Discover candidates, build a professional circle, message directly, and follow the stories behind the work.</p>
                        </article>

                        <article className="jt-feature-card is-wide jt-reveal">
                            <div className="jt-feature-icon is-purple"><Icon name="news" /></div>
                            <div>
                                <span>Work News</span>
                                <h3>Follow launches, hiring updates, milestones, and ideas from the network.</h3>
                                <p>Public stories are open to everyone. Join to react, comment, share, and add your own voice.</p>
                            </div>
                            <button type="button" onClick={() => scrollTo('work-news')}>See what’s happening <Icon name="arrow" /></button>
                        </article>
                    </div>
                </section>

                <section className="jt-section jt-jobs-section" id="jobs">
                    <div className="jt-section-heading jt-reveal">
                        <div>
                            <span className="jt-kicker">Public job feed</span>
                            <h2>Find work worth moving for.</h2>
                        </div>
                        <div className="jt-heading-side">
                            <span className="jt-live-count"><i /> {jobs.length} live roles</span>
                            <p>Browse every public role freely. Create an account when you are ready to save, react, apply, or start a conversation.</p>
                        </div>
                    </div>

                    <div className="jt-job-toolbar jt-reveal">
                        <label className="jt-search-field">
                            <Icon name="search" />
                            <input
                                type="search"
                                value={jobSearch}
                                onChange={(event) => setJobSearch(event.target.value)}
                                placeholder="Search roles, skills, companies, or locations"
                            />
                        </label>
                        <label className="jt-select-field">
                            <span>Type</span>
                            <select value={jobType} onChange={(event) => setJobType(event.target.value)}>
                                {jobTypes.map((type) => <option key={type}>{type}</option>)}
                            </select>
                        </label>
                    </div>

                    {contentError ? <p className="jt-content-message">{contentError}</p> : null}

                    <div className="jt-job-grid">
                        {contentLoading
                            ? Array.from({ length: 4 }).map((_, index) => <div className="jt-job-card jt-skeleton" key={index} />)
                            : visibleJobs.map((job) => (
                                <article className="jt-job-card" key={job._id}>
                                    <div className="jt-job-card-top">
                                        <ProfileAvatar
                                            imageSrc={job.company?.logo || defaultJobPostAvatar}
                                            name={job.company?.name || job.title}
                                            className="jt-company-avatar"
                                            imageClassName="profile-avatar-image"
                                            alt={`${job.company?.name || 'Company'} logo`}
                                        />
                                        <span className="jt-job-type">{job.jobType || 'Full-time'}</span>
                                    </div>
                                    <div className="jt-job-company">{job.company?.name || 'JumpTake company'}</div>
                                    <h3>{job.title}</h3>
                                    <div className="jt-job-meta">
                                        <span>{job.location || 'Location flexible'}</span>
                                        <span>{job.salary || 'Salary shared during process'}</span>
                                    </div>
                                    <p>{job.description}</p>
                                    <div className="jt-job-skills">
                                        {(Array.isArray(job.skills) ? job.skills : []).slice(0, 4).map((skill) => (
                                            <span key={`${job._id}-${skill}`}>{skill}</span>
                                        ))}
                                    </div>
                                    <div className="jt-job-social-actions">
                                        <button type="button" onClick={() => requireAccount('Log in to like this job post.')}>
                                            <Icon name="heart" />
                                            Like
                                        </button>
                                        <button type="button" onClick={() => requireAccount('Log in to comment on this job post.')}>
                                            <Icon name="comment" />
                                            Comment
                                        </button>
                                        <button type="button" onClick={() => requireAccount('Log in to share this job with your network.')}>
                                            <Icon name="share" />
                                            Share
                                        </button>
                                    </div>
                                    <div className="jt-job-card-footer">
                                        <span>{formatDate(job.createdAt)}</span>
                                        <button type="button" onClick={() => setSelectedJob(job)}>
                                            View role
                                            <Icon name="arrow" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                    </div>

                    {!contentLoading && !visibleJobs.length ? (
                        <div className="jt-empty-state">
                            <Icon name="search" />
                            <h3>No exact matches yet</h3>
                            <p>Try a wider search or choose another role type.</p>
                        </div>
                    ) : null}

                    <div className="jt-section-cta">
                        <p><strong>Want the feed to know you?</strong> Join to unlock recommendations, applications, saves, and job invitations.</p>
                        <button type="button" className="jt-primary-button" onClick={() => openAuth('register')}>
                            Create your profile
                            <Icon name="arrow" />
                        </button>
                    </div>
                </section>

                <section className="jt-section jt-news-section" id="work-news">
                    <div className="jt-section-heading jt-reveal">
                        <div>
                            <span className="jt-kicker">Work News</span>
                            <h2>The network is building in public.</h2>
                        </div>
                        <div className="jt-heading-side">
                            <span className="jt-live-count is-news"><i /> {workNews.length} public updates</span>
                            <p>See company updates, team moments, launches, opportunities, and industry ideas. Reading is open; joining the conversation needs an account.</p>
                        </div>
                    </div>

                    <div className="jt-news-layout">
                        <article className="jt-news-intro-card jt-reveal">
                            <div className="jt-news-orbit">
                                <Icon name="news" />
                                <span />
                                <span />
                            </div>
                            <span>Made for work that is moving</span>
                            <h3>Not another noisy social feed.</h3>
                            <p>Work News keeps professional updates close to jobs, people, and the action they inspire.</p>
                            <button type="button" onClick={() => openAuth('register')}>Share your first update <Icon name="arrow" /></button>
                        </article>

                        <div className="jt-news-feed">
                            {contentLoading
                                ? Array.from({ length: 3 }).map((_, index) => <div className="jt-news-card jt-skeleton" key={index} />)
                                : workNews.slice(0, 5).map((post) => (
                                    <article className="jt-news-card" key={post._id || post.id}>
                                        <div className="jt-news-author">
                                            <ProfileAvatar
                                                imageSrc={post.authorAvatar}
                                                name={post.authorName || 'JumpTake member'}
                                                className="jt-news-avatar"
                                                imageClassName="profile-avatar-image"
                                                alt={`${post.authorName || 'JumpTake member'} profile`}
                                            />
                                            <div>
                                                <strong>{post.authorName || 'JumpTake member'}</strong>
                                                <span>{post.authorType === 'employer' ? 'Company update' : 'Talent story'} · {formatDate(post.createdAt)}</span>
                                            </div>
                                            <b>Work News</b>
                                        </div>
                                        <p>{post.body}</p>
                                        {post.media?.dataUrl && post.media?.type === 'image' ? (
                                            <img className="jt-news-media" src={post.media.dataUrl} alt={post.media.name || 'Work News attachment'} />
                                        ) : null}
                                        <div className="jt-news-metrics">
                                            <span>{reactionCount(post.reactions)} reactions</span>
                                            <span>{Array.isArray(post.comments) ? post.comments.length : 0} comments</span>
                                            <span>{Number(post.reach || 0)} reach</span>
                                        </div>
                                        <div className="jt-social-actions">
                                            <button type="button" onClick={() => requireAccount('Log in to react to Work News.')}>
                                                <Icon name="heart" /> Like
                                            </button>
                                            <button type="button" onClick={() => requireAccount('Log in to join the conversation.')}>
                                                <Icon name="comment" /> Comment
                                            </button>
                                            <button type="button" onClick={() => requireAccount('Log in to share this update with your network.')}>
                                                <Icon name="share" /> Share
                                            </button>
                                        </div>
                                    </article>
                                ))}

                            {!contentLoading && !workNews.length ? (
                                <div className="jt-empty-state is-dark">
                                    <Icon name="news" />
                                    <h3>The next update starts here</h3>
                                    <p>Join JumpTake and be the first to share what your team is building.</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section
                    className={`jt-section jt-ai-section${assistantPopupOpen ? ' is-conversation-open' : ''}`}
                    id="ai-guide"
                >
                    {assistantPopupOpen ? (
                        <button
                            type="button"
                            className="jt-ai-conversation-scrim"
                            onClick={() => setAssistantPopupOpen(false)}
                            aria-label="Close JumpTake AI conversation"
                        />
                    ) : null}
                    <div className="jt-ai-copy jt-reveal">
                        <span className="jt-kicker">JumpTake AI</span>
                        <h2>A career co-pilot that knows where you are going.</h2>
                        <p>Ask about the platform, job searching, resumes, applications, interviews, hiring, or the next practical move. Start with a real question.</p>
                        <div className="jt-ai-prompt-list">
                            {[
                                'How can I make my resume stronger?',
                                'Show me how JumpTake works',
                                'What should I prepare for an interview?'
                            ].map((prompt) => (
                                <button type="button" key={prompt} onClick={() => askAssistant(prompt)}>
                                    <Icon name="spark" />
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div
                        className={`jt-chat-shell jt-reveal${assistantPopupOpen ? ' is-popout' : ''}`}
                        role={assistantPopupOpen ? 'dialog' : undefined}
                        aria-modal={assistantPopupOpen ? 'true' : undefined}
                        aria-label={assistantPopupOpen ? 'JumpTake AI conversation' : undefined}
                    >
                        <div className="jt-chat-header">
                            <div className="jt-chat-ai-logo"><Icon name="spark" /></div>
                            <div>
                                <strong>JumpTake AI</strong>
                                <span><i /> Online and ready</span>
                            </div>
                            {assistantPopupOpen ? (
                                <button
                                    type="button"
                                    className="jt-chat-popout-close"
                                    onClick={() => setAssistantPopupOpen(false)}
                                    aria-label="Close JumpTake AI conversation"
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            ) : null}
                        </div>
                        <div ref={assistantMessagesRef} className="jt-chat-messages" aria-live="polite">
                            {assistantMessages.map((message, index) => (
                                <div className={`jt-chat-message is-${message.role}`} key={`${message.role}-${index}`}>
                                    {message.text}
                                </div>
                            ))}
                            {assistantLoading ? (
                                <div className="jt-chat-message is-assistant is-typing"><i /><i /><i /></div>
                            ) : null}
                        </div>
                        <form className="jt-chat-form" onSubmit={handleAssistantSubmit}>
                            <Icon name="search" />
                            <input
                                ref={assistantInputRef}
                                value={assistantInput}
                                onChange={(event) => setAssistantInput(event.target.value)}
                                placeholder="Ask about jobs, resumes, hiring, or JumpTake…"
                            />
                            <button type="submit" disabled={!assistantInput.trim() || assistantLoading} aria-label="Send message">
                                <Icon name="arrow" />
                            </button>
                        </form>
                    </div>
                </section>

                <section className="jt-section jt-document-section" id="documents">
                    <div className="jt-section-heading jt-reveal">
                        <div>
                            <span className="jt-kicker">Public document studio</span>
                            <h2>Start the page. Let AI sharpen the story.</h2>
                        </div>
                        <p>Try a practical editor for resumes, cover letters, and job descriptions. Your full JumpTake workspace adds saved documents and profile-aware creation.</p>
                    </div>

                    <div className="jt-editor-shell jt-reveal">
                        <aside className="jt-editor-sidebar">
                            <div className="jt-editor-brand">
                                <div><Icon name="document" /></div>
                                <span>Document Studio<small>Draft workspace</small></span>
                            </div>
                            <p>Start with</p>
                            {[
                                { id: 'resume', label: 'Resume', icon: 'document' },
                                { id: 'cover', label: 'Cover letter', icon: 'message' },
                                { id: 'description', label: 'Job description', icon: 'briefcase' }
                            ].map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={editorMode === item.id ? 'is-active' : ''}
                                    onClick={() => changeEditorMode(item.id)}
                                    disabled={editorLoading}
                                >
                                    <Icon name={item.icon} />
                                    {item.label}
                                </button>
                            ))}
                            <div className="jt-editor-side-note">
                                <Icon name="spark" />
                                <strong>AI works with your draft</strong>
                                <span>It restructures and polishes what is already on the page.</span>
                            </div>
                        </aside>

                        <div className="jt-editor-main">
                            <div className="jt-editor-toolbar">
                                <div>
                                    <span className="jt-window-dot" />
                                    <span className="jt-window-dot" />
                                    <span className="jt-window-dot" />
                                </div>
                                <strong>{editorDocumentLabel} draft</strong>
                                <div className="jt-editor-tools">
                                    <button type="button" onClick={copyDocument} title="Copy draft"><Icon name="copy" /></button>
                                    <button type="button" onClick={downloadDocument} title="Download draft"><Icon name="download" /></button>
                                </div>
                            </div>
                            <textarea
                                value={editorText}
                                onChange={(event) => setEditorText(event.target.value)}
                                aria-label="Editable document draft"
                                spellCheck="true"
                            />
                            <div className="jt-editor-footer">
                                <span>{editorNotice}</span>
                                <button type="button" className="jt-ai-edit-button" onClick={improveDocument} disabled={editorLoading}>
                                    <Icon name="spark" />
                                    {editorLoading ? 'Polishing…' : 'Polish with AI'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {editorPopupOpen ? (
                    <div
                        className="jt-ai-editor-overlay"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                setEditorPopupOpen(false);
                            }
                        }}
                    >
                        <section
                            className="jt-ai-editor-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="jt-ai-editor-title"
                            aria-busy={editorLoading}
                        >
                            <header className="jt-ai-editor-dialog-header">
                                <div className="jt-ai-editor-dialog-brand">
                                    <span><Icon name="spark" /></span>
                                    <div>
                                        <small>JumpTake AI editor</small>
                                        <h2 id="jt-ai-editor-title">{editorDocumentLabel}</h2>
                                    </div>
                                </div>
                                <div className={`jt-ai-editor-live-state${editorLoading ? ' is-active' : ''}`} aria-live="polite">
                                    <i />
                                    <span>
                                        {editorTyping
                                            ? `AI is typing · ${editorTypingProgress}%`
                                            : editorLoading
                                                ? 'AI is reading your draft'
                                                : 'Ready for your edits'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="jt-ai-editor-close"
                                    onClick={() => setEditorPopupOpen(false)}
                                    aria-label="Close AI document editor"
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            </header>

                            <div className="jt-ai-editor-mode-tabs" aria-label="Document type">
                                {[
                                    { id: 'resume', label: 'Resume', icon: 'document' },
                                    { id: 'cover', label: 'Cover letter', icon: 'message' },
                                    { id: 'description', label: 'Job description', icon: 'briefcase' }
                                ].map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        className={editorMode === item.id ? 'is-active' : ''}
                                        onClick={() => changeEditorMode(item.id)}
                                        disabled={editorLoading}
                                    >
                                        <Icon name={item.icon} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="jt-ai-editor-workspace">
                                <div className="jt-ai-editor-workspace-toolbar">
                                    <div>
                                        <span className="jt-window-dot" />
                                        <span className="jt-window-dot" />
                                        <span className="jt-window-dot" />
                                    </div>
                                    <strong>{editorDocumentLabel} · editable draft</strong>
                                    <div>
                                        <button type="button" onClick={copyDocument} title="Copy draft"><Icon name="copy" /></button>
                                        <button type="button" onClick={downloadDocument} title="Download draft"><Icon name="download" /></button>
                                    </div>
                                </div>
                                <div className={`jt-ai-editor-paper${editorTyping ? ' is-typing' : ''}`}>
                                    <textarea
                                        value={editorText}
                                        onChange={(event) => setEditorText(event.target.value)}
                                        aria-label={`Editable ${editorDocumentLabel.toLowerCase()}`}
                                        readOnly={editorLoading}
                                        spellCheck="true"
                                    />
                                    {editorTyping ? <span className="jt-ai-editor-caret" aria-hidden="true" /> : null}
                                </div>
                            </div>

                            <footer className="jt-ai-editor-dialog-footer">
                                <span aria-live="polite">{editorNotice}</span>
                                <div>
                                    <button type="button" className="jt-ai-editor-secondary" onClick={copyDocument}>
                                        <Icon name="copy" />
                                        Copy
                                    </button>
                                    <button
                                        type="button"
                                        className="jt-ai-edit-button"
                                        onClick={improveDocument}
                                        disabled={editorLoading}
                                    >
                                        <Icon name="spark" />
                                        {editorTyping ? 'AI is typing…' : editorLoading ? 'Reading draft…' : 'Polish again'}
                                    </button>
                                </div>
                            </footer>
                        </section>
                    </div>
                ) : null}

                <section className="jt-section jt-steps-section" id="how-it-works">
                    <div className="jt-section-heading jt-reveal">
                        <div>
                            <span className="jt-kicker">How JumpTake works</span>
                            <h2>From first look to real momentum.</h2>
                        </div>
                    </div>
                    <div className="jt-steps-grid">
                        {[
                            ['01', 'Choose your path', 'Start as a candidate or employer and enter the experience built for your next move.'],
                            ['02', 'Build your presence', 'Create a profile, add your story, or shape your company and hiring identity.'],
                            ['03', 'Let AI guide the work', 'Improve documents, discover relevant opportunities, and navigate the platform faster.'],
                            ['04', 'Connect and move forward', 'Apply, assess, message, follow updates, and turn a profile into a real relationship.']
                        ].map(([number, title, copy]) => (
                            <article className="jt-step-card jt-reveal" key={number}>
                                <span>{number}</span>
                                <div className="jt-step-icon"><Icon name={number === '01' ? 'people' : number === '02' ? 'document' : number === '03' ? 'spark' : 'arrow'} /></div>
                                <h3>{title}</h3>
                                <p>{copy}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="jt-final-cta">
                    <div className="jt-final-cta-grid" aria-hidden="true" />
                    <div className="jt-final-mark"><img src={activeLogo} alt="" /></div>
                    <div>
                        <span>Ready when you are</span>
                        <h2>Your next opportunity might already be here.</h2>
                        <p>Join the network, bring your work to life, and make the next connection count.</p>
                    </div>
                    <div className="jt-final-actions">
                        <button type="button" className="jt-primary-button" onClick={() => openAuth('register')}>
                            Create an account
                            <Icon name="arrow" />
                        </button>
                        <button type="button" className="jt-secondary-button is-dark" onClick={() => openAuth('login')}>Log in</button>
                    </div>
                </section>
            </main>

            <footer className="jt-home-footer">
                <div className="jt-footer-top">
                    <div className="jt-footer-brand">
                        <img src={activeLogo} alt="JumpTake" />
                        <p>AI-powered job discovery, hiring, professional creation, and better candidate-employer connections.</p>
                    </div>
                    <div className="jt-footer-links">
                        <div>
                            <strong>Explore</strong>
                            <button type="button" onClick={() => scrollTo('jobs')}>Jobs</button>
                            <button type="button" onClick={() => scrollTo('work-news')}>Work News</button>
                            <button type="button" onClick={() => scrollTo('ai-guide')}>JumpTake AI</button>
                        </div>
                        <div>
                            <strong>Create</strong>
                            <button type="button" onClick={() => scrollTo('documents')}>Resume</button>
                            <button type="button" onClick={() => scrollTo('documents')}>Cover letter</button>
                            <button type="button" onClick={() => scrollTo('documents')}>Job description</button>
                        </div>
                        <div>
                            <strong>Account</strong>
                            <button type="button" onClick={() => openAuth('login')}>Log in</button>
                            <button type="button" onClick={() => openAuth('register')}>Candidate signup</button>
                            <button type="button" onClick={() => openAuth('register')}>Employer signup</button>
                        </div>
                        <div>
                            <strong>Contact</strong>
                            <a href="mailto:support@jumptake.com">support@jumptake.com</a>
                            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
                            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                        </div>
                    </div>
                </div>

                <details className="jt-terms" id="terms">
                    <summary>Terms and conditions</summary>
                    <div className="jt-terms-grid">
                        <article><strong>1. User Agreement</strong><p>By accessing or using JumpTake, you agree to comply with these terms. If you do not agree, please do not use the platform.</p></article>
                        <article><strong>2. Privacy Policy</strong><p>Personal information is handled according to our privacy practices and used to provide, protect, and improve the service.</p></article>
                        <article><strong>3. User Accounts</strong><p>You are responsible for your credentials and account activity. Account information must be accurate and complete.</p></article>
                        <article><strong>4. Content Submission</strong><p>Content you submit may be used, modified, and displayed as needed to provide JumpTake services.</p></article>
                        <article><strong>5. Prohibited Conduct</strong><p>Users must not disrupt the platform, break applicable laws, or infringe the rights of others.</p></article>
                        <article><strong>6. Termination</strong><p>JumpTake may suspend or terminate accounts for terms violations, misuse, or extended inactivity.</p></article>
                        <article><strong>7. Disclaimer</strong><p>Services are provided on an “as is” and “as available” basis without warranties of uninterrupted availability.</p></article>
                        <article><strong>8. Contact</strong><p>Questions about these terms or the service can be sent to support@jumptake.com.</p></article>
                    </div>
                </details>

                <div className="jt-footer-bottom">
                    <span>© {new Date().getFullYear()} JumpTake. Built for the next move.</span>
                    <button type="button" onClick={() => scrollTo('top')}>Back to top ↑</button>
                </div>
            </footer>

            {gateMessage ? (
                <div className="jt-gate-toast" role="status">
                    <Icon name="check" />
                    {gateMessage}
                    <button type="button" onClick={() => setGateMessage('')} aria-label="Dismiss">×</button>
                </div>
            ) : null}

            {selectedJob ? (
                <div className="jt-job-modal-backdrop" role="presentation" onMouseDown={() => setSelectedJob(null)}>
                    <section className="jt-job-modal" role="dialog" aria-modal="true" aria-label={`${selectedJob.title} job details`} onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" className="jt-modal-close" onClick={() => setSelectedJob(null)} aria-label="Close job details">×</button>
                        <div className="jt-job-modal-company">
                            <ProfileAvatar
                                imageSrc={selectedJob.company?.logo || defaultJobPostAvatar}
                                name={selectedJob.company?.name || selectedJob.title}
                                className="jt-company-avatar is-large"
                                imageClassName="profile-avatar-image"
                                alt={`${selectedJob.company?.name || 'Company'} logo`}
                            />
                            <div>
                                <span>{selectedJob.company?.name || 'JumpTake company'}</span>
                                <h2>{selectedJob.title}</h2>
                                <p>{selectedJob.location || 'Location flexible'} · {selectedJob.jobType || 'Full-time'} · {selectedJob.salary || 'Salary shared during process'}</p>
                            </div>
                        </div>
                        <div className="jt-job-modal-body">
                            <h3>About the role</h3>
                            <p>{selectedJob.description}</p>
                            {Array.isArray(selectedJob.responsibilities) && selectedJob.responsibilities.length ? (
                                <>
                                    <h3>What you will do</h3>
                                    <ul>{selectedJob.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
                                </>
                            ) : null}
                            {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length ? (
                                <>
                                    <h3>What you will bring</h3>
                                    <ul>{selectedJob.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                                </>
                            ) : null}
                            <div className="jt-job-skills">
                                {(Array.isArray(selectedJob.skills) ? selectedJob.skills : []).map((skill) => <span key={skill}>{skill}</span>)}
                            </div>
                        </div>
                        <div className="jt-job-modal-actions">
                            <button type="button" className="jt-secondary-button" onClick={() => requireAccount('Log in to save this job for later.')}>
                                <Icon name="heart" /> Save role
                            </button>
                            <button type="button" className="jt-primary-button" onClick={() => requireAccount('Log in or create an account to apply.')}>
                                Apply with JumpTake
                                <Icon name="arrow" />
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}
        </div>
    );
};

export default Landing;
