import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/apiUrl';

const MessageSettingToggle = ({ checked, onChange, label, description, disabled }) => (
    <label className="message-setting-row">
        <span><strong>{label}</strong><small>{description}</small></span>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
        <i aria-hidden="true"><b /></i>
    </label>
);

const MessageSettings = ({ mode, companyId }) => {
    const isEmployer = mode === 'employer';
    const [preferences, setPreferences] = useState({ workInSilence: false, messageNotifications: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        const query = isEmployer && companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
        fetch(apiUrl(`/api/messages/preferences/account${query}`), {
            headers: { Authorization: `Bearer ${localStorage.getItem(isEmployer ? 'employerToken' : 'token') || ''}` }
        }).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not load message settings');
            if (active) setPreferences({
                workInSilence: Boolean(data.workInSilence),
                messageNotifications: data.messageNotifications !== false
            });
        }).catch((error) => {
            if (active) setNotice(`Error: ${error.message}`);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [companyId, isEmployer]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => setNotice(''), 2000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const updatePreference = async (key, value) => {
        const next = { ...preferences, [key]: value };
        setPreferences(next);
        try {
            setSaving(true);
            const response = await fetch(apiUrl('/api/messages/preferences/account'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem(isEmployer ? 'employerToken' : 'token') || ''}`
                },
                body: JSON.stringify({ ...next, ...(isEmployer ? { companyId } : {}) })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not save message settings');
            setPreferences({
                workInSilence: Boolean(data.workInSilence),
                messageNotifications: data.messageNotifications !== false
            });
            setNotice('Message settings saved.');
        } catch (error) {
            setPreferences(preferences);
            setNotice(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="message-settings-panel">
            <div className="message-settings-heading">
                <h3>Message settings</h3>
                <p>Choose how your presence and new-message alerts work.</p>
            </div>
            {notice && <div className={`notification-message ${notice.startsWith('Error:') ? 'error' : 'success'}`}>{notice}</div>}
            {loading ? <p className="message-workspace-empty-copy">Loading message settings...</p> : (
                <div className="message-settings-list">
                    <MessageSettingToggle
                        label="Work in silence"
                        description="Hide your last online time and read receipts from other users."
                        checked={preferences.workInSilence}
                        onChange={(value) => updatePreference('workInSilence', value)}
                        disabled={saving}
                    />
                    <MessageSettingToggle
                        label="Notifications"
                        description="Receive notifications when a new message arrives."
                        checked={preferences.messageNotifications}
                        onChange={(value) => updatePreference('messageNotifications', value)}
                        disabled={saving}
                    />
                </div>
            )}
        </section>
    );
};

export default MessageSettings;
