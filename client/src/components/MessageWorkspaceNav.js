import React from 'react';

export const MESSAGE_TABS = [
    { id: 'new', label: 'New Messages', icon: 'M3 4h18v13H7l-4 4V4Zm3 3v2h12V7H6Zm0 4v2h8v-2H6Z' },
    { id: 'archived', label: 'Archived', icon: 'M3 3h18v4H3V3Zm2 6h14v11H5V9Zm4 3v2h6v-2H9Z' },
    { id: 'requests', label: 'Requests', icon: 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3 21a9 9 0 0 1 18 0H3Zm16-14h4v2h-4V7Zm1-1h2v4h-2V6Z' },
    { id: 'compose', label: 'Send New Message', icon: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z' },
    { id: 'blocked', label: 'Blocked Contacts', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5.9 7.3 16.7 18.1A8 8 0 0 1 5.9 7.3Zm12.2 9.4L7.3 5.9a8 8 0 0 1 10.8 10.8Z' },
    { id: 'settings', label: 'Settings', icon: 'M19.4 13a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2.1-1.7-2-3.5-2.6 1a8 8 0 0 0-1.7-1L14.8 3h-4l-.4 2.8a8 8 0 0 0-1.7 1l-2.6-1-2 3.5L6.2 11a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2.1 1.7 2 3.5 2.6-1a8 8 0 0 0 1.7 1l.4 2.8h4l.4-2.8a8 8 0 0 0 1.7-1l2.6 1 2-3.5L19.4 13ZM12.8 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z' }
];

const MessageWorkspaceNav = ({ activeTab, onChange, counts = {}, compact = false }) => (
    <nav className={`message-workspace-nav ${compact ? 'is-compact' : ''}`} role="tablist" aria-label="Message categories">
        {MESSAGE_TABS.map((tab) => (
            <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`message-workspace-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => onChange(tab.id)}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.icon} /></svg>
                <span>{tab.label}</span>
                {Number(counts[tab.id] || 0) > 0 && tab.id !== 'compose' ? (
                    <small>{counts[tab.id]}</small>
                ) : null}
            </button>
        ))}
    </nav>
);

export default MessageWorkspaceNav;
