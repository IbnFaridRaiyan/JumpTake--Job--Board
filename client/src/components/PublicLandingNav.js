import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployerLogin from './EmployerLogin';
import Login from './Login';

const PublicLandingIcon = ({ name }) => {
    if (name === 'search') {
        return (
            <svg className="public-landing-icon public-landing-icon-search" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
        );
    }

    if (name === 'register') {
        return (
            <svg className="public-landing-icon public-landing-icon-register" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
                <path d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5" />
            </svg>
        );
    }

    if (name === 'jobs') {
        return (
            <svg className="public-landing-icon public-landing-icon-jobs" viewBox="0 0 16 16" aria-hidden="true">
                <path fillRule="evenodd" d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm7.5.5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0zM2 5.5a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5M10.5 5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM13 8h-2V6h2z" />
            </svg>
        );
    }

    return (
        <svg className="public-landing-icon public-landing-icon-home" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5" />
        </svg>
    );
};

const ChoiceDialog = ({ title, candidateLabel, employerLabel, onCandidate, onEmployer, onClose }) => (
    <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="public-choice-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="public-modal-close" onClick={onClose} aria-label="Close">x</button>
            <h2>{title}</h2>
            <div className="public-choice-actions">
                <button type="button" onClick={onCandidate}>{candidateLabel}</button>
                <button type="button" onClick={onEmployer}>{employerLabel}</button>
            </div>
        </section>
    </div>
);

const PublicLandingNav = () => {
    const navigate = useNavigate();
    const apiBase = process.env.REACT_APP_API_URL || '';
    const [activeModal, setActiveModal] = useState('');
    const [jobs, setJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([
        { role: 'assistant', text: 'Ask anything to JumpTake. I can explain the platform, give you a tour, or help you log in and create an account.' }
    ]);

    useEffect(() => {
        if (activeModal !== 'jobs' || jobs.length) {
            return;
        }

        const loadJobs = async () => {
            setJobsLoading(true);
            try {
                const response = await fetch(`${apiBase}/api/jobs`);
                const data = await response.json();
                setJobs(Array.isArray(data) ? data.filter((job) => job.active !== false) : []);
            } catch (error) {
                setJobs([]);
            } finally {
                setJobsLoading(false);
            }
        };

        loadJobs();
    }, [activeModal, apiBase, jobs.length]);

    const executeAction = (action) => {
        if (action === 'candidate-register') {
            setActiveModal('');
            navigate('/job-seeker');
        } else if (action === 'employer-register') {
            setActiveModal('');
            navigate('/company');
        } else if (action === 'candidate-login') {
            setActiveModal('candidate-login');
        } else if (action === 'employer-login') {
            setActiveModal('employer-login');
        } else if (action === 'choose-register') {
            setActiveModal('register-choice');
        } else if (action === 'choose-login') {
            setActiveModal('login-choice');
        }
    };

    const askAssistant = async (event) => {
        event.preventDefault();
        const question = assistantInput.trim();
        if (!question || assistantLoading) {
            return;
        }

        setAssistantInput('');
        setAssistantMessages((messages) => [...messages, { role: 'user', text: question }]);
        setAssistantLoading(true);

        try {
            const response = await fetch(`${apiBase}/api/public-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: question })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'JumpTake assistant is unavailable.');
            }
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: data.answer }]);
            if (data.action) {
                window.setTimeout(() => executeAction(data.action), 350);
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    const requireCandidateLogin = () => {
        setActiveModal('candidate-login');
    };

    return (
        <>
            <nav className="public-home-nav" aria-label="JumpTake public navigation">
                {[
                    { id: 'home', label: 'Login', icon: 'home', action: () => setActiveModal('login-choice') },
                    { id: 'assistant', label: 'Ask JumpTake', icon: 'search', action: () => setActiveModal('assistant') },
                    { id: 'register', label: 'Create account', icon: 'register', action: () => setActiveModal('register-choice') },
                    { id: 'jobs', label: 'Browse jobs', icon: 'jobs', action: () => setActiveModal('jobs') }
                ].map((item) => (
                    <button key={item.id} type="button" className="public-home-nav-button" onClick={item.action} aria-label={item.label} title={item.label}>
                        <PublicLandingIcon name={item.icon} />
                    </button>
                ))}
            </nav>

            {activeModal === 'login-choice' && (
                <ChoiceDialog
                    title="Log in to JumpTake"
                    candidateLabel="Candidate Login"
                    employerLabel="Employer Login"
                    onCandidate={() => setActiveModal('candidate-login')}
                    onEmployer={() => setActiveModal('employer-login')}
                    onClose={() => setActiveModal('')}
                />
            )}

            {activeModal === 'register-choice' && (
                <ChoiceDialog
                    title="Create a JumpTake account"
                    candidateLabel="Start as Candidate"
                    employerLabel="Start as Employer"
                    onCandidate={() => executeAction('candidate-register')}
                    onEmployer={() => executeAction('employer-register')}
                    onClose={() => setActiveModal('')}
                />
            )}

            {activeModal === 'assistant' && (
                <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('')}>
                    <section className="public-assistant-dialog" role="dialog" aria-modal="true" aria-label="Ask JumpTake" onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" className="public-modal-close" onClick={() => setActiveModal('')} aria-label="Close">x</button>
                        <h2>Ask anything to JumpTake?</h2>
                        <div className="public-assistant-messages">
                            {assistantMessages.map((message, index) => (
                                <p key={`${message.role}-${index}`} className={`public-assistant-message is-${message.role}`}>{message.text}</p>
                            ))}
                            {assistantLoading && <p className="public-assistant-message is-assistant">Thinking...</p>}
                        </div>
                        <form className="public-assistant-form" onSubmit={askAssistant}>
                            <input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask about JumpTake..." />
                            <button type="submit" disabled={assistantLoading}>Ask</button>
                        </form>
                    </section>
                </div>
            )}

            {activeModal === 'jobs' && (
                <div className="public-landing-modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('')}>
                    <section className="public-jobs-dialog" role="dialog" aria-modal="true" aria-label="Public job feed" onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" className="public-modal-close" onClick={() => setActiveModal('')} aria-label="Close">x</button>
                        <h2>JumpTake Job Feed</h2>
                        <p>Browse current jobs. Candidate login is required to open or apply.</p>
                        <div className="public-jobs-list">
                            {jobsLoading && <p>Loading jobs...</p>}
                            {!jobsLoading && !jobs.length && <p>No active jobs are available right now.</p>}
                            {jobs.map((job) => (
                                <article className="public-job-card" key={job._id}>
                                    <h3>{job.title}</h3>
                                    <p>{job.company?.name || 'Company'} · {job.location || 'Location not listed'}</p>
                                    <div className="public-job-meta">
                                        <span>{job.jobType || 'Full-time'}</span>
                                        {job.salary && <span>{job.salary}</span>}
                                    </div>
                                    <div className="public-job-actions">
                                        <button type="button" onClick={requireCandidateLogin}>View Job</button>
                                        <button type="button" onClick={requireCandidateLogin}>Apply Now</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {activeModal === 'candidate-login' && <Login onClose={() => setActiveModal('')} />}
            {activeModal === 'employer-login' && <EmployerLogin onClose={() => setActiveModal('')} />}
        </>
    );
};

export default PublicLandingNav;
