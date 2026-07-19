import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const AUTO_ADVANCE_MS = 7000;

const CANDIDATE_TOUR_SECTIONS = [
    ['job-feed', 'Home', 'Your Home feed brings job posts, talent stories, work news, reactions, comments, sharing, and profile tools together. It helps you discover opportunities while building useful professional connections.'],
    ['dashboard', 'Dashboard', 'The dashboard is your concise starting point. It summarizes activity and provides quick routes into jobs, applications, creation tools, and account settings.'],
    ['notifications', 'Notifications', 'Notifications keep important changes visible, including messages, friend activity, application updates, and newly posted opportunities.'],
    ['view-candidates', 'Candidates', 'Candidates helps you find people by name or JumpTake ID, inspect relevant profiles, connect, message, and learn from professionals with related interests.'],
    ['friend-invitations', 'Friends', 'Friends organizes discovery, received invitations, sent invitations, and confirmed connections so your network stays easy to manage.'],
    ['applications', 'My Applications', 'My Applications brings submitted applications, assessments, video interviews, and drafts into one workspace so every hiring step is easier to follow.'],
    ['assessments', 'My Assessments', 'My Assessments contains employer invitations, instructions, completion tools, and results connected to your active applications.'],
    ['video-interviews', 'Video Interviews', 'Video Interviews keeps interview invitations, scheduling choices, and meeting details organized alongside the relevant opportunity.'],
    ['draft-applications', 'Draft Applications', 'Draft Applications preserves unfinished work so you can continue carefully instead of restarting an application.'],
    ['bookmarks', 'Bookmarks', 'Bookmarks keeps saved candidates, jobs, and posts together so valuable opportunities and content are never difficult to find again.'],
    ['bookmarked-candidates', 'Bookmarked Candidates', 'Bookmarked Candidates keeps useful professional profiles available for later comparison, messaging, and networking.'],
    ['bookmarked-jobs', 'Bookmarked Jobs', 'Bookmarked Jobs preserves opportunities you may want to evaluate or apply to later.'],
    ['saved-posts', 'Saved Posts', 'Saved Posts keeps useful community content available in a focused viewer without forcing you to search the feed again.'],
    ['interested-jobs', 'Job Preferences', 'Job Preferences improves recommendations by recording the fields and job families that match your goals. Choose several options for broader, more useful matching.'],
    ['resume-playground', 'Create', 'Create provides a professional résumé playground, document creation, uploads, AI-generated samples, editing, saving, exporting, and printing.'],
    ['blocks', 'Blocks', 'Blocks gives you control over blocked users, sources, hidden posts, comments, and other content, supporting a safer and more relevant experience.'],
    ['inbox', 'Messages', 'Messages organizes new conversations, requests, archived chats, blocked contacts, new messages, and communication preferences in one place.'],
    ['progress-check', 'Progress Check', 'Progress Check turns activity into clear signals such as applications, job searching, matching, employer views, and response rates.'],
    ['settings', 'Settings', 'Settings controls account information, security, notifications, and other preferences that shape your JumpTake experience.'],
    ['about-jumptake', 'About JumpTake', 'About JumpTake explains the platform and lets you restart this guided experience whenever you need a refresher.']
].map(([id, title, description]) => ({ id, title, description }));

const EMPLOYER_TOUR_SECTIONS = [
    ['home-feed', 'Home', 'The employer Home feed combines Work News, talent stories, job posts, engagement, company visibility, and professional community activity.'],
    ['dashboard', 'Dashboard', 'The dashboard summarizes hiring activity and provides direct access to the tools used most often.'],
    ['post-job', 'Post a Job', 'Post a Job guides you through creating a complete opportunity with responsibilities, requirements, skills, compensation, and company context.'],
    ['manage-jobs', 'Manage Jobs', 'Manage Jobs centralizes editing, applicant review, invitations, assessments, interviews, holds, rejections, and hiring decisions for each role.'],
    ['make-assessment', 'Make an Assessment', 'Build structured assessments that help compare candidates consistently and identify the evidence most relevant to a role.'],
    ['general-assessment', 'General Assessment', 'General Assessment stores reusable screening material that can be applied across suitable jobs when needed.'],
    ['talent-pool', 'Talent Pool', 'Talent Pool helps you discover candidates, compare profile evidence, bookmark promising people, and begin professional conversations.'],
    ['bookmarked-talents', 'Bookmarked Talents', 'Bookmarked Talents keeps promising candidates available for later review and future opportunities.'],
    ['saved-posts', 'Saved Posts', 'Saved Posts preserves useful professional content and opens it in a focused viewer without losing your current workspace.'],
    ['notifications', 'Notifications', 'Notifications surface candidate messages, application activity, and other hiring events that may require attention.'],
    ['create-document', 'Create Document', 'Create Document supports blank documents, uploaded files, AI-generated samples, editing, saving, exporting, and printing.'],
    ['inbox', 'Messages', 'Messages keeps candidate communication, requests, archives, blocked contacts, and messaging settings organized.'],
    ['company-profile', 'Company Profile', 'Company Profile controls the public information candidates use to understand your organization and evaluate opportunities.'],
    ['application-tracking', 'Application Tracking', 'Application Tracking presents hiring performance signals so you can identify momentum, bottlenecks, and response patterns.'],
    ['settings', 'Settings', 'Settings controls employer account details, security, notifications, and company-facing preferences.'],
    ['about-jumptake', 'About JumpTake', 'About JumpTake explains the platform and lets your team restart this guided experience whenever needed.']
].map(([id, title, description]) => ({ id, title, description }));

const isVisibleControl = (element) => {
    if (!element || element.closest('.guided-portal-tour')) {
        return false;
    }
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
};

const getControlLabel = (element, index) => {
    const explicit = element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder');
    const text = String(explicit || element.innerText || element.value || '').replace(/\s+/g, ' ').trim();
    return text || `${element.tagName.toLowerCase()} control ${index + 1}`;
};

const describeControl = (label, sectionTitle) => {
    const normalized = label.toLowerCase();
    const descriptions = [
        [/search|find/, 'Use this control to find relevant people, jobs, or content faster and reduce the time spent browsing.'],
        [/apply|application/, 'This action moves you into the application workflow, where your details can be reviewed before submission.'],
        [/bookmark|save/, 'Save this item for reliable access later without interrupting what you are doing now.'],
        [/message|chat|inbox/, 'Start or manage a direct professional conversation while keeping communication connected to the relevant person or opportunity.'],
        [/friend|connect|invitation/, 'Use this networking action to create and manage a professional connection on JumpTake.'],
        [/profile/, 'Open the complete profile view to evaluate public experience, education, skills, activity, and available contact actions.'],
        [/create|new|post|publish/, 'Use this creation action to turn your information or idea into editable, shareable content.'],
        [/upload|attach/, 'Upload an existing file so JumpTake can preserve or convert it for the current workflow.'],
        [/edit|continue/, 'Continue editing while keeping the existing information available for refinement.'],
        [/delete|remove|withdraw/, 'This removes or withdraws the selected item. JumpTake presents confirmation where recovery or status may be affected.'],
        [/block|hide|unhide|unblock/, 'Use this safety and visibility control to decide which people or content can appear in your experience.'],
        [/filter|sort/, 'Narrow or reorder the visible results so the most relevant information reaches you first.'],
        [/like|react|comment|share|reach/, 'This engagement control helps you respond to content, join the discussion, distribute it, or understand its visibility.'],
        [/save|update|submit|confirm/, 'Confirm the current information so the latest choices are available throughout JumpTake.'],
        [/back|close|cancel/, 'Leave the current view safely and return to the previous workspace without performing another action.']
    ];
    const match = descriptions.find(([pattern]) => pattern.test(normalized));
    return match?.[1] || `This ${sectionTitle} control performs “${label}”. It keeps the related task accessible without leaving the wider portal workflow.`;
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
            closeTour();
            return;
        }
        setSectionIndex((index) => index + 1);
        setStage('navigation');
        setControlIndex(0);
    }, [closeTour, sectionIndex, sections.length]);

    const advance = useCallback(() => {
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

    useEffect(() => {
        if (!active) {
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
            if (event.key === 'Escape') {
                closeTour();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [active, closeTour]);

    if (!active || typeof document === 'undefined') {
        return null;
    }

    const control = controls[controlIndex];
    const hasNavigationTarget = Boolean(document.querySelector(`[data-tour-id="nav-${section.id}"]`));
    const title = stage === 'navigation'
        ? (hasNavigationTarget ? `${section.title} navigation` : `Opening ${section.title}`)
        : stage === 'overview'
            ? section.title
            : control?.label || section.title;
    const description = stage === 'navigation'
        ? (hasNavigationTarget
            ? `This navigation button opens ${section.title}. JumpTake keeps it available from the main rail so you can move directly to this workspace.`
            : `JumpTake has opened ${section.title} automatically so this related workspace can be explained as part of the complete portal tour.`)
        : stage === 'overview'
            ? section.description
            : describeControl(control?.label || 'this control', section.title);
    const cardStyle = spotlightRect && spotlightRect.top > window.innerHeight * 0.48
        ? { top: 'max(4.4rem, 5vh)' }
        : { bottom: 'max(1rem, env(safe-area-inset-bottom))' };

    return createPortal(
        <div className="guided-portal-tour" role="dialog" aria-modal="true" aria-label="JumpTake guided portal tour">
            {spotlightRect ? <div className="guided-tour-spotlight" style={spotlightRect} /> : <div className="guided-tour-full-shade" />}
            <div className="guided-tour-top-actions">
                <button type="button" onClick={moveToNextSection}>Skip section</button>
                <button type="button" className="guided-tour-close" onClick={closeTour} aria-label="Close tour">&times;</button>
            </div>
            <article className="guided-tour-card" style={cardStyle}>
                <div className="guided-tour-ai-head" aria-hidden="true"><span>✦</span></div>
                <div className="guided-tour-copy">
                    <span className="guided-tour-eyebrow">JumpTake AI guide</span>
                    <h2>{title}</h2>
                    <p>{description}</p>
                    <div className="guided-tour-progress-copy">
                        <span>Section {sectionIndex + 1} of {sections.length}</span>
                        <span>{stage === 'control' && controls.length ? `Control ${controlIndex + 1} of ${controls.length}` : 'Overview'}</span>
                    </div>
                    <div className="guided-tour-progress"><span key={`${sectionIndex}-${stage}-${controlIndex}`} /></div>
                    <button type="button" className="guided-tour-next" onClick={advance}>
                        {sectionIndex === sections.length - 1 && stage === 'control' && controlIndex >= controls.length - 1 ? 'Finish tour' : 'Next'}
                    </button>
                </div>
            </article>
        </div>,
        document.body
    );
};

export default GuidedPortalTour;
