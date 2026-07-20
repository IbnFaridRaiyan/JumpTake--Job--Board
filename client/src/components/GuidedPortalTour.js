import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const AUTO_ADVANCE_MS = 7000;
const AI_DEMO_SECTION_ID = 'messages-ai-demo';

const CANDIDATE_AI_DEMOS = [
    {
        label: 'AI resume demo',
        prompt: 'Create a professional resume using the experience and skills in my JumpTake profile.',
        description: 'This request shows how JumpTake AI can open Create, start a resume draft from your profile context, and leave the final editing decisions with you.'
    },
    {
        label: 'AI job-search demo',
        prompt: 'Find software engineer jobs that match my skills and experience.',
        description: 'This request shows how the assistant can help you move toward relevant job discovery without manually searching through every section.'
    },
    {
        label: 'AI post demo',
        prompt: 'Create a professional post about a career achievement I am proud of.',
        description: 'This request shows how JumpTake AI can prepare a post draft and open the Home composer so you can review it before publishing.'
    },
    {
        label: 'AI Settings demo',
        prompt: 'Open Settings and show me where to change my notification preferences.',
        description: 'This request shows how plain-language navigation can take you directly to Settings and help you find the preference you need.'
    }
];

const EMPLOYER_AI_DEMOS = [
    {
        label: 'AI candidate-search demo',
        prompt: 'Find candidates with software engineering experience for my open role.',
        description: 'This request demonstrates how JumpTake AI can guide an employer toward the Talent Pool and a more focused candidate search.'
    },
    {
        label: 'AI post demo',
        prompt: 'Create an employer post announcing our newest job opportunity.',
        description: 'This request demonstrates how the assistant can prepare a professional employer post and open the composer for review.'
    },
    {
        label: 'AI document demo',
        prompt: 'Create a professional hiring document for a software engineer role.',
        description: 'This request demonstrates how JumpTake AI can open Create Document with a useful starting draft while keeping the employer in control.'
    },
    {
        label: 'AI Settings demo',
        prompt: 'Open Settings and show me the security and notification options.',
        description: 'This request demonstrates direct, plain-language navigation to the account controls an employer needs.'
    }
];

const CANDIDATE_TOUR_SECTIONS = [
    ['job-feed', 'Home', 'Stay visible in your professional community, discover fresh opportunities, and learn from other people’s ideas in one place. Consistent participation can grow your reach and lead to valuable connections.'],
    ['dashboard', 'Dashboard', 'See what deserves attention first, reduce time spent checking separate areas, and move into your highest-value career activity with less effort.'],
    ['notifications', 'Notifications', 'Respond while opportunities and conversations are still fresh. Timely awareness helps you protect application momentum and avoid missing an employer or connection.'],
    ['view-candidates', 'Candidates', 'Meet people with relevant knowledge, exchange ideas, and build relationships that can introduce you to industries, collaborators, and opportunities beyond your existing network.'],
    ['friend-invitations', 'Friends', 'Turn promising introductions into a useful professional network. Stronger connections can bring advice, referrals, encouragement, and visibility to new career paths.'],
    ['applications', 'My Applications', 'Keep every opportunity moving without relying on memory. A clear view of your progress helps you follow up sooner, prepare better, and spend more time on strong applications.'],
    ['assessments', 'My Assessments', 'Demonstrate your ability with confidence and keep preparation focused on real employer requests, helping your strongest evidence reach hiring teams sooner.'],
    ['video-interviews', 'Video Interviews', 'Stay prepared for important conversations and reduce scheduling friction, so you can focus your energy on presenting your experience and personality well.'],
    ['draft-applications', 'Draft Applications', 'Protect the work you have already completed and return when you can give it proper attention, saving time while improving the quality of each submission.'],
    ['bookmarks', 'Bookmarks', 'Build a personal shortlist of opportunities, people, and ideas. Keeping high-value discoveries together reduces repeated searching and makes future decisions faster.'],
    ['bookmarked-candidates', 'Bookmarked Candidates', 'Remember people who could become mentors, collaborators, or valuable industry contacts, then reconnect when the timing or opportunity is right.'],
    ['bookmarked-jobs', 'Bookmarked Jobs', 'Compare promising roles on your own schedule and prepare thoughtful applications without losing opportunities you discovered earlier.'],
    ['saved-posts', 'Saved Posts', 'Create a reusable library of advice, market insight, and inspiration that can improve your decisions and spark stronger professional ideas later.'],
    ['interested-jobs', 'Job Preferences', 'Guide JumpTake toward the work you genuinely want, improving the relevance of future discoveries and reducing time spent filtering unsuitable roles.'],
    ['resume-playground', 'Create', 'Turn your experience and ideas into polished resumes and documents faster. AI-supported starting points reduce repetitive writing while leaving you in control of the final result.'],
    ['blocks', 'Blocks', 'Protect your attention and wellbeing by shaping a safer, more relevant environment, leaving more energy for constructive people and useful content.'],
    ['inbox', 'Messages', 'Build real professional relationships through focused conversation. Keeping communication organized makes follow-ups faster and helps promising introductions become lasting connections.'],
    [AI_DEMO_SECTION_ID, 'JumpTake AI in Messages', 'Ask JumpTake AI inside Messages to find jobs, create a resume or post, and open areas such as Settings. The following prompts are demonstrations and will not submit or publish anything.', CANDIDATE_AI_DEMOS],
    ['progress-check', 'Progress Check', 'Use evidence from your activity to understand what creates momentum, adjust your strategy earlier, and invest time in the actions most likely to improve results.'],
    ['settings', 'Settings', 'Shape a secure, focused experience around your preferences so JumpTake supports your goals without creating unnecessary interruptions.'],
    ['about-jumptake', 'About JumpTake', 'Return here whenever you want to refresh your understanding, discover overlooked value, or help your next career move start with greater confidence.']
].map(([id, title, description, demoPrompts]) => ({ id, title, description, demoPrompts }));

const EMPLOYER_TOUR_SECTIONS = [
    ['home-feed', 'Home', 'Strengthen employer visibility, share ideas and progress, and engage with the professional community so more relevant people recognize your organization.'],
    ['dashboard', 'Dashboard', 'See hiring priorities quickly and reduce the time spent moving between workflows, helping your team act on strong candidates while interest is high.'],
    ['post-job', 'Post a Job', 'Present opportunities clearly enough to attract better-aligned applicants, reduce avoidable questions, and give candidates confidence in your role and organization.'],
    ['manage-jobs', 'Manage Jobs', 'Keep hiring decisions coordinated and reduce administrative delay, so candidates receive faster responses and your team can move strong people forward consistently.'],
    ['make-assessment', 'Make an Assessment', 'Collect comparable evidence of ability, reduce bias from unstructured screening, and focus interview time on candidates who show the strongest role-relevant potential.'],
    ['general-assessment', 'General Assessment', 'Reuse effective evaluation material across suitable roles, saving preparation time while maintaining a consistent standard for candidate review.'],
    ['talent-pool', 'Talent Pool', 'Discover capable people before competitors do, build relationships beyond active applicants, and create a warmer pipeline for current and future hiring needs.'],
    ['bookmarked-talents', 'Bookmarked Talents', 'Maintain a focused shortlist of promising people so future vacancies can begin with informed prospects instead of a completely new search.'],
    ['saved-posts', 'Saved Posts', 'Preserve useful market insight, candidate ideas, and community knowledge that can improve hiring strategy and inspire stronger employer communication.'],
    ['notifications', 'Notifications', 'Respond to candidate interest and hiring changes sooner, protecting momentum and creating a more attentive experience for potential employees.'],
    ['create-document', 'Create Document', 'Produce polished hiring documents faster with reusable and AI-supported starting points, reducing repetitive writing across the team.'],
    ['inbox', 'Messages', 'Build trust through timely, organized candidate communication and reduce the chance that valuable conversations are delayed or forgotten.'],
    [AI_DEMO_SECTION_ID, 'JumpTake AI in Messages', 'Ask JumpTake AI inside Messages to find candidates, create posts or documents, and open areas such as Settings. The following prompts are demonstrations and will not submit or publish anything.', EMPLOYER_AI_DEMOS],
    ['company-profile', 'Company Profile', 'Give candidates a credible reason to choose you by presenting a clear employer identity, improving trust before they apply or accept an interview.'],
    ['application-tracking', 'Application Tracking', 'Recognize delays and conversion patterns early, then focus time and resources where they can improve hiring speed and candidate experience most.'],
    ['settings', 'Settings', 'Keep employer access secure and communication focused, allowing the team to work efficiently without unnecessary interruptions.'],
    ['about-jumptake', 'About JumpTake', 'Return here to refresh your team’s understanding and uncover more value from the platform as your hiring needs evolve.']
].map(([id, title, description, demoPrompts]) => ({ id, title, description, demoPrompts }));

const isVisibleControl = (element) => {
    if (!element || element.closest('.guided-portal-tour')) {
        return false;
    }
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
};

const getControlLabel = (element, index) => {
    const explicit = element.getAttribute('data-tour-label') || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder');
    const text = String(explicit || element.innerText || element.value || '').replace(/\s+/g, ' ').trim();
    return text || `${element.tagName.toLowerCase()} control ${index + 1}`;
};

const describeControl = (label, section) => {
    const normalized = label.toLowerCase();
    const descriptions = [
        [/search|find/, 'Reach relevant people, jobs, or ideas sooner and spend less time browsing results that do not support your goals.'],
        [/apply|application/, 'Act while an opportunity is fresh and present your experience in a focused way that helps employers understand your potential.'],
        [/bookmark|save/, 'Reduce repeated searching and mental load by keeping valuable opportunities, people, and ideas ready for the moment you need them.'],
        [/message|chat|inbox/, 'Turn discovery into a real relationship through timely conversation, stronger follow-up, and a clearer path to collaboration or opportunity.'],
        [/notification|alert|stack/, 'Keep opportunities, conversations, and application progress visible so you can respond sooner and protect valuable momentum.'],
        [/friend|connect|invitation/, 'Grow a professional network that can bring knowledge, encouragement, referrals, collaboration, and access to new communities.'],
        [/profile/, 'Build confidence before a conversation by understanding relevant experience and shared interests, or strengthen how others understand your own value.'],
        [/create|new|post|publish/, 'Turn knowledge and ideas into visible professional value, helping others discover your perspective while reducing the time needed to start.'],
        [/upload|attach/, 'Reuse work you already have instead of recreating it, preserving effort and accelerating the path to a polished result.'],
        [/edit|continue/, 'Refine work over time without losing earlier progress, making quality easier to improve even when your time is limited.'],
        [/delete|remove|withdraw/, 'Keep attention on current priorities by clearing work that no longer supports your goals or has become outdated.'],
        [/block|hide|unhide|unblock/, 'Protect focus and wellbeing by shaping a professional environment around constructive people and relevant information.'],
        [/filter|sort/, 'Reduce information overload and bring the most useful choices forward, making decisions faster and more confidently.'],
        [/like|react|comment|share|reach/, 'Increase professional visibility, support useful ideas, and begin conversations that can grow into meaningful community connections.'],
        [/save|update|submit|confirm/, 'Protect your latest progress and keep information dependable across JumpTake, reducing repetition in future tasks.'],
        [/back|close|cancel/, 'Stay in control of your pace and attention while preserving the progress that still matters.']
    ];
    const match = descriptions.find(([pattern]) => pattern.test(normalized));
    return match?.[1] || `${section.title} can help you make useful progress with less friction. ${section.description}`;
};

const GuidedPortalTour = ({ mode = 'candidate' }) => {
    const sections = useMemo(() => mode === 'employer' ? EMPLOYER_TOUR_SECTIONS : CANDIDATE_TOUR_SECTIONS, [mode]);
    const [active, setActive] = useState(false);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [stage, setStage] = useState('navigation');
    const [controlIndex, setControlIndex] = useState(0);
    const [controls, setControls] = useState([]);
    const [spotlightRect, setSpotlightRect] = useState(null);
    const section = sections[sectionIndex] || sections[0];

    const closeTour = useCallback(() => {
        setActive(false);
        setControls([]);
        setSpotlightRect(null);
        document.body.removeAttribute('data-jumptake-tour-active');
    }, []);

    const showCompletion = useCallback(() => {
        setStage('complete');
        setControls([]);
        setSpotlightRect(null);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const handleStart = (event) => {
            const requestedMode = event.detail?.mode || mode;
            if (requestedMode !== mode) {
                return;
            }
            setSectionIndex(0);
            setStage('navigation');
            setControlIndex(0);
            setControls([]);
            setActive(true);
            document.body.setAttribute('data-jumptake-tour-active', 'true');
        };
        window.addEventListener('jumptake-start-guided-tour', handleStart);
        return () => window.removeEventListener('jumptake-start-guided-tour', handleStart);
    }, [mode]);

    useEffect(() => () => {
        document.body.removeAttribute('data-jumptake-tour-active');
    }, []);

    useEffect(() => {
        if (!active || !section) {
            return undefined;
        }

        if (section.id === AI_DEMO_SECTION_ID) {
            const messengerEvent = mode === 'employer'
                ? 'jumptake-open-employer-messenger'
                : 'jumptake-open-candidate-messenger';
            setStage('overview');
            setControlIndex(0);
            setControls((section.demoPrompts || []).map((demo) => ({
                ...demo,
                selector: '.floating-messenger-assistant-chat .public-ai-reply-field textarea'
            })));
            window.dispatchEvent(new CustomEvent(messengerEvent, {
                detail: { assistant: true, guidedTour: true }
            }));
            const revealTimer = window.setTimeout(() => {
                setControls((current) => [...current]);
            }, 250);

            return () => {
                window.clearTimeout(revealTimer);
                window.dispatchEvent(new CustomEvent(messengerEvent, {
                    detail: { tourClose: true }
                }));
            };
        }

        window.dispatchEvent(new CustomEvent('jumptake-ai-open-section', {
            detail: { mode, section: section.id }
        }));
        setStage('navigation');
        setControlIndex(0);
        setControls([]);

        const timer = window.setTimeout(() => {
            const shell = document.querySelector(`.portal-section-transition-shell[data-section="${section.id}"]`);
            if (!shell) {
                return;
            }
            const seen = new Set();
            const nextControls = Array.from(shell.querySelectorAll('button, a[href], input, select, textarea, [role="button"]'))
                .filter(isVisibleControl)
                .map((element, index) => ({ element, label: getControlLabel(element, index) }))
                .filter(({ label, element }) => {
                    const key = `${element.tagName}:${element.getAttribute('type') || ''}:${label.toLowerCase()}`;
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
            setControls(nextControls);
        }, 650);

        return () => window.clearTimeout(timer);
    }, [active, mode, section]);

    const currentTarget = useMemo(() => {
        if (!active || !section) {
            return null;
        }
        if (stage === 'complete') {
            return null;
        }
        if (section.id === AI_DEMO_SECTION_ID) {
            if (stage === 'overview') {
                return document.querySelector('.floating-messenger-panel');
            }
            return document.querySelector(controls[controlIndex]?.selector || '.floating-messenger-assistant-chat .public-ai-reply-field textarea');
        }
        if (stage === 'navigation') {
            return document.querySelector(`[data-tour-id="nav-${section.id}"]`)
                || document.querySelector(`.portal-section-transition-shell[data-section="${section.id}"]`);
        }
        if (stage === 'overview') {
            return document.querySelector(`.portal-section-transition-shell[data-section="${section.id}"]`);
        }
        return controls[controlIndex]?.element || null;
    }, [active, controlIndex, controls, section, stage]);

    useEffect(() => {
        if (!active || section?.id !== AI_DEMO_SECTION_ID || stage !== 'control') {
            return;
        }

        const prompt = controls[controlIndex]?.prompt;
        if (prompt) {
            window.dispatchEvent(new CustomEvent('jumptake-assistant-demo-prompt', {
                detail: { prompt }
            }));
        }
    }, [active, controlIndex, controls, section, stage]);

    useEffect(() => {
        if (!active || !currentTarget) {
            setSpotlightRect(null);
            return undefined;
        }

        currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        let frameId = 0;
        const updateRect = () => {
            frameId = window.requestAnimationFrame(() => {
                const rect = currentTarget.getBoundingClientRect();
                const padding = stage === 'overview' ? 6 : 8;
                const top = Math.max(8, rect.top - padding);
                const left = Math.max(8, rect.left - padding);
                setSpotlightRect({
                    top,
                    left,
                    width: Math.max(24, Math.min(window.innerWidth - left - 8, rect.width + (padding * 2))),
                    height: Math.max(24, Math.min(window.innerHeight - top - 8, rect.height + (padding * 2)))
                });
            });
        };
        const settleTimer = window.setTimeout(updateRect, 330);
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.clearTimeout(settleTimer);
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [active, currentTarget, stage]);

    const moveToNextSection = useCallback(() => {
        if (sectionIndex >= sections.length - 1) {
            showCompletion();
            return;
        }
        setSectionIndex((index) => index + 1);
        setStage('navigation');
        setControlIndex(0);
    }, [sectionIndex, sections.length, showCompletion]);

    const advance = useCallback(() => {
        if (stage === 'complete') {
            return;
        }
        if (stage === 'navigation') {
            setStage('overview');
            return;
        }
        if (stage === 'overview') {
            if (controls.length) {
                setStage('control');
                setControlIndex(0);
            } else {
                moveToNextSection();
            }
            return;
        }
        if (controlIndex < controls.length - 1) {
            setControlIndex((index) => index + 1);
        } else {
            moveToNextSection();
        }
    }, [controlIndex, controls.length, moveToNextSection, stage]);

    const goBack = useCallback(() => {
        if (stage === 'control') {
            if (controlIndex > 0) {
                setControlIndex((index) => index - 1);
            } else {
                setStage('overview');
            }
            return;
        }
        if (stage === 'overview') {
            if (section?.id === AI_DEMO_SECTION_ID && sectionIndex > 0) {
                setSectionIndex((index) => index - 1);
                setStage('navigation');
                setControlIndex(0);
                setControls([]);
                return;
            }
            setStage('navigation');
            return;
        }
        if (stage === 'navigation' && sectionIndex > 0) {
            setSectionIndex((index) => index - 1);
            setStage('navigation');
            setControlIndex(0);
            setControls([]);
        }
    }, [controlIndex, section, sectionIndex, stage]);

    useEffect(() => {
        if (!active || stage === 'complete') {
            return undefined;
        }
        const timer = window.setTimeout(advance, AUTO_ADVANCE_MS);
        return () => window.clearTimeout(timer);
    }, [active, advance, controlIndex, sectionIndex, stage]);

    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && stage !== 'complete') {
                showCompletion();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [active, showCompletion, stage]);

    if (!active || typeof document === 'undefined') {
        return null;
    }

    const control = controls[controlIndex];
    const isComplete = stage === 'complete';
    const canGoBack = !isComplete && (sectionIndex > 0 || stage !== 'navigation');
    const hasNavigationTarget = Boolean(document.querySelector(`[data-tour-id="nav-${section.id}"]`));
    const isAiDemo = section.id === AI_DEMO_SECTION_ID;
    const title = isComplete
        ? 'Your JumpTake journey starts here'
        : isAiDemo && stage === 'overview'
            ? section.title
            : isAiDemo && stage === 'control'
                ? control?.label || section.title
        : stage === 'navigation'
        ? (hasNavigationTarget ? `${section.title} navigation` : `Opening ${section.title}`)
        : stage === 'overview'
            ? section.title
            : control?.label || section.title;
    const description = isComplete
        ? "Happy JumpTake, let's get it going now!"
        : isAiDemo && stage === 'overview'
            ? section.description
            : isAiDemo && stage === 'control'
                ? `${control?.description || section.description} Demo prompt: "${control?.prompt || ''}"`
        : stage === 'navigation'
        ? (hasNavigationTarget
            ? `Moving into ${section.title} now. Keeping this opportunity close helps you protect momentum and spend more time on meaningful progress.`
            : `${section.title} is ready. This part of JumpTake can help you move toward better results with less repeated effort.`)
        : stage === 'overview'
            ? section.description
            : describeControl(control?.label || 'this control', section);
    const cardStyle = isComplete
        ? { top: '50%', bottom: 'auto' }
        : spotlightRect && spotlightRect.top > window.innerHeight * 0.48
        ? { top: 'max(4.4rem, 5vh)' }
        : { bottom: 'max(1rem, env(safe-area-inset-bottom))' };

    return createPortal(
        <div className="guided-portal-tour" role="dialog" aria-modal="true" aria-label="JumpTake guided portal tour">
            {!isComplete && spotlightRect ? <div className="guided-tour-spotlight" style={spotlightRect} /> : <div className="guided-tour-full-shade" />}
            <article className={`guided-tour-card ${isComplete ? 'is-complete' : ''}`} style={cardStyle}>
                <div className="guided-tour-ai-head" aria-hidden="true"><span>✦</span></div>
                <div className="guided-tour-copy" key={`${sectionIndex}-${stage}-${controlIndex}`}>
                    <span className="guided-tour-eyebrow">JumpTake AI guide</span>
                    <h2>{title}</h2>
                    <p>{description}</p>
                    <div className="guided-tour-progress-copy">
                        <span>{isComplete ? 'Tour complete' : `Section ${sectionIndex + 1} of ${sections.length}`}</span>
                        <span>{isComplete ? 'Ready to begin' : stage === 'control' && controls.length ? `${isAiDemo ? 'Demo' : 'Control'} ${controlIndex + 1} of ${controls.length}` : 'Overview'}</span>
                    </div>
                    <div className={`guided-tour-progress ${isComplete ? 'is-complete' : ''}`}><span key={`${sectionIndex}-${stage}-${controlIndex}`} /></div>
                    {isComplete ? (
                        <button type="button" className="guided-tour-next guided-tour-begin" onClick={closeTour}>Begin</button>
                    ) : (
                        <div className="guided-tour-controls" aria-label="Tour controls">
                            <button type="button" className="guided-tour-previous" onClick={goBack} disabled={!canGoBack}>Previous</button>
                            <button type="button" className="guided-tour-next" onClick={advance}>Next</button>
                            <button type="button" className="guided-tour-skip" onClick={moveToNextSection}>Skip section</button>
                            <button type="button" className="guided-tour-close" onClick={showCompletion} aria-label="End tour and continue">&times;</button>
                        </div>
                    )}
                </div>
            </article>
        </div>,
        document.body
    );
};

export default GuidedPortalTour;
