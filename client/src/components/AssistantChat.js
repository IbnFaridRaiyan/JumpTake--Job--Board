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

const AssistantChat = ({ title = 'Jumptake chat', className = '', storageKey = '', context = null, onAction }) => {
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState(createInitialAssistantMessages);
    const messagesRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') {
            setAssistantMessages(createInitialAssistantMessages());
            return;
        }

        try {
            const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            setAssistantMessages(Array.isArray(storedMessages) && storedMessages.length ? storedMessages : createInitialAssistantMessages());
        } catch (error) {
            setAssistantMessages(createInitialAssistantMessages());
        }
    }, [storageKey]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') {
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(assistantMessages.slice(-80)));
    }, [assistantMessages, storageKey]);

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

    const clearAssistantChat = () => {
        setAssistantMessages(createInitialAssistantMessages());
        setAssistantInput('');
        if (storageKey && typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
        }
    };

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
            const response = await fetch(apiUrl('/api/public-assistant'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    history: assistantMessages.slice(-8).map(({ role, text }) => ({ role, text })),
                    context: resolvedContext
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'JumpTake assistant is unavailable.');
            }
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: data.answer, time: formatAssistantTime() }]);
            if (data.action && String(data.answer || '').trim().toLowerCase() !== 'error connecting') {
                onAction?.(data.action, { answer: data.answer, question, context: resolvedContext });
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message, time: formatAssistantTime() }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    return (
        <div className={`public-ai-chat-card portal-ai-chat-card ${className}`}>
            <div className="public-ai-chat-header portal-ai-chat-header-row">
                <div className="public-ai-chat-brand">
                    <p className="public-ai-chat-title">{title}</p>
                </div>
                <button
                    type="button"
                    className="portal-ai-clear-chat-button portal-ai-clear-chat-button-isolated"
                    onClick={clearAssistantChat}
                    disabled={assistantLoading}
                >
                    Clear chat
                </button>
            </div>
            <ul ref={messagesRef} className="public-ai-chat-messages portal-ai-chat-messages">
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
            </ul>
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
