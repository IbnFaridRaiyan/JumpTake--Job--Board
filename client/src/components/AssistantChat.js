import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/apiUrl';
import MobileChatComposer from './MobileChatComposer';

const formatAssistantTime = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const AssistantSearchIcon = () => (
    <svg className="public-ai-search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 19a8 8 0 1 1 5.292-14.003A8 8 0 0 1 11 19Zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
        <path d="M16.293 16.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414Z" />
    </svg>
);

const createInitialAssistantMessages = () => ([
    {
        role: 'assistant',
        text: 'Hi, I am JumpTake AI. Ask me about jobs, resumes, applications, hiring, or anything you want to do next.',
        time: formatAssistantTime()
    }
]);

const createConversationId = () => `ai-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const hasUserMessages = (messages = []) => messages.some((message) => message.role === 'user');
const getNotepadAction = (question = '', context = {}) => {
    if (!context?.portalMode) return '';
    const normalized = String(question || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const asksReminder = /\b(?:remind me|reminder|remember (?:to|that|about)|set (?:me )?(?:a )?reminder|create (?:me )?(?:a )?reminder|add (?:a )?reminder)\b/.test(normalized);
    const asksNote = /\b(?:note down|(?:make|take|save|add) (?:a )?note|(?:save|write|put|add) .{1,160} (?:to|in|on) (?:my )?(?:notepad|notes?))\b/.test(normalized);
    return asksReminder || asksNote ? 'widget-set-reminder' : '';
};
const buildNotepadConfirmation = (question = '') => (
    /\b(?:remind|reminder|remember)\b/i.test(String(question || ''))
        ? 'Done — I added it to your Notepad reminders. You can change the reminder time in the Reminders section whenever you want.'
        : 'Done — I added it to your Saved Notes. You can review or delete it from the Notepad whenever you want.'
);

const AssistantActionIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
        <path d="m18.5 16 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </svg>
);

const AssistantApproveIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
);

const AssistantRejectIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" />
    </svg>
);

const GENERATED_ACTIONS = new Set([
    'candidate-create-resume',
    'candidate-format-resume',
    'candidate-tailor-resume-to-job',
    'candidate-create-document',
    'candidate-format-document',
    'candidate-tailor-cover-letter-to-job',
    'candidate-create-story',
    'employer-create-post',
    'employer-create-assessment',
    'employer-create-document',
    'employer-format-document'
]);

const ACTION_TEXT_FIELDS = {
    'feed-comment': 'comment',
    'message-send': 'message',
    'job-review': 'reviewText'
};

const getActionAnimationDelay = (action = '') => {
    const actionName = String(action || '').toLowerCase();
    if (actionName === 'feed-comment') return 2300;
    if (actionName === 'feed-react') return 1450;
    if (actionName === 'message-send') return 850;
    if (actionName === 'profile-open') return 750;
    return 620;
};

const humanizeSection = (section = '') => String(section || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getActionReview = (action = '', payload = {}) => {
    const actionName = String(action || '').trim().toLowerCase();
    const args = payload.actionPayload && typeof payload.actionPayload === 'object'
        ? payload.actionPayload
        : {};
    const scopeLabel = args.scope === 'all-visible' ? 'all visible items' : '';
    const target = String(
        args.postReference
        || args.targetReference
        || args.recipientReference
        || args.friendReference
        || scopeLabel
        || ''
    ).trim();
    const textField = ACTION_TEXT_FIELDS[actionName] || '';
    const generatedDraft = GENERATED_ACTIONS.has(actionName) ? String(payload.answer || '').trim() : '';
    const fieldDraft = textField ? String(args[textField] || '').trim() : '';
    const reminderDraft = actionName === 'widget-set-reminder' ? String(payload.question || '').trim() : '';
    const draftSource = generatedDraft ? 'answer' : fieldDraft ? textField : reminderDraft ? 'question' : '';
    const draft = generatedDraft || fieldDraft || reminderDraft;

    if (actionName === 'feed-comment') return { title: 'Comment on post', target, draft, draftSource };
    if (actionName === 'feed-react') return { title: `React with ${args.reaction || 'Like'}`, target, draft: '', draftSource: '' };
    if (actionName === 'feed-share') return { title: 'Share post', target: target || 'Selected recipient', draft: '', draftSource: '' };
    if (actionName === 'message-send') return { title: 'Send message', target, draft, draftSource };
    if (actionName === 'job-like') return { title: 'Like job', target, draft: '', draftSource: '' };
    if (actionName === 'job-review') return { title: `Publish ${args.rating ? `${args.rating}-star ` : ''}job review`, target, draft, draftSource };
    if (actionName === 'job-share') return { title: 'Share job', target, draft: '', draftSource: '' };
    if (actionName === 'theme-set') return { title: `Switch to ${args.theme === 'dark' ? 'dark' : 'light'} mode`, target: '', draft: '', draftSource: '' };
    if (actionName === 'account-change-password') return { title: 'Open password settings', target: '', draft: '', draftSource: '' };
    if (actionName === 'profile-open') return { title: 'Open user profile', target, draft: '', draftSource: '' };
    if (actionName === 'widget-set-reminder') return { title: 'Save to Notepad', target: '', draft, draftSource };
    if (actionName === 'candidate-apply-job') return { title: 'Open job application', target, draft: '', draftSource: '' };
    if (actionName.startsWith('open-section:')) {
        return { title: `Open ${humanizeSection(actionName.split(':')[1])}`, target: '', draft: '', draftSource: '' };
    }
    if (actionName === 'open-messenger') return { title: 'Open Messages', target: '', draft: '', draftSource: '' };

    const generatedTitles = {
        'candidate-create-resume': 'Create resume',
        'candidate-format-resume': 'Update resume formatting',
        'candidate-tailor-resume-to-job': 'Tailor resume',
        'candidate-create-document': 'Create document',
        'candidate-format-document': 'Update document formatting',
        'candidate-tailor-cover-letter-to-job': 'Tailor cover letter',
        'candidate-create-story': 'Prepare talent story',
        'employer-create-post': 'Prepare Work News post',
        'employer-create-assessment': 'Create assessment',
        'employer-create-document': 'Create document',
        'employer-format-document': 'Update document formatting'
    };

    return {
        title: generatedTitles[actionName] || humanizeSection(actionName) || 'Run AI action',
        target,
        draft,
        draftSource
    };
};

const dispatchActionPreview = (phase, pendingAction, extra = {}) => {
    if (typeof window === 'undefined' || !pendingAction?.action) return;
    window.dispatchEvent(new CustomEvent('jumptake-ai-action-preview', {
        detail: {
            id: pendingAction.id,
            phase,
            action: pendingAction.action,
            args: pendingAction.payload?.actionPayload || {},
            context: pendingAction.payload?.context || {},
            draft: pendingAction.draft,
            ...extra
        }
    }));
};
const buildConversationTitle = (messages = []) => {
    const firstQuestion = String(messages.find((message) => message.role === 'user')?.text || '')
        .replace(/[^a-z0-9\s'-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!firstQuestion) return 'New AI chat';
    const words = firstQuestion.split(' ').filter(Boolean).slice(0, 5);
    const title = words.map((word, index) => (
        index === 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word
    )).join(' ');
    return title.length > 46 ? `${title.slice(0, 43).trim()}…` : title;
};

const AssistantChat = ({ className = '', storageKey = '', context = null, onAction, mobileComposer = false }) => {
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState(createInitialAssistantMessages);
    const [conversationId, setConversationId] = useState(createConversationId);
    const [conversations, setConversations] = useState([]);
    const [showSavedChats, setShowSavedChats] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const messagesRef = useRef(null);
    const inputRef = useRef(null);
    const pendingActionRef = useRef(null);
    const actionPreviewTimerRef = useRef(null);
    const actionExecutionTimerRef = useRef(null);
    const conversationsStorageKey = `${storageKey}:conversations`;
    pendingActionRef.current = pendingAction;
    const pendingActionId = pendingAction?.id || '';
    const pendingActionPhase = pendingAction?.phase || '';
    const pendingActionDraft = pendingAction?.draft || '';

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') {
            setAssistantMessages(createInitialAssistantMessages());
            return;
        }

        try {
            const storedConversations = JSON.parse(localStorage.getItem(conversationsStorageKey) || '[]');
            if (Array.isArray(storedConversations) && storedConversations.length) {
                const sorted = [...storedConversations].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
                setConversations(sorted);
                setConversationId(sorted[0].id);
                setAssistantMessages(Array.isArray(sorted[0].messages) ? sorted[0].messages : createInitialAssistantMessages());
                return;
            }

            const legacyMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (Array.isArray(legacyMessages) && hasUserMessages(legacyMessages)) {
                const migrated = {
                    id: createConversationId(),
                    title: buildConversationTitle(legacyMessages),
                    messages: legacyMessages.slice(-80),
                    updatedAt: Date.now()
                };
                setConversations([migrated]);
                setConversationId(migrated.id);
                setAssistantMessages(migrated.messages);
            } else {
                setConversations([]);
                setConversationId(createConversationId());
                setAssistantMessages(createInitialAssistantMessages());
            }
        } catch (error) {
            setConversations([]);
            setConversationId(createConversationId());
            setAssistantMessages(createInitialAssistantMessages());
        }
    }, [conversationsStorageKey, storageKey]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') {
            return;
        }
        if (!hasUserMessages(assistantMessages)) return;

        const nextConversation = {
            id: conversationId,
            title: buildConversationTitle(assistantMessages),
            messages: assistantMessages.slice(-80),
            updatedAt: Date.now()
        };
        setConversations((current) => [
            nextConversation,
            ...current.filter((conversation) => conversation.id !== conversationId)
        ].slice(0, 40));
    }, [assistantMessages, conversationId, storageKey]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        localStorage.setItem(conversationsStorageKey, JSON.stringify(conversations));
        localStorage.removeItem(storageKey);
    }, [conversations, conversationsStorageKey, storageKey]);

    useEffect(() => {
        if (!messagesRef.current) {
            return;
        }
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [assistantMessages, assistantLoading, pendingAction]);

    useEffect(() => {
        if (!pendingActionId || pendingActionPhase !== 'opening') return undefined;
        const timer = window.setTimeout(() => {
            setPendingAction((current) => (
                current?.id === pendingActionId
                    ? { ...current, phase: current.draft ? 'typing' : 'ready' }
                    : current
            ));
        }, pendingActionDraft ? 260 : 420);
        return () => window.clearTimeout(timer);
    }, [pendingActionDraft, pendingActionId, pendingActionPhase]);

    useEffect(() => {
        if (!pendingActionId || pendingActionPhase !== 'typing') return undefined;
        const fullDraft = String(pendingActionDraft || '');
        if (!fullDraft) {
            setPendingAction((current) => (
                current?.id === pendingActionId ? { ...current, phase: 'ready', typedDraft: '' } : current
            ));
            return undefined;
        }

        const stepCount = Math.min(84, Math.max(18, Math.ceil(fullDraft.length / 5)));
        const charactersPerStep = Math.max(1, Math.ceil(fullDraft.length / stepCount));
        const delay = fullDraft.length > 1000 ? 12 : fullDraft.length > 320 ? 16 : 22;
        let cursor = 0;
        const timer = window.setInterval(() => {
            cursor = Math.min(fullDraft.length, cursor + charactersPerStep);
            setPendingAction((current) => {
                if (current?.id !== pendingActionId) return current;
                return {
                    ...current,
                    typedDraft: fullDraft.slice(0, cursor),
                    phase: cursor >= fullDraft.length ? 'ready' : 'typing'
                };
            });
            if (cursor >= fullDraft.length) window.clearInterval(timer);
        }, delay);
        return () => window.clearInterval(timer);
    }, [pendingActionDraft, pendingActionId, pendingActionPhase]);

    useEffect(() => () => {
        const activeAction = pendingActionRef.current;
        if (activeAction && !['approved', 'rejected'].includes(activeAction.phase)) {
            dispatchActionPreview('cancel', activeAction);
        }
        if (actionPreviewTimerRef.current) window.clearTimeout(actionPreviewTimerRef.current);
        if (actionExecutionTimerRef.current) window.clearTimeout(actionExecutionTimerRef.current);
    }, []);

    useEffect(() => {
        if (!inputRef.current) {
            return;
        }

        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 96)}px`;
    }, [assistantInput]);

    useEffect(() => {
        if (typeof window === 'undefined' || !className.includes('floating-messenger-assistant-chat')) {
            return undefined;
        }

        const showTourPrompt = (event) => {
            const prompt = String(event?.detail?.prompt || '').trim();
            if (!prompt) {
                return;
            }
            setAssistantInput(prompt);
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        };

        window.addEventListener('jumptake-assistant-demo-prompt', showTourPrompt);
        return () => window.removeEventListener('jumptake-assistant-demo-prompt', showTourPrompt);
    }, [className]);

    useEffect(() => {
        if (typeof window === 'undefined' || !className.includes('portal-widget-assistant-chat')) {
            return undefined;
        }

        const focusWidgetAssistant = (event) => {
            const prompt = String(event?.detail?.prompt || '').trim();
            if (prompt) {
                setAssistantInput(prompt);
            }
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        };

        window.addEventListener('jumptake-widget-assistant-focus', focusWidgetAssistant);
        window.addEventListener('jumptake-widget-assistant-prompt', focusWidgetAssistant);
        return () => {
            window.removeEventListener('jumptake-widget-assistant-focus', focusWidgetAssistant);
            window.removeEventListener('jumptake-widget-assistant-prompt', focusWidgetAssistant);
        };
    }, [className]);

    const clearScheduledAssistantAction = () => {
        if (actionPreviewTimerRef.current) {
            window.clearTimeout(actionPreviewTimerRef.current);
            actionPreviewTimerRef.current = null;
        }
        if (actionExecutionTimerRef.current) {
            window.clearTimeout(actionExecutionTimerRef.current);
            actionExecutionTimerRef.current = null;
        }
    };

    const clearAssistantChat = () => {
        clearScheduledAssistantAction();
        if (pendingAction) dispatchActionPreview('cancel', pendingAction);
        setPendingAction(null);
        setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
        setConversationId(createConversationId());
        setAssistantMessages(createInitialAssistantMessages());
        setAssistantInput('');
        setShowSavedChats(false);
    };

    const startNewChat = () => {
        clearScheduledAssistantAction();
        if (pendingAction) dispatchActionPreview('cancel', pendingAction);
        setPendingAction(null);
        setConversationId(createConversationId());
        setAssistantMessages(createInitialAssistantMessages());
        setAssistantInput('');
        setShowSavedChats(false);
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    const openSavedChat = (conversation) => {
        if (!conversation?.id || !Array.isArray(conversation.messages)) return;
        clearScheduledAssistantAction();
        if (pendingAction) dispatchActionPreview('cancel', pendingAction);
        setPendingAction(null);
        setConversationId(conversation.id);
        setAssistantMessages(conversation.messages);
        setAssistantInput('');
        setShowSavedChats(false);
    };

    const deleteSavedChat = (id) => {
        setConversations((current) => current.filter((conversation) => conversation.id !== id));
        if (id === conversationId) {
            setConversationId(createConversationId());
            setAssistantMessages(createInitialAssistantMessages());
            setAssistantInput('');
        }
    };

    const queueAssistantAction = (action, payload) => {
        const review = getActionReview(action, payload);
        const nextPendingAction = {
            id: `assistant-action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            action,
            payload,
            ...review,
            typedDraft: '',
            phase: 'opening'
        };
        setPendingAction(nextPendingAction);
        setAssistantMessages((messages) => [
            ...messages,
            {
                role: 'assistant',
                text: `I prepared "${review.title}" for your approval.`,
                time: formatAssistantTime()
            }
        ]);
    };

    const updatePendingActionDraft = (draft) => {
        if (!pendingAction || pendingAction.phase !== 'ready') return;
        const nextPayload = {
            ...pendingAction.payload,
            actionPayload: { ...(pendingAction.payload?.actionPayload || {}) }
        };
        if (pendingAction.draftSource === 'answer') nextPayload.answer = draft;
        if (pendingAction.draftSource === 'question') nextPayload.question = draft;
        if (pendingAction.draftSource && !['answer', 'question'].includes(pendingAction.draftSource)) {
            nextPayload.actionPayload[pendingAction.draftSource] = draft;
        }
        const next = { ...pendingAction, draft, typedDraft: draft, payload: nextPayload };
        setPendingAction(next);
    };

    const approvePendingAction = () => {
        if (!pendingAction || pendingAction.phase !== 'ready') return;
        const applyingAction = { ...pendingAction, phase: 'applying' };
        const actionDelay = getActionAnimationDelay(applyingAction.action);
        setPendingAction(applyingAction);

        actionPreviewTimerRef.current = window.setTimeout(() => {
            dispatchActionPreview('approve', applyingAction);
            actionPreviewTimerRef.current = null;
        }, 320);

        actionExecutionTimerRef.current = window.setTimeout(() => {
            onAction?.(applyingAction.action, applyingAction.payload);
            actionExecutionTimerRef.current = null;
            setPendingAction((current) => (
                current?.id === applyingAction.id ? { ...current, phase: 'approved' } : current
            ));
            window.setTimeout(() => {
                setPendingAction((current) => (current?.id === applyingAction.id ? null : current));
                setAssistantMessages((messages) => [
                    ...messages,
                    { role: 'assistant', text: `${applyingAction.title} approved.`, time: formatAssistantTime() }
                ]);
            }, 760);
        }, 320 + actionDelay);
    };

    const rejectPendingAction = () => {
        if (!pendingAction || ['approved', 'rejected'].includes(pendingAction.phase)) return;
        const rejectedAction = { ...pendingAction, phase: 'rejected' };
        setPendingAction(rejectedAction);
        dispatchActionPreview('cancel', rejectedAction);
        window.setTimeout(() => {
            setPendingAction((current) => (current?.id === rejectedAction.id ? null : current));
            setAssistantMessages((messages) => [
                ...messages,
                { role: 'assistant', text: 'Cancelled. No changes were made.', time: formatAssistantTime() }
            ]);
        }, 620);
    };

    useEffect(() => {
        const acceptsChatCommands = className.includes('floating-messenger-assistant-chat')
            || className.includes('portal-widget-assistant-chat');
        if (typeof window === 'undefined' || !acceptsChatCommands) return undefined;
        const handleCommand = (event) => {
            if (event?.detail?.storageKey !== storageKey) return;
            const action = event?.detail?.action;
            if (action === 'new') startNewChat();
            if (action === 'clear') clearAssistantChat();
            if (action === 'chats') setShowSavedChats(true);
        };
        window.addEventListener('jumptake-assistant-chat-command', handleCommand);
        return () => window.removeEventListener('jumptake-assistant-chat-command', handleCommand);
    });

    const askAssistant = async (event) => {
        event?.preventDefault();
        const question = assistantInput.trim();
        if (!question || assistantLoading || pendingAction) {
            return;
        }

        setAssistantInput('');
        setAssistantMessages((messages) => [...messages, { role: 'user', text: question, time: formatAssistantTime() }]);
        setAssistantLoading(true);

        try {
            const resolvedContext = typeof context === 'function' ? context() : context;
            const token = localStorage.getItem('token') || localStorage.getItem('employerToken');
            const response = await fetch(apiUrl('/api/public-assistant'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: question,
                    history: assistantMessages.slice(-8).map(({ role, text }) => ({ role, text })),
                    context: resolvedContext
                })
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.code === 'AI_PLAN_LIMIT_REACHED') {
                    window.dispatchEvent(new CustomEvent('jumptake-open-pricing'));
                }
                throw new Error(data.error || 'JumpTake assistant is unavailable.');
            }
            const notepadAction = getNotepadAction(question, resolvedContext);
            const resolvedAction = notepadAction || data.action || '';
            const resolvedActionPayload = notepadAction ? {} : (data.actionPayload || data.actionPlan?.args || {});
            const resolvedAnswer = notepadAction ? buildNotepadConfirmation(question) : data.answer;
            const actionPayload = {
                answer: resolvedAnswer,
                question,
                context: resolvedContext,
                actionPayload: resolvedActionPayload
            };
            if (resolvedAction && String(resolvedAnswer || '').trim().toLowerCase() !== 'error connecting') {
                queueAssistantAction(resolvedAction, actionPayload);
            } else {
                setAssistantMessages((messages) => [...messages, { role: 'assistant', text: resolvedAnswer, time: formatAssistantTime() }]);
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message, time: formatAssistantTime() }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    // Desktop portal header searches are routed straight into the active
    // JumpTake AI chat.  The small delay lets the floating messenger finish
    // mounting its assistant panel before requestSubmit runs; the side-widget
    // assistant is already mounted and submits on the same event immediately.
    useEffect(() => {
        if (
            typeof window === 'undefined'
            || (!className.includes('portal-widget-assistant-chat')
                && !className.includes('floating-messenger-assistant-chat'))
        ) return undefined;

        const submitHeaderSearch = (event) => {
            const prompt = String(event?.detail?.prompt || '').trim();
            if (!prompt) return;

            setAssistantInput(prompt);
            window.setTimeout(() => {
                const form = inputRef.current?.form;
                if (!form || assistantLoading || pendingAction) return;
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }, 0);
        };

        window.addEventListener('jumptake-assistant-submit', submitHeaderSearch);
        return () => window.removeEventListener('jumptake-assistant-submit', submitHeaderSearch);
    }, [assistantLoading, className, pendingAction]);

    return (
        <div className={`public-ai-chat-card portal-ai-chat-card ${className}`}>
            {showSavedChats ? (
                <section className="assistant-saved-chats" aria-label="Saved AI chats">
                    <div className="assistant-saved-chats-heading">
                        <div>
                            <strong>Chats</strong>
                            <span>Continue an earlier conversation</span>
                        </div>
                        <button type="button" onClick={() => setShowSavedChats(false)} aria-label="Close saved chats">×</button>
                    </div>
                    <div className="assistant-saved-chat-list">
                        {conversations.length ? conversations.map((conversation) => (
                            <article key={conversation.id} className={conversation.id === conversationId ? 'is-current' : ''}>
                                <button type="button" className="assistant-saved-chat-open" onClick={() => openSavedChat(conversation)}>
                                    <strong>{conversation.title}</strong>
                                    <span>{new Date(conversation.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </button>
                                <button type="button" className="assistant-saved-chat-delete" onClick={() => deleteSavedChat(conversation.id)} aria-label={`Delete ${conversation.title}`}>×</button>
                            </article>
                        )) : (
                            <div className="assistant-saved-chats-empty">
                                <strong>No saved chats yet</strong>
                                <span>Your chats are saved after you send the first message.</span>
                            </div>
                        )}
                    </div>
                </section>
            ) : <ul ref={messagesRef} className="public-ai-chat-messages portal-ai-chat-messages">
                {assistantMessages.map((message, index) => (
                    <li key={`${message.role}-${index}`} className={`public-ai-chat-row is-${message.role}`}>
                        <div className="public-ai-chat-time">{message.time}</div>
                        <div className={`public-ai-chat-bubble is-${message.role}${message.role === 'assistant' && index === assistantMessages.length - 1 ? ' is-latest' : ''}`}>
                            {message.text}
                        </div>
                    </li>
                ))}
                {assistantLoading ? (
                    <li className="public-ai-chat-row is-assistant">
                        <div className="public-ai-chat-bubble is-typing">
                            <span />
                            <span />
                            <span />
                        </div>
                    </li>
                ) : null}
                {pendingAction ? (
                    <li className="public-ai-chat-row is-assistant assistant-action-review-row">
                        <article
                            className={`assistant-action-review is-${pendingAction.phase}`}
                            aria-label={`Review AI action: ${pendingAction.title}`}
                            aria-live="polite"
                        >
                            <header className="assistant-action-review-header">
                                <span className="assistant-action-review-icon"><AssistantActionIcon /></span>
                                <span className="assistant-action-review-copy">
                                    <small>AI action</small>
                                    <strong>{pendingAction.title}</strong>
                                </span>
                                <span className="assistant-action-review-status">
                                    {pendingAction.phase === 'approved'
                                        ? 'Approved'
                                        : pendingAction.phase === 'applying'
                                            ? 'Applying'
                                        : pendingAction.phase === 'rejected'
                                            ? 'Cancelled'
                                            : pendingAction.phase === 'ready'
                                                ? 'Ready'
                                                : 'Preparing'}
                                </span>
                            </header>
                            {pendingAction.target ? (
                                <div className="assistant-action-review-target">{pendingAction.target}</div>
                            ) : null}
                            {pendingAction.draftSource ? (
                                <div className="assistant-action-review-editor">
                                    <textarea
                                        value={pendingAction.typedDraft}
                                        onChange={(event) => updatePendingActionDraft(event.target.value)}
                                        readOnly={pendingAction.phase !== 'ready'}
                                        rows={Math.min(7, Math.max(3, pendingAction.typedDraft.split('\n').length))}
                                        aria-label={`Edit ${pendingAction.title.toLowerCase()}`}
                                    />
                                    {pendingAction.phase === 'typing' ? <span className="assistant-action-typing-caret" aria-hidden="true" /> : null}
                                </div>
                            ) : (
                                <div className="assistant-action-review-summary">
                                    <span className="assistant-action-review-pulse" aria-hidden="true" />
                                    <span>No change will be made until you approve.</span>
                                </div>
                            )}
                            <div className="assistant-action-review-footer">
                                <span className="assistant-action-review-safety">Review before applying</span>
                                <div className="assistant-action-review-controls">
                                    <button
                                        type="button"
                                        className="assistant-action-review-reject"
                                        onClick={rejectPendingAction}
                                        disabled={['applying', 'approved', 'rejected'].includes(pendingAction.phase)}
                                        aria-label="Cancel AI action"
                                        title="Cancel action"
                                    >
                                        <AssistantRejectIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className="assistant-action-review-approve"
                                        onClick={approvePendingAction}
                                        disabled={pendingAction.phase !== 'ready'}
                                        aria-label="Approve AI action"
                                        title="Approve action"
                                    >
                                        <AssistantApproveIcon />
                                    </button>
                                </div>
                            </div>
                        </article>
                    </li>
                ) : null}
            </ul>}
            {mobileComposer ? (
                <MobileChatComposer
                    value={assistantInput}
                    onChange={setAssistantInput}
                    onSubmit={askAssistant}
                    inputRef={inputRef}
                    placeholder={pendingAction ? 'Review the pending action' : 'Ask JumpTake AI'}
                    ariaLabel="Ask JumpTake AI"
                    disabled={Boolean(pendingAction)}
                    sendDisabled={assistantLoading || Boolean(pendingAction) || !assistantInput.trim()}
                    className="mobile-chat-composer-ai"
                />
            ) : <form className="public-ai-chat-reply" onSubmit={askAssistant}>
                <div className="public-ai-reply-row portal-ai-reply-row-aligned">
                    <div className="public-ai-reply-field">
                        <AssistantSearchIcon />
                        <textarea
                            ref={inputRef}
                            value={assistantInput}
                            onChange={(event) => setAssistantInput(event.target.value)}
                            rows={1}
                            enterKeyHint="enter"
                            placeholder={pendingAction ? 'Review the pending action' : 'Ask JumpTake AI'}
                            disabled={Boolean(pendingAction)}
                        />
                    </div>
                    <button type="submit" className="public-ai-send-button" disabled={assistantLoading || Boolean(pendingAction) || !assistantInput.trim()} aria-label="Send to JumpTake AI">
                        <div className="svg-wrapper-1">
                            <div className="svg-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                                    <path fill="none" d="M0 0h24v24H0z" />
                                    <path
                                        fill="currentColor"
                                        d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <span>Send</span>
                    </button>
                </div>
            </form>}
        </div>
    );
};

export default AssistantChat;
