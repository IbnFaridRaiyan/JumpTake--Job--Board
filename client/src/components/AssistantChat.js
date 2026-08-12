import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/apiUrl';

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

const AssistantChat = ({ className = '', storageKey = '', context = null, onAction }) => {
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState(createInitialAssistantMessages);
    const [conversationId, setConversationId] = useState(createConversationId);
    const [conversations, setConversations] = useState([]);
    const [showSavedChats, setShowSavedChats] = useState(false);
    const messagesRef = useRef(null);
    const inputRef = useRef(null);
    const conversationsStorageKey = `${storageKey}:conversations`;

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
    }, [assistantMessages, assistantLoading]);

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

        const focusWidgetAssistant = () => {
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        };

        window.addEventListener('jumptake-widget-assistant-focus', focusWidgetAssistant);
        return () => window.removeEventListener('jumptake-widget-assistant-focus', focusWidgetAssistant);
    }, [className]);

    const clearAssistantChat = () => {
        setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
        setConversationId(createConversationId());
        setAssistantMessages(createInitialAssistantMessages());
        setAssistantInput('');
        setShowSavedChats(false);
    };

    const startNewChat = () => {
        setConversationId(createConversationId());
        setAssistantMessages(createInitialAssistantMessages());
        setAssistantInput('');
        setShowSavedChats(false);
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    const openSavedChat = (conversation) => {
        if (!conversation?.id || !Array.isArray(conversation.messages)) return;
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

    useEffect(() => {
        if (typeof window === 'undefined' || !className.includes('floating-messenger-assistant-chat')) return undefined;
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
        if (!question || assistantLoading) {
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
            const resolvedAnswer = notepadAction ? buildNotepadConfirmation(question) : data.answer;
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: resolvedAnswer, time: formatAssistantTime() }]);
            if (String(resolvedAnswer || '').trim().toLowerCase() !== 'error connecting') {
                onAction?.(resolvedAction, { answer: resolvedAnswer, question, context: resolvedContext });
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message, time: formatAssistantTime() }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    const keepAssistantReplyInView = (event) => {
        if (typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches) {
            return;
        }
        const replyField = event.currentTarget;
        window.requestAnimationFrame(() => {
            replyField?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    };

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
            </ul>}
            <form className="public-ai-chat-reply" onSubmit={askAssistant}>
                <div className="public-ai-reply-row portal-ai-reply-row-aligned">
                    <div className="public-ai-reply-field">
                        <AssistantSearchIcon />
                        <textarea
                            ref={inputRef}
                            value={assistantInput}
                            onChange={(event) => setAssistantInput(event.target.value)}
                            rows={1}
                            enterKeyHint="enter"
                            placeholder="Ask JumpTake AI"
                            onFocus={keepAssistantReplyInView}
                        />
                    </div>
                    <button type="submit" className="public-ai-send-button" disabled={assistantLoading || !assistantInput.trim()} aria-label="Send to JumpTake AI">
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
            </form>
        </div>
    );
};

export default AssistantChat;
