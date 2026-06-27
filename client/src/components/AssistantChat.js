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
            const response = await fetch(apiUrl('/api/public-assistant'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    history: assistantMessages.slice(-8).map(({ role, text }) => ({ role, text })),
                    context
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'JumpTake assistant is unavailable.');
            }
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: data.answer, time: formatAssistantTime() }]);
            if (data.action && String(data.answer || '').trim().toLowerCase() !== 'error connecting') {
                onAction?.(data.action, { answer: data.answer, question, context });
            }
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', text: error.message, time: formatAssistantTime() }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    return (
        <div className={`public-ai-chat-card portal-ai-chat-card ${className}`}>
            <div className="public-ai-chat-header">
                <div className="public-ai-chat-brand">
                    <p className="public-ai-chat-title">{title}</p>
                </div>
                <button
                    type="button"
                    className="portal-ai-clear-chat-button"
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
                <div className="public-ai-reply-row">
                    <div className="public-ai-reply-field">
                        <AssistantSearchIcon />
                        <input
                            type="text"
                            value={assistantInput}
                            onChange={(event) => setAssistantInput(event.target.value)}
                            enterKeyHint="send"
                            placeholder="Ask JumpTake AI"
                        />
                    </div>
                    <button type="submit" className="public-ai-send-button" disabled={assistantLoading || !assistantInput.trim()} aria-label="Send to JumpTake AI">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 20 21 12 3 4v6l11 2-11 2v6Z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssistantChat;
